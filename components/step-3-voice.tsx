'use client'

import { useFormContext, type VoiceTurn, type FinalField } from '@/lib/form-context'
import { StepNavigator } from './step-navigator'
import { LoadingSpinner } from './loading-spinner'
import { speak, stopSpeaking } from '@/lib/tts'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, Volume2, VolumeX, SkipForward, MessageCircle } from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

// Voice fields that need to be filled by voice (fields not covered by docs)
const VOICE_FIELDS = [
  {
    id: 'voice-1',
    fieldName: 'Reason for Applying',
    bengaliName: 'আবেদনের কারণ',
    questionEn: 'What is your main reason for applying for this scheme?',
    questionBn: 'আপনি এই প্রকল্পের জন্য আবেদন করার প্রধান কারণ কী?',
  },
  {
    id: 'voice-2',
    fieldName: 'Annual Household Income',
    bengaliName: 'বার্ষিক পারিবারিক আয়',
    questionEn: 'What is your total annual household income in rupees?',
    questionBn: 'আপনার মোট বার্ষিক পারিবারিক আয় কত টাকা?',
  },
  {
    id: 'voice-3',
    fieldName: 'Number of Dependents',
    bengaliName: 'নির্ভরশীল সদস্য সংখ্যা',
    questionEn: 'How many family members are dependent on your income?',
    questionBn: 'আপনার আয়ের উপর নির্ভরশীল পরিবারের সদস্য কতজন?',
  },
]

const MOCK_ANSWERS = [
  { en: 'Financial difficulty due to crop failure this season', bn: 'এই মৌসুমে ফসল নষ্ট হওয়ায় আর্থিক সংকট' },
  { en: '₹72,000 per year approximately', bn: 'বছরে প্রায় ৭২,০০০ টাকা' },
  { en: '4 family members including myself', bn: 'আমি সহ ৪ জন পরিবারের সদস্য' },
]

type UILang = 'bn' | 'en'

export function Step3Voice() {
  const { voiceTranscript, addVoiceTurn, currentVoiceFieldIndex, setCurrentVoiceFieldIndex, updateFinalField, buildFinalFieldMap, setCurrentStep } = useFormContext()
  const [uiLang, setUiLang] = useState<UILang>('bn')
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const guide = useVoiceGuide()

  const currentField = VOICE_FIELDS[currentVoiceFieldIndex]
  const totalFields = VOICE_FIELDS.length

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [voiceTranscript])

  const speakCurrentQuestion = useCallback(async (field = currentField, lang = uiLang) => {
    if (!field) return
    setIsSpeakingQuestion(true)
    const textBn = field.questionBn
    const textEn = field.questionEn
    try {
      // speakText() auto-picks Bengali/Hindi/English based on installed voices
      await speak(textBn, textEn)
    } finally {
      setIsSpeakingQuestion(false)
    }
  }, [currentField, uiLang])

  // On mount: seed first AI question into transcript, speak it, and show entry guide
  useEffect(() => {
    if (voiceTranscript.length === 0 && currentField) {
      const firstQ = uiLang === 'bn' ? currentField.questionBn : currentField.questionEn
      addVoiceTurn({ role: 'ai', text: firstQ, textBn: currentField.questionBn, fieldId: currentField.id, timestamp: Date.now() })
      const timer = setTimeout(() => speakCurrentQuestion(), 600)
      // Show guide bar with entry instruction briefly
      guide.say(AGENT_LINES.step3Enter.bn, AGENT_LINES.step3Enter.en)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsListening(true)
    } catch {
      // Microphone not available — still allow demo interaction
      setIsListening(true)
    }
  }

  const stopListening = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop())
      mediaRecorderRef.current = null
    }
    setIsListening(false)
    await processUserAnswer()
  }

  const processUserAnswer = async () => {
    if (!currentField) return
    setIsProcessing(true)

    // Mock user speech (in production: send audio blob to STT API)
    const mockAnswer = MOCK_ANSWERS[currentVoiceFieldIndex] || { en: 'Understood', bn: 'বোঝা গেছে' }
    const userText = uiLang === 'bn' ? mockAnswer.bn : mockAnswer.en

    // Add user turn to transcript
    addVoiceTurn({ role: 'user', text: userText, fieldId: currentField.id, timestamp: Date.now() })

    try {
      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFieldId: currentField.id,
          currentFieldName: currentField.fieldName,
          userSpeech: userText,
          transcript: voiceTranscript,
        }),
      })
      const data = await res.json()

      // Save extracted value to final field map
      updateFinalField(currentField.id, {
        id: currentField.id,
        fieldName: currentField.fieldName,
        bengaliName: currentField.bengaliName,
        value: data.extractedValue || mockAnswer.en,
        source: 'voice',
      })

      const nextIndex = currentVoiceFieldIndex + 1

      if (nextIndex >= totalFields || !data.nextQuestion) {
        // All fields done
        const doneMsg = uiLang === 'bn'
          ? 'সব প্রশ্নের উত্তর দেওয়া হয়েছে। ধন্যবাদ!'
          : 'All questions answered. Thank you!'
        addVoiceTurn({ role: 'ai', text: doneMsg, timestamp: Date.now() })
        speak(doneMsg, uiLang === 'bn' ? 'bn-IN' : 'en-IN')
        setIsComplete(true)
      } else {
        // Ask next question
        const nextField = VOICE_FIELDS[nextIndex]
        const nextQ = uiLang === 'bn' ? nextField.questionBn : nextField.questionEn
        addVoiceTurn({ role: 'ai', text: nextQ, textBn: nextField.questionBn, fieldId: nextField.id, timestamp: Date.now() })
        setCurrentVoiceFieldIndex(nextIndex)
        setTimeout(() => {
          speak(nextQ, uiLang === 'bn' ? 'bn-IN' : 'en-IN')
        }, 300)
      }
    } catch {
      addVoiceTurn({ role: 'ai', text: 'Error processing. Please try again. · আবার চেষ্টা করুন।', timestamp: Date.now() })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSkip = () => {
    const nextIndex = currentVoiceFieldIndex + 1
    if (nextIndex >= totalFields) {
      setIsComplete(true)
    } else {
      const nextField = VOICE_FIELDS[nextIndex]
      const nextQ = uiLang === 'bn' ? nextField.questionBn : nextField.questionEn
      addVoiceTurn({ role: 'ai', text: nextQ, fieldId: nextField.id, timestamp: Date.now() })
      setCurrentVoiceFieldIndex(nextIndex)
      setTimeout(() => speak(nextQ, uiLang === 'bn' ? 'bn-IN' : 'en-IN'), 300)
    }
  }

  const handleProceedToReview = () => {
    buildFinalFieldMap()
    setCurrentStep(4)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'oklch(0.28 0.085 258)' }}>3</div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 3 · ধাপ ৩</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Voice Fill <span className="text-muted-foreground font-normal text-xl">· ভয়েস ফিল</span>
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Answer the remaining questions by speaking · বলে বলে বাকি প্রশ্নের উত্তর দিন
            </p>
          </div>

          {/* Language toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border shrink-0">
            {(['bn', 'en'] as UILang[]).map((l) => (
              <button
                key={l}
                onClick={() => setUiLang(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  uiLang === l ? 'text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={uiLang === l ? { background: 'oklch(0.28 0.085 258)' } : {}}
              >
                {l === 'bn' ? 'বাংলা' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {VOICE_FIELDS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-8 rounded-full transition-all duration-500"
              style={{
                background: i < currentVoiceFieldIndex
                  ? 'oklch(0.55 0.15 155)' // done = green
                  : i === currentVoiceFieldIndex
                  ? 'oklch(0.28 0.085 258)' // active = navy
                  : 'oklch(0.88 0.01 240)', // pending = gray
              }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {isComplete ? `${totalFields}/${totalFields}` : `${currentVoiceFieldIndex + 1}/${totalFields}`} remaining · বাকি
        </span>
      </div>

      {/* Current question card */}
      {!isComplete && currentField && (
        <div
          className="rounded-2xl p-5 sm:p-6 mb-6 animate-fade-in"
          style={{ background: 'linear-gradient(135deg, oklch(0.22 0.09 258) 0%, oklch(0.30 0.085 258) 100%)' }}
        >
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
            {uiLang === 'bn' ? currentField.bengaliName : currentField.fieldName}
          </p>
          <p className="text-white font-semibold text-lg sm:text-xl leading-snug mb-4">
            {uiLang === 'bn' ? currentField.questionBn : currentField.questionEn}
          </p>
          <button
            onClick={isSpeakingQuestion ? () => { stopSpeaking(); setIsSpeakingQuestion(false) } : () => speakCurrentQuestion()}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isSpeakingQuestion
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            {isSpeakingQuestion ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isSpeakingQuestion
              ? (uiLang === 'bn' ? 'থামুন · Stop' : 'Stop reading')
              : (uiLang === 'bn' ? 'পড়ুন · Read aloud' : 'Read aloud')}
          </button>
        </div>
      )}

      {/* Done state */}
      {isComplete && (
        <div className="rounded-2xl p-6 mb-6 bg-emerald-50 border border-emerald-200 animate-scale-in text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✅</span>
          </div>
          <p className="font-bold text-emerald-800 text-lg">
            {uiLang === 'bn' ? 'সব উত্তর দেওয়া হয়েছে!' : 'All questions answered!'}
          </p>
          <p className="text-emerald-700 text-sm mt-1">
            {uiLang === 'bn' ? 'পর্যালোচনার জন্য প্রস্তুত' : 'Ready for review'}
          </p>
        </div>
      )}

      {/* Large mic button */}
      {!isComplete && (
        <div className="flex flex-col items-center gap-5 mb-8">
          {isProcessing ? (
            <LoadingSpinner message="Processing answer..." bengaliMessage="উত্তর প্রক্রিয়া করা হচ্ছে..." size="sm" />
          ) : (
            <>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isProcessing}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                  isListening ? 'animate-pulse-ring-red' : 'animate-pulse-ring'
                }`}
                style={{
                  background: isListening
                    ? 'linear-gradient(135deg, oklch(0.577 0.245 27.325) 0%, oklch(0.65 0.22 15) 100%)'
                    : 'linear-gradient(135deg, oklch(0.28 0.085 258) 0%, oklch(0.38 0.09 258) 100%)',
                }}
              >
                {isListening ? (
                  <MicOff className="w-9 h-9 text-white" />
                ) : (
                  <Mic className="w-9 h-9 text-white" />
                )}
              </button>

              {/* Waveform animation while listening */}
              {isListening ? (
                <div className="flex items-center gap-1.5 h-10">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="waveform-bar" style={{ height: '8px' }} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-medium">
                  {uiLang === 'bn'
                    ? 'মাইকে ট্যাপ করুন ও বলুন'
                    : 'Tap the mic and speak your answer'}
                </p>
              )}

              {/* Skip */}
              <button
                onClick={handleSkip}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5" />
                {uiLang === 'bn' ? 'এড়িয়ে যান · Skip' : 'Skip this question'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Conversation transcript */}
      {voiceTranscript.length > 0 && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Conversation · কথোপকথন
            </span>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto space-y-3">
            {voiceTranscript.map((turn, i) => (
              <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    turn.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  }`}
                  style={turn.role === 'user' ? { background: 'oklch(0.28 0.085 258)' } : {}}
                >
                  {turn.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>
      )}

      <StepNavigator
        nextDisabled={!isComplete}
        nextLabel={uiLang === 'bn' ? 'পর্যালোচনায় যান · Review' : 'Go to Review'}
        onNext={handleProceedToReview}
      />

      <VoiceGuideBar
        text={guide.currentText}
        textEn={guide.currentTextEn}
        isSpeaking={guide.isSpeaking}
        onMute={guide.setMuted}
        onDismiss={guide.silence}
      />
    </div>
  )
}

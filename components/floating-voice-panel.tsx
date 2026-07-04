'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, X, ChevronDown, ChevronUp, Volume2, MessageSquare } from 'lucide-react'
import { useFormContext } from '@/lib/form-context'

interface Message {
  role: 'ai' | 'user'
  text: string
  fieldId?: string
}

/**
 * FloatingVoicePanel
 * A collapsible floating voice assistant panel fixed to the bottom-right corner.
 * On mobile it becomes a bottom drawer.
 * Guides the user through unfilled form fields via voice Q&A.
 */
export function FloatingVoicePanel() {
  const { extractedFields, updateExtractedField } = useFormContext()
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const recognitionRef = useRef<any>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Unfilled fields that still need voice input
  const pendingFields = extractedFields.filter(
    (f) => !f.currentValue || f.currentValue.trim() === ''
  )
  const currentField = pendingFields[currentFieldIdx]
  const isComplete = currentFieldIdx >= pendingFields.length || pendingFields.length === 0

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Speak using TTS when a new AI message arrives
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'bn-BD'
      utt.rate = 0.9
      window.speechSynthesis.speak(utt)
    }
  }, [])

  // Start voice session
  const startSession = useCallback(() => {
    if (pendingFields.length === 0) {
      setMessages([{ role: 'ai', text: 'সব ঘর পূরণ হয়ে গেছে! পরের ধাপে যান।' }])
      return
    }
    const field = pendingFields[0]
    const greeting = `আমি আপনাকে ফর্ম পূরণে সাহায্য করব। প্রথম প্রশ্ন: ${field.bengaliName || field.fieldName} কী?`
    setMessages([{ role: 'ai', text: greeting, fieldId: field.id }])
    speak(greeting)
    setHasStarted(true)
    setCurrentFieldIdx(0)
  }, [pendingFields, speak])

  // Start listening
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setMessages((m) => [...m, { role: 'ai', text: 'আপনার ব্রাউজার voice recognition সাপোর্ট করে না। Chrome ব্যবহার করুন।' }])
      return
    }

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'bn-IN'
    recognitionRef.current = rec

    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setTranscript(t)
    }

    rec.onend = () => {
      setListening(false)
      if (transcript.trim()) {
        handleUserAnswer(transcript.trim())
      }
    }

    rec.onerror = () => setListening(false)

    rec.start()
    setListening(true)
    setTranscript('')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // Process user's spoken answer
  const handleUserAnswer = async (answer: string) => {
    if (!currentField) return
    setMessages((m) => [...m, { role: 'user', text: answer }])
    setProcessing(true)

    try {
      const remainingFields = pendingFields.slice(currentFieldIdx).map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        bengaliName: f.bengaliName || f.fieldName,
        questionEn: `What is your ${f.fieldName}?`,
        questionBn: `আপনার ${f.bengaliName || f.fieldName} কী?`,
      }))

      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFieldId: currentField.id,
          currentFieldName: currentField.fieldName,
          currentFieldBengali: currentField.bengaliName || currentField.fieldName,
          fieldType: currentField.fieldType || 'text',
          userSpeech: answer,
          transcript: messages,
          remainingFields,
        }),
      })

      const data = await res.json()
      const extracted = data.extractedValue || answer

      // Update the field value in form context
      updateExtractedField(currentField.id, extracted)

      const nextIdx = currentFieldIdx + 1
      setCurrentFieldIdx(nextIdx)
      const nextField = pendingFields[nextIdx]

      const response = nextField
        ? `বোঝা গেছে: "${extracted}"\n\nপরের প্রশ্ন: ${nextField.bengaliName || nextField.fieldName} কী?`
        : `দারুণ! সব উত্তর নেওয়া হয়েছে। এখন Review-এ যান।`

      setMessages((m) => [...m, { role: 'ai', text: response, fieldId: nextField?.id }])
      speak(response)
    } catch {
      const errMsg = 'উত্তর বুঝতে সমস্যা হয়েছে। আবার বলুন।'
      setMessages((m) => [...m, { role: 'ai', text: errMsg }])
      speak(errMsg)
    } finally {
      setProcessing(false)
      setTranscript('')
    }
  }

  // Don't show if no form is loaded
  if (extractedFields.length === 0) return null

  const unfilledCount = pendingFields.length

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); if (!hasStarted) startSession() }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-3 pr-4 py-3 rounded-full shadow-lg text-white font-semibold text-sm transition-all hover:scale-105 active:scale-95"
          style={{ background: 'oklch(0.28 0.085 258)' }}
        >
          <Mic className="w-5 h-5" />
          <span>Voice Fill</span>
          {unfilledCount > 0 && (
            <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">{unfilledCount}</span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-96 sm:bottom-6 sm:right-6 sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white flex flex-col"
          style={{ maxHeight: '70vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white"
            style={{ background: 'oklch(0.28 0.085 258)' }}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold text-sm">Voice Assistant</span>
              {unfilledCount > 0 && (
                <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">{unfilledCount} remaining</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => { setOpen(false); stopListening() }} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current field indicator */}
          {currentField && !isComplete && (
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Current question</p>
              <p className="text-sm font-semibold text-gray-800">{currentField.bengaliName || currentField.fieldName}</p>
            </div>
          )}

          {/* Chat messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50" style={{ minHeight: 180 }}>
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Mic className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">ভয়েস সাহায্যকারী শুরু হবে...</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                }`}
                  style={msg.role === 'user' ? { background: 'oklch(0.28 0.085 258)' } : {}}>
                  {msg.text}
                </div>
              </div>
            ))}
            {processing && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live transcript */}
          {listening && transcript && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-500 font-medium">শুনছি...</p>
              <p className="text-sm text-gray-700 italic">{transcript}</p>
            </div>
          )}

          {/* Controls */}
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center gap-3">
            {isComplete ? (
              <div className="flex-1 text-center text-sm text-green-600 font-semibold">
                ✓ সব ঘর পূরণ হয়েছে — পরের ধাপে যান
              </div>
            ) : (
              <>
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={processing}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                    listening ? 'bg-red-500 text-white animate-pulse' : 'text-white'
                  }`}
                  style={!listening ? { background: 'oklch(0.28 0.085 258)' } : {}}
                >
                  {listening ? <><MicOff className="w-4 h-4" /> থামুন</> : <><Mic className="w-4 h-4" /> বলুন</>}
                </button>
                <button
                  onClick={() => {
                    const nextIdx = currentFieldIdx + 1
                    setCurrentFieldIdx(nextIdx)
                    const nextField = pendingFields[nextIdx]
                    if (nextField) {
                      const msg = `পরের প্রশ্ন: ${nextField.bengaliName || nextField.fieldName} কী?`
                      setMessages((m) => [...m, { role: 'ai', text: msg }])
                      speak(msg)
                    }
                  }}
                  disabled={processing || isComplete}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

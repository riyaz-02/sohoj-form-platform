'use client'

import { useFormContext } from '@/lib/form-context'
import { Upload, Trash2, Camera, ImageIcon, AlertCircle } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { LoadingSpinner } from './loading-spinner'
import { StepNavigator } from './step-navigator'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

export function Step1Upload() {
  const { formImages, formId, addFormImage, removeFormImage, clearFormImages, isAnalyzing, setIsAnalyzing, setCurrentStep, setExtractedFields, setRequiredDocuments, setFormTitle } = useFormContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState('')
  const [isQuotaError, setIsQuotaError] = useState(false)
  const guide = useVoiceGuide()

  // Speak entry instruction on mount
  useEffect(() => {
    const t = setTimeout(() => guide.say(AGENT_LINES.step1Enter.bn, AGENT_LINES.step1Enter.en), 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file · শুধুমাত্র ছবি ফাইল নির্বাচন করুন')
      return
    }
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      addFormImage({ id: `img-${Date.now()}`, file, thumbnail: e.target?.result as string, timestamp: Date.now() })
      guide.say(AGENT_LINES.step1ImageAdded.bn, AGENT_LINES.step1ImageAdded.en)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleFileSelect(files[0])
  }

  const handleAnalyzeForm = async () => {
    if (formImages.length === 0) {
      setError('Please upload at least one image · অন্তত একটি ছবি আপলোড করুন')
      guide.say(AGENT_LINES.step1NoImage.bn, AGENT_LINES.step1NoImage.en)
      return
    }
    setIsAnalyzing(true); setError(''); setIsQuotaError(false)
    try {
      const images = formImages.map((img) => img.thumbnail)
      const res = await fetch('/api/analyze-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, imageCount: formImages.length, formType: formId }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze form')
      }

      const isDemo = !!data.demo
      console.log('[analyze-form] detected', data.fieldCount, 'fields,', data.requiredDocuments?.length, 'required docs', isDemo ? '(DEMO)' : '(AI)')

      // Save AI / demo results to global state
      if (Array.isArray(data.fields) && data.fields.length > 0) {
        setExtractedFields(data.fields)
      }
      if (Array.isArray(data.requiredDocuments)) {
        setRequiredDocuments(data.requiredDocuments)
      }
      if (data.formTitle) {
        setFormTitle(data.formTitle)
      }

      if (isDemo) {
        guide.say('ডেমো মোডে চলছে।', 'Running in demo mode.')
        setTimeout(() => setCurrentStep(2), 1400)
      } else {
        // ── Smart voice announcement ──────────────────────────────────────
        // Build: "আপলোড করা ফর্মটি হলো [title]. এই ফর্মটি পূরণ করতে [docs] প্রয়োজন।"
        const detectedTitle = data.formTitle || 'একটি সরকারি ফর্ম'
        const reqDocs: Array<{ bengaliName: string; englishName: string }> = data.requiredDocuments || []

        let docPhrase = ''
        if (reqDocs.length === 1) {
          docPhrase = reqDocs[0].bengaliName
        } else if (reqDocs.length === 2) {
          docPhrase = `${reqDocs[0].bengaliName} এবং ${reqDocs[1].bengaliName}`
        } else if (reqDocs.length >= 3) {
          const last = reqDocs[reqDocs.length - 1].bengaliName
          const rest = reqDocs.slice(0, -1).map((d) => d.bengaliName).join(', ')
          docPhrase = `${rest} এবং ${last}`
        }

        const narration = docPhrase
          ? `আপলোড করা ফর্মটি হলো ${detectedTitle}। এই ফর্মটি পূরণ করতে আপনার ${docPhrase} প্রয়োজন।`
          : `আপলোড করা ফর্মটি হলো ${detectedTitle}।`

        // Speak via Google TTS (natural voice) — non-blocking
        speakBengali(narration)

        // Navigate to step 2 after giving enough time to hear the announcement
        // Estimated: ~5s for a 2-doc narration sentence
        const delay = 1000 + narration.length * 60 // ~60ms per character
        setTimeout(() => setCurrentStep(2), Math.min(delay, 6000))
      }
    } catch (err: any) {
      const quota = err.message?.includes('ব্যস্ত') || err.message?.includes('busy') || err.message?.includes('quota') || err.message?.includes('429')
      setIsQuotaError(quota)
      setError(err.message || 'ফর্ম পড়তে সমস্যা হয়েছে। পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।')
      if (quota) {
        guide.say('২০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। AI এখন ব্যস্ত।', 'Please wait 20 seconds and try again. AI is busy.')
      } else {
        guide.say('ফর্ম পড়তে সমস্যা হয়েছে। পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।', 'Could not read the form. Please take a clearer photo.')
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (isAnalyzing) {
    return <AnalyzingScreen />
  }


  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
      {/* Page header */}
      <div className="mb-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'oklch(0.28 0.085 258)' }}>1</div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 · ধাপ ১</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          ফর্মের ছবি তুলুন <span className="text-muted-foreground font-normal text-lg">· Upload Form</span>
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          যেকোনো সরকারি ফর্মের ছবি তুলুন — AI নিজেই চিনবে এবং কোন কোন নথি লাগবে জানিয়ে দেবে
        </p>
      </div>

      <div className="space-y-5 animate-fade-in delay-100">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 sm:p-16 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.01]'
              : 'border-border hover:border-primary/50 hover:bg-muted/30 animate-border-dance'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => { e.target.files && Array.from(e.target.files).forEach(handleFileSelect) }}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'oklch(0.28 0.085 258 / 0.1)' }}
            >
              {isDragging ? (
                <Upload className="w-8 h-8 animate-bounce" style={{ color: 'oklch(0.28 0.085 258)' }} />
              ) : (
                <Camera className="w-8 h-8" style={{ color: 'oklch(0.28 0.085 258)' }} />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Tap to take photo or upload · ছবি তুলুন বা আপলোড করুন
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, HEIC · Multiple pages supported · একাধিক পাতা সমর্থিত
              </p>
            </div>
          </div>
        </div>

        {/* Error / Quota notice */}
        {error && (
          isQuotaError ? (
            // Special amber card for rate limit
            <div className="flex items-start gap-3 p-4 rounded-xl border animate-scale-in"
              style={{ background: 'oklch(0.98 0.04 85)', borderColor: 'oklch(0.85 0.1 85)' }}>
              <span className="text-xl shrink-0">⏳</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'oklch(0.45 0.12 60)' }}>
                  AI এখন ব্যস্ত
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.1 65)' }}>
                  ৩০ সেকেন্ড অপেক্ষা করে "ফর্ম বিশ্লেষণ করুন" বাটনে আবার চাপুন।
                </p>
                <p className="text-[10px] mt-1 text-muted-foreground">
                  AI is busy — wait 30 seconds then retry.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 p-4 bg-destructive/8 border border-destructive/25 rounded-xl animate-scale-in">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )
        )}

        {/* Image grid */}
        {formImages.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">
                Uploaded · আপলোড হয়েছে ({formImages.length})
              </h3>
              <button
                onClick={clearFormImages}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear all · সব মুছুন
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {formImages.map((image, idx) => (
                <div key={image.id} className="relative group rounded-xl overflow-hidden border border-border aspect-[3/4] bg-muted">
                  <img src={image.thumbnail} alt={`Form page ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <button
                      onClick={() => removeFormImage(image.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-destructive text-white rounded-full shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md font-medium">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyze button */}
        {formImages.length > 0 && (
          <button
            onClick={handleAnalyzeForm}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold text-white transition-all active:scale-95 shadow-md hover:shadow-lg animate-fade-in"
            style={{ background: 'linear-gradient(135deg, oklch(0.28 0.085 258) 0%, oklch(0.38 0.09 258) 100%)' }}
          >
            <ImageIcon className="w-5 h-5" />
            Analyze Form · ফর্ম বিশ্লেষণ করুন
          </button>
        )}
      </div>

      <StepNavigator nextDisabled={formImages.length === 0} />

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

// ── Animated analyzing screen ─────────────────────────────────────────────────

const STAGES = [
  { en: 'Scanning image', bn: 'ছবি স্ক্যান করছি', duration: 15 },
  { en: 'Gemma AI reading form', bn: 'Gemma AI ফর্ম পড়ছে', duration: 50 },
  { en: 'Detecting all fields', bn: 'সব ঘর চিহ্নিত করছি', duration: 20 },
  { en: 'Translating to Bengali', bn: 'বাংলায় অনুবাদ করছি', duration: 15 },
]

const TIPS = [
  { en: 'Gemma 3 4B runs entirely on your device — your data never leaves.', bn: 'Gemma AI আপনার ডিভাইসেই চলছে — আপনার তথ্য কোথাও যাচ্ছে না।' },
  { en: 'Make sure the form image is well-lit for better accuracy.', bn: 'ভালো আলোয় তোলা ছবি থেকে আরও নির্ভুল তথ্য পাওয়া যায়।' },
  { en: 'AI will detect fields and translate them to Bengali automatically.', bn: 'AI ইংরেজি ঘর বাংলায় অনুবাদ করে দেবে।' },
  { en: 'Next, you\'ll upload Aadhaar or PAN to auto-fill many fields.', bn: 'পরে আধার বা PAN দিয়ে অনেক ঘর এক ক্লিকে পূরণ হবে।' },
  { en: 'Sohoj Form supports Krishak Bandhu, Ayushman Bharat, and more.', bn: 'কৃষক বন্ধু, আয়ুষ্মান ভারত সহ বহু ফর্ম সহজ করা যায়।' },
]

// ── Google TTS helper ───────────────────────────────────────────────
async function speakBengali(text: string) {
  try {
    const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}&lang=bn`)
    if (!res.ok) throw new Error('tts fail')
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.play().catch(() => {})
  } catch {
    // silent fail — no browser fallback (robotic)
  }
}

// ── Narration lines per stage ────────────────────────────────────────
const NARRATION = [
  'ছবিটি স্ক্যান করা হচ্ছে। একটু অপেক্ষা করুন।',
  'Gemma AI ফর্মটি পড়ছে এবং তথ্য সংগ্রহ করছে।',
  'ফর্মের সব ঘর চিহ্নিত করা হচ্ছে।',
  'সব তথ্য বাংলায় অনুবাদ করা হচ্ছে।',
]

function AnalyzingScreen() {
  const [stageIdx, setStageIdx]   = useState(0)
  const [prevStage, setPrevStage] = useState(-1)
  const [tipIdx, setTipIdx]       = useState(0)
  const [progress, setProgress]   = useState(0)
  const [elapsed, setElapsed]     = useState(0)

  // Elapsed counter
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Progress animation
  useEffect(() => {
    const iv = setInterval(() => {
      setProgress((p) => p >= 90 ? p + 0.015 : Math.min(p + (90 - p) * 0.025, 98))
    }, 500)
    return () => clearInterval(iv)
  }, [])

  // Advance stage based on progress
  useEffect(() => {
    const idx = progress < 15 ? 0 : progress < 65 ? 1 : progress < 85 ? 2 : 3
    setStageIdx(idx)
  }, [progress])

  // Speak when stage changes (Google TTS — natural voice)
  useEffect(() => {
    if (stageIdx !== prevStage) {
      setPrevStage(stageIdx)
      speakBengali(NARRATION[stageIdx])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIdx])

  // Rotate tips
  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000)
    return () => clearInterval(t)
  }, [])

  const mins    = Math.floor(elapsed / 60)
  const secs    = elapsed % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-6 max-w-md mx-auto">

      {/* ── Central AI Core with expanding rings ── */}
      <div className="relative flex items-center justify-center mb-6 float-anim">
        {/* Expanding rings */}
        <div className="absolute w-24 h-24 rounded-full ring-1"
             style={{ background: '#1B2E6B15' }} />
        <div className="absolute w-24 h-24 rounded-full ring-2"
             style={{ background: '#2EC4A715' }} />
        <div className="absolute w-24 h-24 rounded-full ring-3"
             style={{ background: '#1B2E6B10' }} />

        {/* Core circle */}
        <div className="relative w-20 h-20">
          {/* Background fill */}
          <div className="absolute inset-0 rounded-full"
               style={{ background: 'linear-gradient(135deg, #1B2E6B, #2A4A9F)' }} />
          {/* Animated dots — no letter labels */}
          <div className="absolute inset-0 flex items-center justify-center gap-1">
            {[0, 1, 2].map((d) => (
              <div
                key={d}
                className="w-1.5 h-1.5 rounded-full bg-white"
                style={{ animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite` }}
              />
            ))}
          </div>
          {/* Spinning progress arc */}
          <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <circle
              cx="40" cy="40" r="38" fill="none"
              stroke="#2EC4A7" strokeWidth="2.5"
              strokeDasharray="239"
              strokeDashoffset={239 - (239 * progress / 100)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
        </div>
      </div>

      {/* Stage name — single element, no key trick, no ghost text */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-900">{STAGES[stageIdx].en}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{STAGES[stageIdx].bn}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full mb-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #1B2E6B, #2EC4A7)' }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[11px] text-gray-400">
          <span>{Math.round(progress)}% সম্পন্ন</span>
          <span>{timeStr} অতিবাহিত</span>
        </div>
      </div>

      {/* Stage steps row — dots only, no letter labels */}
      <div className="flex items-start w-full mt-4 mb-5">
        {STAGES.map((s, i) => (
          <div key={`stage-dot-${i}`} className="flex flex-col items-center flex-1">
            {/* Connector + dot row */}
            <div className="flex items-center w-full">
              {i > 0 && (
                <div className="flex-1 h-px mx-1" style={{ background: i <= stageIdx ? '#2EC4A7' : '#E5E7EB' }} />
              )}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 shrink-0"
                style={{
                  background: i < stageIdx ? '#2EC4A7' : i === stageIdx ? '#1B2E6B' : '#E5E7EB',
                  boxShadow: i === stageIdx ? '0 0 0 3px #1B2E6B18' : 'none',
                }}
              >
                {i < stageIdx
                  ? <span className="text-white text-[10px]">✓</span>
                  : i === stageIdx
                    ? <span className="text-white text-[9px]">●</span>
                    : <span className="text-gray-400 text-[9px]">○</span>}
              </div>
              {i < STAGES.length - 1 && (
                <div className="flex-1 h-px mx-1" style={{ background: i < stageIdx ? '#2EC4A7' : '#E5E7EB' }} />
              )}
            </div>
            {/* Label */}
            <span
              className="text-[9px] mt-1 text-center font-medium px-0.5 leading-tight"
              style={{ color: i === stageIdx ? '#1B2E6B' : i < stageIdx ? '#2EC4A7' : '#94A3B8' }}
            >
              {s.bn}
            </span>
          </div>
        ))}
      </div>

      {/* Rotating tip card — unique key avoids collision with stage keys */}
      <div key={`tip-${tipIdx}`} className="w-full rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50 px-4 py-3">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">তথ্য</p>
        <p className="text-sm font-medium text-gray-800 leading-relaxed">{TIPS[tipIdx].bn}</p>
      </div>

      <p className="text-[10px] text-gray-400 mt-3 text-center">
        Gemma 3 4B · CPU inference · ১–২ মিনিট সময় লাগতে পারে
      </p>
    </div>
  )
}


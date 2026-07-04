'use client'

import { useFormContext } from '@/lib/form-context'
import { Upload, Trash2, Camera, ImageIcon, AlertCircle } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { LoadingSpinner } from './loading-spinner'
import { StepNavigator } from './step-navigator'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

export function Step1Upload() {
  const { formImages, addFormImage, removeFormImage, clearFormImages, isAnalyzing, setIsAnalyzing, setCurrentStep, setExtractedFields, setRequiredDocuments, setFormTitle } = useFormContext()
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
        body: JSON.stringify({ images, imageCount: formImages.length }),
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
        // Speak demo mode notice in Bengali
        guide.say('ডেমো মোডে চলছে। AI দিয়ে পড়তে বাস্তব নথি আপলোড করুন।', 'Running in demo mode. Upload real documents to use AI extraction.')
      } else {
        guide.say(AGENT_LINES.step1Done.bn, AGENT_LINES.step1Done.en)
      }
      setTimeout(() => setCurrentStep(2), 1400)
    } catch (err: any) {
      const quota = err.message?.includes('ব্যস্ত') || err.message?.includes('busy') || err.message?.includes('quota') || err.message?.includes('429')
      setIsQuotaError(quota)
      setError(err.message || 'ফর্ম পড়তে সমস্যা হয়েছে। পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।')
      if (quota) {
        guide.say('২০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন। AI এখন ব্যস্ত।', 'Please wait 20 seconds and try again. AI is busy.')
      } else {
        guide.say('ফর্ম পড়তে সমস্যা হয়েছে। পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।', 'Could not read the form. Please take a clearer photo.')
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
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Upload Form <span className="text-muted-foreground font-normal text-xl">· ফর্ম আপলোড করুন</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Take a clear photo of your government form · আপনার সরকারি ফর্মের স্পষ্ট ছবি তুলুন
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
  { label: 'S', en: 'Scanning image', bn: 'ছবি স্ক্যান করছি', duration: 15 },
  { label: 'AI', en: 'Gemma AI reading form', bn: 'Gemma AI ফর্ম পড়ছে', duration: 50 },
  { label: 'F', en: 'Detecting all fields', bn: 'সব ঘর চিহ্নিত করছি', duration: 20 },
  { label: 'B', en: 'Translating to Bengali', bn: 'বাংলায় অনুবাদ করছি', duration: 15 },
]

const TIPS = [
  { en: 'Gemma 3 4B runs entirely on your device — your data never leaves.', bn: 'Gemma AI আপনার ডিভাইসেই চলছে — আপনার তথ্য কোথাও যাচ্ছে না।' },
  { en: 'Make sure the form image is well-lit for better accuracy.', bn: 'ভালো আলোয় তোলা ছবি থেকে আরও নির্ভুল তথ্য পাওয়া যায়।' },
  { en: 'AI will detect fields and translate them to Bengali automatically.', bn: 'AI ইংরেজি ঘর বাংলায় অনুবাদ করে দেবে।' },
  { en: 'Next, you\'ll upload Aadhaar or PAN to auto-fill many fields.', bn: 'পরে আধার বা PAN দিয়ে অনেক ঘর এক ক্লিকে পূরণ হবে।' },
  { en: 'Sohoj Form supports Krishak Bandhu, Ayushman Bharat, and more.', bn: 'কৃষক বন্ধু, আয়ুষ্মান ভারত সহ বহু ফর্ম সহজ করা যায়।' },
]

function AnalyzingScreen() {
  const [stageIdx, setStageIdx] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    // Elapsed seconds counter
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    // Smooth progress animation (target ~90% over 90 seconds, never reaches 100)
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p + 0.02
        return Math.min(p + (90 - p) * 0.025, 98)
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Advance stages based on progress
    const idx = progress < 15 ? 0 : progress < 65 ? 1 : progress < 85 ? 2 : 3
    setStageIdx(idx)
  }, [progress])

  useEffect(() => {
    // Rotate tips every 6 seconds
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000)
    return () => clearInterval(t)
  }, [])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto">
      {/* Central animated indicator */}
      <div className="relative mb-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.28 0.085 258 / 0.08)', border: '2px solid oklch(0.28 0.085 258 / 0.15)' }}>
          <span className="text-sm font-bold text-gray-600 animate-pulse">{STAGES[stageIdx].label}</span>
        </div>
        {/* Spinning ring */}
        <svg className="absolute inset-0 w-20 h-20 -rotate-90 animate-spin" style={{ animationDuration: '2s' }} viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="37" fill="none" stroke="oklch(0.28 0.085 258 / 0.1)" strokeWidth="3" />
          <circle cx="40" cy="40" r="37" fill="none" stroke="oklch(0.28 0.085 258)" strokeWidth="3"
            strokeDasharray="232" strokeDashoffset="184" strokeLinecap="round" />
        </svg>
      </div>

      {/* Stage label */}
      <h2 className="text-xl font-bold text-gray-900 text-center mb-1">{STAGES[stageIdx].en}</h2>
      <p className="text-base text-gray-500 text-center mb-6">{STAGES[stageIdx].bn}</p>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, oklch(0.28 0.085 258), oklch(0.55 0.15 230))' }}
        />
      </div>
      <div className="flex justify-between w-full text-xs text-gray-400 mb-8">
        <span>{Math.round(progress)}% complete</span>
        <span>{timeStr} elapsed</span>
      </div>

      {/* Stage dots */}
      <div className="flex items-center gap-3 mb-6">
        {STAGES.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
              i < stageIdx ? 'bg-green-100 text-green-600' :
              i === stageIdx ? 'text-white shadow-md scale-110' : 'bg-gray-100 text-gray-400'
            }`} style={i === stageIdx ? { background: 'oklch(0.28 0.085 258)' } : {}}>
              {i < stageIdx ? '✓' : s.label}
            </div>
            <span className={`text-[9px] font-medium ${i === stageIdx ? 'text-gray-700' : 'text-gray-400'}`}>{s.bn}</span>
          </div>
        ))}
      </div>

      {/* Rotating tip */}
      <div className="w-full rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wide mb-1">Did you know?</p>
        <p className="text-sm font-medium text-gray-700 leading-relaxed">{TIPS[tipIdx].en}</p>
        <p className="text-xs text-gray-500 mt-0.5">{TIPS[tipIdx].bn}</p>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        Running Gemma 3 4B locally · CPU inference takes 1–2 minutes
      </p>
    </div>
  )
}

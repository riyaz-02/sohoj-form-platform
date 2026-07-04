'use client'

import { useFormContext } from '@/lib/form-context'
import { speak } from '@/lib/tts'
import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle2, RotateCcw, Download, Eye, X,
  Volume2, FileText, ChevronLeft, ChevronRight,
  Sparkles,
} from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

interface WalkthroughStep {
  fieldId: string
  fieldName: string
  bengaliName: string
  value: string
  captionEn: string
  captionBn: string
  bbox: { x: number; y: number; width: number; height: number; pagePercent: boolean }
}

export function Step5Done() {
  const { finalFieldMap, documents, formImages, extractedFields, resetForm } = useFormContext()
  const [showView, setShowView] = useState(false)
  const [walkthrough, setWalkthrough] = useState<WalkthroughStep[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const guide = useVoiceGuide()

  // ── Build value lookup from all sources ─────────────────────────────────
  // Values come from: documents.extractedData → finalFieldMap (overrides)
  const valueById: Record<string, string> = {}
  const valueByName: Record<string, string> = {}
  const sourceById: Record<string, 'document' | 'voice'> = {}

  documents.forEach((doc) => {
    doc.extractedData.forEach((f) => {
      if (f.value?.trim()) {
        valueById[f.id] = f.value
        valueByName[f.fieldName.toLowerCase()] = f.value
        sourceById[f.id] = 'document'
        sourceById[f.fieldName.toLowerCase()] = 'document'
      }
    })
  })

  Object.values(finalFieldMap).forEach((f) => {
    if (f.value?.trim()) {
      valueById[f.id] = f.value
      valueByName[f.fieldName.toLowerCase()] = f.value
      sourceById[f.id] = f.source
      sourceById[f.fieldName.toLowerCase()] = f.source
    }
  })

  // ── allFields = ONLY the form's actual blank fields (from Step 1 analysis) ──
  // This prevents document-internal fields (MICR, PAN no, IFSC) from appearing
  // in the walkthrough as fields to physically write on the form.
  const allFields = extractedFields
    .map((f) => {
      const value =
        valueById[f.id] ??
        valueByName[f.fieldName.toLowerCase()] ??
        f.currentValue ?? ''
      const src: 'document' | 'voice' =
        sourceById[f.id] ?? sourceById[f.fieldName.toLowerCase()] ?? 'voice'
      return {
        id: f.id,
        fieldName: f.fieldName,
        bengaliName: f.bengaliName || f.fieldName,
        value,
        source: src,
      }
    })
    .filter((f) => f.value && f.value.trim() !== '')

  const totalFields = allFields.length
  const formImage = formImages[0]?.thumbnail || null

  // Speak success on mount
  useEffect(() => {
    const t = setTimeout(() => guide.say(AGENT_LINES.step5Enter.bn, AGENT_LINES.step5Enter.en), 800)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generate walkthrough from real data
  const generateWalkthrough = async () => {
    setIsGenerating(true)
    try {
      // Build a fieldName → yPercent lookup from Step 1 extracted fields
      // (extractedFields have the AI-estimated vertical positions on the form image)
      const yPercentByName: Record<string, number> = {}
      const yPercentById: Record<string, number> = {}
      extractedFields.forEach((f) => {
        if (typeof f.yPercent === 'number') {
          yPercentByName[f.fieldName.toLowerCase()] = f.yPercent
          yPercentById[f.id] = f.yPercent
        }
      })

      const fieldMapForApi: Record<string, any> = {}
      allFields.forEach((f) => {
        // Try to find matching yPercent by field name or ID
        const yPercent =
          yPercentById[f.id] ??
          yPercentByName[f.fieldName.toLowerCase()] ??
          undefined
        fieldMapForApi[f.id] = {
          value: f.value,
          fieldName: f.fieldName,
          bengaliName: f.bengaliName,
          source: f.source,
          ...(yPercent !== undefined ? { yPercent } : {}),
        }
      })
      const res = await fetch('/api/generate-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalFieldMap: fieldMapForApi }),
      })
      const data = await res.json()
      if (data.walkthrough) setWalkthrough(data.walkthrough)
    } catch {
      // Fallback: build walkthrough directly from allFields without API
      const steps: WalkthroughStep[] = allFields.map((f, i) => {
        const totalF = allFields.length
        const yPos = totalF > 1 ? 10 + (i / (totalF - 1)) * 75 : 45
        return {
          fieldId: f.id,
          fieldName: f.fieldName,
          bengaliName: f.bengaliName,
          value: f.value,
          captionEn: `Write your ${f.fieldName}: ${f.value}`,
          captionBn: `${f.bengaliName} লিখুন: ${f.value}`,
          bbox: { x: 8, y: yPos, width: 55, height: 5, pagePercent: true },
        }
      })
      setWalkthrough(steps)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleViewForm = async () => {
    if (walkthrough.length === 0) await generateWalkthrough()
    setShowView(true)
  }

  const handleSpeak = async (id: string, bn: string, value: string) => {
    setSpeakingId(id)
    try {
      await speak(`${bn}: ${value}`)
    } finally {
      setSpeakingId(null)
    }
  }

  const handleDownload = () => {
    guide.say('ফর্ম ডাউনলোড হচ্ছে।', 'Downloading.')
    const lines = [
      'SOHOJ FORM — সহজ ফর্ম',
      '='.repeat(50),
      '',
      ...allFields.map((f) => `${f.fieldName} (${f.bengaliName}): ${f.value}`),
      '',
      '='.repeat(50),
      `Powered by Gemma 3 4B · Generated ${new Date().toLocaleString('bn-BD')}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sohoj-form-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

      {/* Success header */}
      <div className="text-center mb-10 animate-fade-in">
        <div className="relative w-20 h-20 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full animate-pulse opacity-20" style={{ background: 'oklch(0.55 0.15 155)' }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'oklch(0.55 0.15 155)' }}>
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          সম্পন্ন! <span className="text-muted-foreground font-normal text-2xl">Done</span>
        </h2>
        <p className="text-muted-foreground text-sm">
          {totalFields > 0
            ? `${totalFields}টি তথ্য বের করা হয়েছে · ${totalFields} fields extracted`
            : 'ফর্ম বিশ্লেষণ সম্পন্ন'}
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-fade-in">

        {/* View Filled Form — PRIMARY */}
        <button
          onClick={handleViewForm}
          disabled={isGenerating}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 bg-white text-left hover:border-blue-200 hover:shadow-md transition-all active:scale-95 disabled:opacity-60"
        >
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-5 -translate-y-1/3 translate-x-1/3" style={{ background: 'oklch(0.28 0.085 258)' }} />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ background: 'oklch(0.28 0.085 258 / 0.1)' }}>
            {isGenerating
              ? <Sparkles className="w-7 h-7 animate-spin" style={{ color: 'oklch(0.28 0.085 258)' }} />
              : <Eye className="w-7 h-7" style={{ color: 'oklch(0.28 0.085 258)' }} />}
          </div>
          <h3 className="font-bold text-foreground text-base mb-1">পূরণ করা ফর্ম দেখুন</h3>
          <p className="text-xs text-muted-foreground mb-1">View Filled Form</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ধাপে ধাপে দেখুন কোন ঘরে কী লিখতে হবে · Step-by-step guide showing where to write each value
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'oklch(0.28 0.085 258)' }}>
            <Eye className="w-4 h-4" />
            {isGenerating ? 'তৈরি হচ্ছে...' : 'গাইড দেখুন · View Guide'}
          </div>
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="group relative overflow-hidden rounded-2xl border-2 border-border p-6 bg-white text-left hover:border-green-200 hover:shadow-md transition-all active:scale-95"
        >
          <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-5 -translate-y-1/3 translate-x-1/3" style={{ background: 'oklch(0.55 0.15 155)' }} />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ background: 'oklch(0.55 0.15 155 / 0.1)' }}>
            <Download className="w-7 h-7" style={{ color: 'oklch(0.38 0.12 155)' }} />
          </div>
          <h3 className="font-bold text-foreground text-base mb-1">সারাংশ ডাউনলোড</h3>
          <p className="text-xs text-muted-foreground mb-1">Download Summary</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            সব তথ্য একটি ফাইলে সংরক্ষণ করুন · Save all extracted data as a text file
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: 'oklch(0.38 0.12 155)' }}>
            <Download className="w-4 h-4" />
            ডাউনলোড · Download
          </div>
        </button>
      </div>

      {/* Field summary */}
      {allFields.length > 0 && (
        <div className="rounded-2xl border border-border bg-white overflow-hidden mb-8 animate-fade-in">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              বের করা তথ্য · Extracted Fields ({totalFields})
            </p>
          </div>
          <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
            {allFields.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground">{f.fieldName} · {f.bengaliName}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{f.value}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{
                      background: f.source === 'voice' ? 'oklch(0.72 0.18 65 / 0.15)' : 'oklch(0.28 0.085 258 / 0.1)',
                      color: f.source === 'voice' ? 'oklch(0.45 0.14 65)' : 'oklch(0.28 0.085 258)',
                    }}>
                    {f.source === 'voice' ? 'Voice' : 'Doc'}
                  </span>
                  <button onClick={() => handleSpeak(f.id, f.bengaliName, f.value)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Volume2 className={`w-3.5 h-3.5 ${speakingId === f.id ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Start over */}
      <div className="text-center animate-fade-in">
        <button
          onClick={() => { resetForm(); window.location.href = '/dashboard' }}
          className="flex items-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          আরেকটি ফর্ম শুরু করুন · Start another form
        </button>
      </div>

      <VoiceGuideBar
        text={guide.currentText}
        textEn={guide.currentTextEn}
        isSpeaking={guide.isSpeaking}
        onMute={guide.setMuted}
        onDismiss={guide.silence}
      />

      {/* Walkthrough carousel modal */}
      {showView && walkthrough.length > 0 && (
        <WalkthroughModal
          walkthrough={walkthrough}
          formImage={formImage}
          onClose={() => setShowView(false)}
        />
      )}

      {/* Fallback: no walkthrough, just show image + list */}
      {showView && walkthrough.length === 0 && (
        <SimpleViewModal
          formImage={formImage}
          allFields={allFields}
          onClose={() => setShowView(false)}
          onSpeak={handleSpeak}
          speakingId={speakingId}
        />
      )}
    </div>
  )
}

// ── Walkthrough carousel modal (bbox highlighting) ────────────────────────────

function WalkthroughModal({
  walkthrough,
  formImage,
  onClose,
}: {
  walkthrough: WalkthroughStep[]
  formImage: string | null
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const step = walkthrough[idx]

  const speakStep = async () => {
    setSpeaking(true)
    try { await speak(step.captionBn) } finally { setSpeaking(false) }
  }

  // Auto-speak when step changes
  useEffect(() => { speakStep() }, [idx])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl mx-auto mt-4 mb-4 rounded-2xl overflow-hidden bg-white shadow-2xl flex flex-col"
        style={{ maxHeight: '95vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 text-white" style={{ background: 'oklch(0.28 0.085 258)' }}>
          <div>
            <span className="font-semibold text-sm">হাতে লেখার গাইড · Hand-Fill Guide</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs">Field {idx + 1} of {walkthrough.length} · {idx + 1}/{walkthrough.length}</span>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xs underline">বন্ধ · Close</button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${((idx + 1) / walkthrough.length) * 100}%`, background: 'oklch(0.72 0.18 65)' }}
          />
        </div>

        {/* Form image with bbox */}
        <div className="relative bg-gray-100 flex items-center justify-center overflow-hidden" style={{ minHeight: 260 }}>
          {formImage ? (
            <div className="relative w-full">
              <img
                ref={imgRef}
                src={formImage}
                alt="Form"
                className="w-full object-contain max-h-72"
              />
              {/* Bbox highlight overlay */}
              {step && (
                <div
                  className="absolute transition-all duration-500 pointer-events-none"
                  style={{
                    left: `${step.bbox.x}%`,
                    top: `${step.bbox.y}%`,
                    width: `${step.bbox.width}%`,
                    height: `${step.bbox.height}%`,
                    border: '2.5px solid oklch(0.72 0.18 65)',
                    background: 'oklch(0.72 0.18 65 / 0.18)',
                    borderRadius: 4,
                    boxShadow: '0 0 0 9999px oklch(0 0 0 / 0.4)',
                  }}
                />
              )}
            </div>
          ) : (
            /* Placeholder mockup when no image */
            <div className="w-full max-w-sm p-6">
              <div className="bg-white border-2 border-border rounded-xl p-4 shadow-sm">
                <p className="font-bold text-sm text-center border-b pb-2 mb-3">Government Form</p>
                {walkthrough.map((s, i) => (
                  <div key={s.fieldId}
                    className={`mb-2 px-3 py-2 rounded-lg border transition-all ${i === idx ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}>
                    <p className="text-xs text-gray-500">{s.bengaliName}</p>
                    {i === idx && <p className="text-sm font-bold text-gray-900 mt-0.5">{s.value}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        {step && (
          <div className="px-5 py-4 border-t border-gray-200">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'oklch(0.72 0.18 65)' }}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{step.captionEn}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.captionBn}</p>
              </div>
              <button
                onClick={speakStep}
                className={`p-2 rounded-xl transition-colors shrink-0 ${speaking ? 'text-white' : 'hover:bg-gray-100'}`}
                style={speaking ? { background: 'oklch(0.28 0.085 258)' } : {}}
              >
                <Volume2 className={`w-4 h-4 ${speaking ? 'text-white animate-pulse' : 'text-gray-500'}`} />
              </button>
            </div>

            {/* Value to write */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm" style={{ background: 'oklch(0.72 0.18 65 / 0.1)', color: 'oklch(0.40 0.12 65)' }}>
              <span className="text-base">✏️</span>
              <span className="font-bold">{step.value}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Prev · আগে
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {walkthrough.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i === idx ? 'oklch(0.28 0.085 258)' : i < idx ? 'oklch(0.72 0.18 65)' : 'oklch(0.88 0.01 240)',
                }}
              />
            ))}
          </div>

          {idx < walkthrough.length - 1 ? (
            <button
              onClick={() => setIdx((i) => i + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 shadow-sm"
              style={{ background: 'oklch(0.28 0.085 258)' }}
            >
              Next · পরে <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: 'oklch(0.55 0.15 155)' }}
            >
              <CheckCircle2 className="w-4 h-4" /> সম্পন্ন · Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Simple fallback modal (no bbox data) ──────────────────────────────────────

function SimpleViewModal({ formImage, allFields, onClose, onSpeak, speakingId }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: 'oklch(0.28 0.085 258)' }}>
          <span className="font-semibold text-white text-sm">পূরণ করা তথ্য · Filled Values</span>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        {formImage && <img src={formImage} alt="Form" className="w-full max-h-48 object-contain bg-gray-100" />}
        <div className="flex-1 overflow-y-auto divide-y">
          {allFields.map((f: any) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{f.bengaliName}</p>
                <p className="text-sm font-bold text-gray-900">{f.value}</p>
              </div>
              <button onClick={() => onSpeak(f.id, f.bengaliName, f.value)} className="p-1.5">
                <Volume2 className={`w-4 h-4 ${speakingId === f.id ? 'text-blue-600 animate-pulse' : 'text-gray-400'}`} />
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t">
          <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'oklch(0.28 0.085 258)' }}>বন্ধ করুন · Close</button>
        </div>
      </div>
    </div>
  )
}

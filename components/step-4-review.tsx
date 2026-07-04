'use client'

import { useFormContext, type FinalField } from '@/lib/form-context'
import { StepNavigator } from './step-navigator'
import { speak, speakSequential, stopSpeaking } from '@/lib/tts'
import { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, Play, Square, FileText, Mic, ChevronDown, ChevronUp } from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

export function Step4Review() {
  const { finalFieldMap, documents, updateFinalField, buildFinalFieldMap, setCurrentStep } = useFormContext()
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showVoiceSection, setShowVoiceSection] = useState(true)
  const [showDocSection, setShowDocSection] = useState(true)
  const guide = useVoiceGuide()

  // Build field map + speak entry instruction
  useEffect(() => {
    buildFinalFieldMap()
    const t = setTimeout(() => guide.say(AGENT_LINES.step4Enter.bn, AGENT_LINES.step4Enter.en), 700)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allFields = Object.values(finalFieldMap)
  const docFields = allFields.filter((f) => f.source === 'document')
  const voiceFields = allFields.filter((f) => f.source === 'voice')

  // Also gather doc fields directly if finalFieldMap is empty
  const docFieldsDirect = docFields.length === 0
    ? documents.flatMap((doc) =>
        doc.extractedData.map((f) => ({
          id: f.id,
          fieldName: f.fieldName,
          bengaliName: f.bengaliName,
          value: f.value,
          source: 'document' as const,
          documentType: doc.documentType,
        }))
      )
    : docFields

  const displayDocFields = docFieldsDirect
  const allDisplayFields = [...displayDocFields, ...voiceFields]

  const handlePlayAll = () => {
    if (isPlayingAll) {
      stopSpeaking()
      setIsPlayingAll(false)
      setSpeakingId(null)
      return
    }
    setIsPlayingAll(true)
    const items = allDisplayFields.map((f) => ({
      text: `${f.bengaliName}। ${f.value}।`,
      textEn: `${f.fieldName}: ${f.value}`,
    }))
    speakSequential(
      items,
      (index) => setSpeakingId(allDisplayFields[index]?.id || null),
      () => { setIsPlayingAll(false); setSpeakingId(null) }
    )
  }

  const handleEditSave = (id: string) => {
    updateFinalField(id, { value: editValue })
    setEditingId(null)
  }

  const startEdit = (field: FinalField | (typeof displayDocFields)[0]) => {
    setEditingId(field.id)
    setEditValue(field.value)
  }

  const renderField = (field: { id: string; fieldName: string; bengaliName: string; value: string; source: string }) => {
    const isSpeakingThis = speakingId === field.id
    const isEditing = editingId === field.id

    return (
      <div
        key={field.id}
        className={`rounded-xl border p-4 bg-white transition-all duration-300 ${
          isSpeakingThis ? 'field-speaking' : 'border-border hover:border-border/80'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
                {field.fieldName} · {field.bengaliName}
              </span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium shrink-0 ml-auto"
                style={{
                  background: field.source === 'voice' ? 'oklch(0.72 0.18 65 / 0.15)' : 'oklch(0.28 0.085 258 / 0.1)',
                  color: field.source === 'voice' ? 'oklch(0.50 0.15 65)' : 'oklch(0.28 0.085 258)',
                }}
              >
                {field.source === 'voice' ? <Mic className="w-2.5 h-2.5" /> : <FileText className="w-2.5 h-2.5" />}
                {field.source === 'voice' ? 'Voice' : 'Doc'}
              </span>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-1.5 rounded-lg border-2 border-primary text-sm font-medium focus:outline-none"
                />
                <button onClick={() => handleEditSave(field.id)} className="p-1.5 rounded-lg bg-emerald-500 text-white">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-sm font-semibold text-foreground mt-0.5">{field.value}</p>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => { speak(`${field.bengaliName}। ${field.value}।`, 'bn-IN') }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 ${isSpeakingThis ? 'text-primary' : 'text-muted-foreground'}`}>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>
              <button
                onClick={() => startEdit(field as any)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'oklch(0.28 0.085 258)' }}>4</div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 4 · ধাপ ৪</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          Review & Confirm <span className="text-muted-foreground font-normal text-xl">· পর্যালোচনা করুন</span>
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Tap any field to edit · যেকোনো ফিল্ডে ট্যাপ করে সম্পাদনা করুন
        </p>
      </div>

      {/* Play all summary button */}
      <div className="mb-6 animate-fade-in delay-100">
        <button
          onClick={handlePlayAll}
          className={`flex items-center gap-3 w-full px-5 py-4 rounded-2xl border-2 transition-all ${
            isPlayingAll
              ? 'border-primary text-white'
              : 'border-border bg-white hover:border-primary/50'
          }`}
          style={isPlayingAll ? { background: 'oklch(0.28 0.085 258)' } : {}}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPlayingAll ? 'bg-white/20' : 'bg-muted'}`}>
            {isPlayingAll ? <Square className="w-5 h-5 text-white" fill="white" /> : <Play className="w-5 h-5 text-foreground" fill="currentColor" />}
          </div>
          <div className="text-left">
            <p className={`font-semibold text-sm ${isPlayingAll ? 'text-white' : 'text-foreground'}`}>
              {isPlayingAll ? 'Stop reading · থামুন' : '▶ Play full summary aloud · সম্পূর্ণ সারাংশ পড়ুন'}
            </p>
            <p className={`text-xs ${isPlayingAll ? 'text-white/70' : 'text-muted-foreground'}`}>
              {isPlayingAll
                ? 'Reading all fields in Bengali · বাংলায় পড়া হচ্ছে...'
                : 'Reads every field in Bengali · বাংলায় প্রতিটি ফিল্ড পড়বে'}
            </p>
          </div>
          {isPlayingAll && (
            <div className="ml-auto flex gap-1 items-center">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="waveform-bar bg-white" style={{ height: '8px' }} />
              ))}
            </div>
          )}
        </button>
      </div>

      {/* Document fields section */}
      {displayDocFields.length > 0 && (
        <div className="mb-5 animate-fade-in delay-200">
          <button
            onClick={() => setShowDocSection(!showDocSection)}
            className="flex items-center justify-between w-full mb-3"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-foreground text-sm">
                From Documents · ডকুমেন্ট থেকে ({displayDocFields.length})
              </h3>
            </div>
            {showDocSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showDocSection && (
            <div className="space-y-2">
              {displayDocFields.map(renderField)}
            </div>
          )}
        </div>
      )}

      {/* Voice fields section */}
      {voiceFields.length > 0 && (
        <div className="mb-8 animate-fade-in delay-300">
          <button
            onClick={() => setShowVoiceSection(!showVoiceSection)}
            className="flex items-center justify-between w-full mb-3"
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-foreground text-sm">
                From Voice · ভয়েস থেকে ({voiceFields.length})
              </h3>
            </div>
            {showVoiceSection ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showVoiceSection && (
            <div className="space-y-2">
              {voiceFields.map(renderField)}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allDisplayFields.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No fields collected yet · এখনো কোনো ফিল্ড সংগ্রহ হয়নি</p>
          <p className="text-xs mt-1">Go back to upload documents · ডকুমেন্ট আপলোড করতে পিছনে যান</p>
        </div>
      )}

      {/* Confirm button */}
      <div className="mt-4">
        <button
          onClick={() => {
            guide.say(AGENT_LINES.step4Confirmed.bn, AGENT_LINES.step4Confirmed.en)
            setTimeout(() => setCurrentStep(5), 1000)
          }}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 shadow-lg hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, oklch(0.28 0.085 258) 0%, oklch(0.22 0.085 258) 100%)' }}
        >
          <Check className="w-5 h-5" />
          Confirm &amp; Generate · নিশ্চিত করুন ও তৈরি করুন
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          This will generate your filled form · এটি আপনার পূরণ করা ফর্ম তৈরি করবে
        </p>
      </div>

      <StepNavigator prevDisabled={false} nextDisabled={true} />

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

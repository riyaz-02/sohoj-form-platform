'use client'

import { type ExtractedField } from '@/lib/form-context'
import { useFormContext } from '@/lib/form-context'
import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Pencil, Check, X, FileText, Mic } from 'lucide-react'
import { speak } from '@/lib/tts'

interface ExtractedFieldCardProps {
  field: ExtractedField
  editable?: boolean
}

const CONFIDENCE_COLORS = {
  high: 'text-emerald-600 bg-emerald-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-red-500 bg-red-50',
}

export function ExtractedFieldCard({ field, editable = false }: ExtractedFieldCardProps) {
  const { updateExtractedField } = useFormContext()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(field.value)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const confidenceLevel = field.confidence >= 0.9 ? 'high' : field.confidence >= 0.75 ? 'medium' : 'low'
  const confidenceLabel = field.confidence >= 0.9 ? 'High · উচ্চ' : field.confidence >= 0.75 ? 'Medium · মধ্যম' : 'Low · কম'

  const handleSave = () => {
    updateExtractedField(field.id, editValue)
    setIsEditing(false)
  }

  const handleSpeak = async () => {
    setIsSpeaking(true)
    try {
      await speak(`${field.bengaliName}। ${field.value}।`, `${field.bengaliName}: ${field.value}`)
    } finally {
      setIsSpeaking(false)
    }
  }

  const SourceIcon = field.source === 'voice' ? Mic : FileText

  return (
    <div
      className={`rounded-xl border p-4 bg-white transition-all duration-300 ${
        field.needsReview
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Field label */}
          <div className="flex items-center gap-2 mb-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide truncate">
              {field.fieldName} · {field.bengaliName}
            </p>
            {field.needsReview && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" />
                Review
              </span>
            )}
          </div>

          {/* Field value */}
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-1.5 rounded-lg border-2 border-primary text-sm font-medium focus:outline-none"
              />
              <button onClick={handleSave} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setIsEditing(false); setEditValue(field.value) }} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-border transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground">{field.value}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Source badge */}
          <span className="p-1.5 rounded-lg bg-muted" title={field.source === 'voice' ? 'Voice answer' : 'From document'}>
            <SourceIcon className="w-3 h-3 text-muted-foreground" />
          </span>

          {/* Confidence badge */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONFIDENCE_COLORS[confidenceLevel]}`}>
            {Math.round(field.confidence * 100)}%
          </span>

          {/* Speaker */}
          <button
            onClick={handleSpeak}
            className={`p-1.5 rounded-lg transition-colors ${isSpeaking ? 'bg-primary/10' : 'hover:bg-muted'}`}
            title="Read aloud · জোরে পড়ুন"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 ${isSpeaking ? 'text-primary' : 'text-muted-foreground'}`}>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              {isSpeaking && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            </svg>
          </button>

          {/* Edit button */}
          {editable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Edit · সম্পাদনা"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { type DocumentData } from '@/lib/form-context'
import { Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useRef } from 'react'
import { speak } from '@/lib/tts'

const DOC_LABELS: Record<DocumentData['documentType'], { en: string; bn: string; description: string; descBn: string }> = {
  aadhaar:           { en: 'Aadhaar Card',      bn: 'আধার কার্ড',       description: 'Your 12-digit Aadhaar identity card',   descBn: 'আপনার ১২ সংখ্যার আধার পরিচয়পত্র' },
  pan:               { en: 'PAN Card',           bn: 'প্যান কার্ড',      description: 'Permanent Account Number card',          descBn: 'স্থায়ী অ্যাকাউন্ট নম্বর কার্ড' },
  'voter-id':        { en: 'Voter ID',           bn: 'ভোটার আইডি',      description: 'Election Commission voter card',         descBn: 'নির্বাচন কমিশনের ভোটার পরিচয়পত্র' },
  'land-certificate':{ en: 'Land Certificate',  bn: 'জমির শংসাপত্র',   description: 'Land ownership or lease document',       descBn: 'জমির মালিকানা বা লিজের নথি' },
  'bank-statement':  { en: 'Bank Passbook',      bn: 'ব্যাংক পাসবুক',    description: 'Bank account passbook or statement',     descBn: 'ব্যাংক অ্যাকাউন্ট পাসবুক বা বিবরণী' },
  'bank-passbook':   { en: 'Bank Passbook',      bn: 'ব্যাংক পাসবুক',    description: 'Bank account passbook or statement',     descBn: 'ব্যাংক অ্যাকাউন্ট পাসবুক বা বিবরণী' },
}

const DOC_ICONS: Record<DocumentData['documentType'], string> = {
  aadhaar: '🪪', pan: '💳', 'voter-id': '🗳️', 'land-certificate': '📜', 'bank-statement': '🏦', 'bank-passbook': '🏦',
}

interface DocumentCardProps {
  document: DocumentData
  onUpload: (docType: DocumentData['documentType'], imageBase64: string) => void
  isLoading: boolean
}

export function DocumentCard({ document, onUpload, isLoading }: DocumentCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const label = DOC_LABELS[document.documentType]
  const icon = DOC_ICONS[document.documentType]

  const handleSpeak = () => {
    speak(`${label.bn}। ${label.descBn}।`, label.descBn)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Convert file to base64 for API
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string
      onUpload(document.documentType, base64)
    }
    reader.readAsDataURL(file)

    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="border border-border/60 rounded-2xl p-5 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">{label.en} · {label.bn}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Extracting data with Gemma AI · AI দিয়ে তথ্য বের করা হচ্ছে...
            </p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: 'oklch(0.28 0.085 258)' }} />
        </div>
        <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full animate-pulse"
            style={{ background: 'oklch(0.28 0.085 258)', width: '65%', transition: 'width 1s' }}
          />
        </div>
      </div>
    )
  }

  // ── Wrong document error ───────────────────────────────────
  if (document.error) {
    return (
      <div className="border-2 border-amber-300 rounded-2xl p-5 bg-amber-50 animate-scale-in">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              Wrong document · ভুল নথি আপলোড হয়েছে
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Expected: <strong>{label.en}</strong> ({label.bn})
            </p>
            <p className="text-xs text-amber-600 mt-1">{document.error}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-semibold text-amber-700 underline underline-offset-2"
            >
              Try again · আবার চেষ্টা করুন
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
        </div>
      </div>
    )
  }

  // ── Uploaded & extracted ───────────────────────────────────
  if (document.uploaded) {
    return (
      <div className="border border-emerald-200 rounded-2xl p-5 bg-emerald-50/50 animate-fade-in">
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">{label.en} · {label.bn}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">
                {document.extractedData.length} fields extracted · {document.extractedData.length}টি ফিল্ড
              </span>
            </div>
          </div>
          <button
            onClick={handleSpeak}
            className="p-2 rounded-xl hover:bg-emerald-100 transition-colors shrink-0"
            title="Read aloud"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-emerald-600">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 shrink-0"
          >
            Re-upload
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </div>
      </div>
    )
  }

  // ── Default: not uploaded yet ──────────────────────────────
  return (
    <div
      className="border-2 border-dashed border-border rounded-2xl p-5 bg-white hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer group"
      onClick={() => fileInputRef.current?.click()}
    >
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm">{label.en} · {label.bn}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{label.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleSpeak() }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Read aloud"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 text-muted-foreground">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform" style={{ background: 'oklch(0.28 0.085 258 / 0.08)' }}>
            <Upload className="w-4 h-4" style={{ color: 'oklch(0.28 0.085 258)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

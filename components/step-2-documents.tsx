'use client'

import { useFormContext, type DocumentData } from '@/lib/form-context'
import { DOCUMENT_CATALOG, type DocumentType, isVoiceRequiredField } from '@/lib/document-requirements'
import { ExtractedFieldCard } from './extracted-field-card'
import { StepNavigator } from './step-navigator'
import React, { useState, useEffect, useRef } from 'react'
import { LoadingSpinner } from './loading-spinner'
import {
  AlertCircle, CheckCircle2, FileText, Sparkles,
  Upload, RefreshCw, ChevronRight, X,
} from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from './voice-guide-bar'
import { AGENT_LINES } from '@/lib/voice-guide'

export function Step2Documents() {
  const {
    documents, setDocuments, updateDocument,
    setIsAnalyzing, isAnalyzing,
    requiredDocuments, extractedFields, formTitle,
  } = useFormContext()

  const [activeDocType, setActiveDocType] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isDemoMode, setIsDemoMode] = useState(false)
  const guide = useVoiceGuide()

  // ── Build document slots from AI-determined requirements ──────────────────
  useEffect(() => {
    if (requiredDocuments.length > 0 && documents.length === 0) {
      const slots: DocumentData[] = requiredDocuments.map((req, i) => ({
        id: `doc-${i + 1}`,
        documentType: req.type as DocumentData['documentType'],
        bengaliName: req.bengaliName,
        uploaded: false,
        extractedData: [],
      }))
      setDocuments(slots)
    } else if (requiredDocuments.length === 0 && documents.length === 0) {
      setDocuments([
        { id: 'doc-1', documentType: 'aadhaar', bengaliName: 'আধার কার্ড', uploaded: false, extractedData: [] },
      ])
    }
    // Detect demo mode from form title
    if (formTitle?.includes('Demo')) setIsDemoMode(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredDocuments, formTitle])

  // Speak entry instruction
  useEffect(() => {
    const t = setTimeout(() => guide.say(AGENT_LINES.step2Enter.bn, AGENT_LINES.step2Enter.en), 700)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handle document upload ────────────────────────────────────────────────
  const handleDocumentUpload = async (
    docType: DocumentData['documentType'],
    imageBase64: string,
  ) => {
    setActiveDocType(docType)
    setIsAnalyzing(true)
    setError('')

    // Speak: "Your X card is being analyzed" (photo already uploaded at this point)
    const analyzingVoice: Record<string, { bn: string; en: string }> = {
      aadhaar:           { bn: 'আপনার আধার কার্ড বিশ্লেষণ হচ্ছে', en: 'Your Aadhaar card is being analyzed' },
      pan:               { bn: 'আপনার প্যান কার্ড বিশ্লেষণ হচ্ছে', en: 'Your PAN card is being analyzed' },
      'voter-id':        { bn: 'আপনার ভোটার আইডি বিশ্লেষণ হচ্ছে', en: 'Your Voter ID is being analyzed' },
      'land-certificate':{ bn: 'আপনার জমির কাগজ বিশ্লেষণ হচ্ছে', en: 'Your land document is being analyzed' },
      'bank-passbook':   { bn: 'আপনার ব্যাংক পাসবুক বিশ্লেষণ হচ্ছে', en: 'Your bank passbook is being analyzed' },
    }
    const voiceMsg = analyzingVoice[docType] || { bn: 'নথি বিশ্লেষণ হচ্ছে', en: 'Document is being analyzed' }
    guide.say(voiceMsg.bn, voiceMsg.en)

    try {
      const res = await fetch('/api/classify-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, expectedType: docType }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Classification failed')
      }

      const docId = documents.find((d) => d.documentType === docType)?.id
      if (!docId) throw new Error('Document slot not found')

      if (!data.isCorrect) {
        // Wrong document uploaded
        const rejMsg = data.rejectionMessage || AGENT_LINES.step2WrongDoc.bn
        guide.say(rejMsg, AGENT_LINES.step2WrongDoc.en)
        updateDocument(docId, {
          error: data.rejectionMessage || `Wrong document — please upload ${docType.replace(/-/g, ' ')}`,
          uploaded: false,
          extractedData: [],
        })
      } else {
        // Correct document — save extracted data
        guide.say(AGENT_LINES.step2Extracted.bn, AGENT_LINES.step2Extracted.en)
        updateDocument(docId, {
          uploaded: true,
          extractedData: data.extractedData || [],
          timestamp: Date.now(),
          error: undefined,
        })

        // Check if all required docs uploaded
        const updatedCount = documents.filter((d) => d.uploaded || d.documentType === docType).length
        if (updatedCount === documents.length) {
          setTimeout(() => guide.say(AGENT_LINES.step2AllDone.bn, AGENT_LINES.step2AllDone.en), 1500)
        }
      }
    } catch (err: any) {
      const msg = err.message || 'নথি প্রক্রিয়া করতে সমস্যা হয়েছে'
      setError(msg)
      guide.say('নথি পড়তে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'Could not read the document. Please try again.')
      const docId = documents.find((d) => d.documentType === docType)?.id
      if (docId) updateDocument(docId, { error: msg, uploaded: false })
    } finally {
      setIsAnalyzing(false)
      setActiveDocType(null)
    }
  }

  const uploadedCount = documents.filter((d) => d.uploaded).length
  const hasAnyExtracted = documents.some((d) => d.extractedData.length > 0)
  const allUploaded = documents.length > 0 && uploadedCount === documents.length
  // Mark demo if any doc has demo data
  const hasDemo = isDemoMode || documents.some((d) => d.extractedData.some((f) => f.id?.startsWith('demo_')))

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">

      {/* ── Form Detected Banner ─────────────────────────────────────────── */}
      {formTitle && (
        <div
          className="mb-6 rounded-2xl p-4 sm:p-5 border animate-fade-in"
          style={{ background: 'linear-gradient(135deg, #1B2E6B08, #2EC4A710)', borderColor: '#1B2E6B20' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'linear-gradient(135deg, #1B2E6B, #2A4A9F)' }}>
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                AI ফর্ম চিনেছে
              </p>
              <h3 className="font-bold text-foreground text-base leading-tight">{formTitle}</h3>
              {requiredDocuments.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  এই ফর্ম পূরণ করতে নিচের নথিগুলো প্রয়োজন
                </p>
              )}
            </div>
          </div>

          {/* Required documents chips */}
          {requiredDocuments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pl-12">
              {requiredDocuments.map((doc) => (
                <span
                  key={doc.type}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: '#1B2E6B0C', borderColor: '#1B2E6B20', color: '#1B2E6B' }}
                >
                  <span className="text-[10px] font-bold opacity-60">{doc.icon}</span>
                  {doc.bengaliName}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'oklch(0.28 0.085 258)' }}>2</div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 · ধাপ ২</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          নথি আপলোড করুন <span className="text-muted-foreground font-normal text-lg">· Upload Documents</span>
        </h2>
        <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" style={{ color: 'oklch(0.72 0.18 65)' }} />
          {requiredDocuments.length > 0
            ? `${documents.length}টি নথি প্রয়োজন · ${documents.length} document${documents.length > 1 ? 's' : ''} needed`
            : 'AI স্বয়ংক্রিয়ভাবে তথ্য বের করবে · AI reads your documents automatically'}
        </p>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: documents.length > 0 ? `${(uploadedCount / documents.length) * 100}%` : '0%',
                background: allUploaded ? 'oklch(0.55 0.15 155)' : 'oklch(0.28 0.085 258)',
              }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            {uploadedCount}/{documents.length}{allUploaded ? ' ✓' : ''}
          </span>
        </div>
      </div>

      {/* Demo mode banner */}
      {hasDemo && (
        <div className="flex items-start gap-3 p-3.5 rounded-xl border mb-5 animate-scale-in"
          style={{ background: 'oklch(0.96 0.05 85)', borderColor: 'oklch(0.82 0.12 85)' }}>
          <span className="text-lg shrink-0">🧪</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'oklch(0.42 0.14 60)' }}>
              ডেমো মোডে চলছে
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'oklch(0.52 0.11 65)' }}>
              AI কী ফলাফল দেয় তা দেখাচ্ছে। বাস্তব নথি আপলোড করলে প্রকৃত তথ্য বের হবে।
            </p>
          </div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
            className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0 whitespace-nowrap"
            style={{ background: 'oklch(0.72 0.18 65)', color: 'white' }}>
            Free API Key
          </a>
        </div>
      )}

      {/* Global error */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-destructive/8 border border-destructive/25 rounded-xl mb-5 animate-scale-in">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={() => setError('')} className="ml-auto shrink-0">
            <X className="w-4 h-4 text-destructive/60" />
          </button>
        </div>
      )}

      {/* Document slots — ONLY what the form needs */}
      <div className="space-y-3 mb-8 animate-fade-in delay-100">
        {documents.map((doc) => {
          const catalog = DOCUMENT_CATALOG[doc.documentType as DocumentType]
          const reqDoc = requiredDocuments.find((r) => r.type === doc.documentType)
          return (
            <DocumentSlot
              key={doc.id}
              doc={doc}
              catalog={catalog}
              fillsFields={reqDoc?.fillsFields || []}
              isLoading={isAnalyzing && activeDocType === doc.documentType}
              onUpload={handleDocumentUpload}
            />
          )
        })}
      </div>

      {/* Extracted fields summary */}
      {hasAnyExtracted && (
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-foreground text-base">
              Extracted Information · বের করা তথ্য
            </h3>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium" style={{ color: 'oklch(0.55 0.15 155)' }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              AI-extracted
            </span>
          </div>
          <div className="space-y-6">
            {documents.filter((d) => d.extractedData.length > 0).map((doc) => (
              <div key={doc.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <span>{DOCUMENT_CATALOG[doc.documentType as DocumentType]?.icon}</span>
                  {doc.bengaliName}
                  <span className="text-[10px] text-muted-foreground/60">· {doc.extractedData.length} fields</span>
                </p>
                <div className="space-y-2">
                  {doc.extractedData.map((field) => (
                    <ExtractedFieldCard key={field.id} field={field} editable />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Voice Required Fields ────────────────────────────────────────── */}
      {(() => {
        const voiceFields = extractedFields.filter((f) =>
          isVoiceRequiredField(f.id, f.fieldName)
        )
        if (voiceFields.length === 0) return null
        return (
          <div
            className="mb-5 rounded-2xl border p-4 animate-fade-in"
            style={{ background: 'linear-gradient(135deg, #FF8C0010, #FF6B0008)', borderColor: '#FF8C0025' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                   style={{ background: 'linear-gradient(135deg, #E0700A, #FF8C00)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="w-4 h-4">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#B45309' }}>
                  পরের ধাপে জিজ্ঞাসা করা হবে
                </p>
                <p className="text-xs text-muted-foreground">
                  এই তথ্যগুলো কোনো নথিতে থাকে না — আপনি নিজে বলবেন
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {voiceFields.map((f) => (
                <span
                  key={f.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border"
                  style={{ background: '#FF8C0010', borderColor: '#FF8C0025', color: '#B45309' }}
                >
                  {f.bengaliName || f.fieldName}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      <StepNavigator nextDisabled={uploadedCount === 0} />


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

// ── Individual document upload slot ─────────────────────────────────────────

interface DocumentSlotProps {
  doc: DocumentData
  catalog: typeof DOCUMENT_CATALOG[DocumentType]
  fillsFields: string[]
  isLoading: boolean
  onUpload: (type: DocumentData['documentType'], imageBase64: string) => void
}

function DocumentSlot({ doc, catalog, fillsFields, isLoading, onUpload }: DocumentSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      onUpload(doc.documentType, ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
      doc.uploaded
        ? 'border-green-200 bg-green-50/30'
        : doc.error
        ? 'border-red-200 bg-red-50/20'
        : 'border-border bg-white hover:border-border/80'
    }`}>
      <div className="flex items-center gap-3 p-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
          doc.uploaded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : doc.uploaded ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            catalog?.icon || 'DOC'
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm">{doc.bengaliName}</p>
            <span className="text-xs text-muted-foreground">· {catalog?.englishName}</span>
            {doc.uploaded && (
              <span className="ml-auto text-xs font-medium text-green-600">✓ আপলোড হয়েছে</span>
            )}
          </div>

          {fillsFields.length > 0 && !doc.uploaded && !doc.error && (
            <p className="text-xs text-muted-foreground mt-0.5">
              পূরণ করবে: {fillsFields.slice(0, 3).join(', ')}{fillsFields.length > 3 ? '…' : ''}
            </p>
          )}
          {doc.uploaded && doc.extractedData.length > 0 && (
            <p className="text-xs text-green-600 mt-0.5">{doc.extractedData.length}টি তথ্য বের হয়েছে</p>
          )}
          {doc.error && !isLoading && (
            <p className="text-xs text-red-600 mt-0.5 leading-snug">{doc.error}</p>
          )}
          {isLoading && (
            <p className="text-xs text-primary mt-0.5">AI পড়ছে… (১-২ মিনিট লাগতে পারে)</p>
          )}
        </div>

        {/* Upload button — NOT inside a label */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
            doc.uploaded
              ? 'bg-muted text-muted-foreground hover:bg-muted/80'
              : 'text-white'
          }`}
          style={!doc.uploaded ? { background: 'oklch(0.28 0.085 258)' } : {}}
        >
          {isLoading ? (
            <span>পড়ছি…</span>
          ) : doc.uploaded ? (
            <><RefreshCw className="w-3 h-3" /> পুনরায়</>
          ) : (
            <><Upload className="w-3 h-3" /> আপলোড</>
          )}
        </button>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={isLoading}
          onChange={handleFile}
        />
      </div>

      {/* Bengali description */}
      {!doc.uploaded && !doc.error && catalog?.description && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {catalog.description}
          </p>
        </div>
      )}
    </div>
  )
}



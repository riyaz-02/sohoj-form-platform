'use client'

import React, { createContext, useContext, useState } from 'react'
import type { RequiredDocument } from './document-requirements'

export interface FormImage {
  id: string
  file: File
  thumbnail: string
  timestamp: number
}

export interface ExtractedField {
  id: string
  fieldName: string
  bengaliName: string
  /** Filled value (from voice or document extraction) */
  value: string
  /** Pre-filled/default value from the form itself (from FormField API response) */
  currentValue?: string
  /** Input type from form analysis */
  fieldType?: 'text' | 'date' | 'number' | 'checkbox' | 'select'
  confidence: number
  category: 'personal' | 'land' | 'financial' | 'other'
  needsReview: boolean
  source?: 'document' | 'voice'
  documentType?: string
  /** Approximate vertical position on the form image (0–100%) from Step 1 AI analysis */
  yPercent?: number
}

export interface DocumentData {
  id: string
  documentType: 'aadhaar' | 'pan' | 'voter-id' | 'land-certificate' | 'bank-passbook' | 'bank-statement'
  bengaliName: string
  uploaded: boolean
  extractedData: ExtractedField[]
  timestamp?: number
  error?: string
}

export interface VoiceTurn {
  role: 'ai' | 'user'
  text: string
  textBn?: string
  fieldId?: string
  timestamp: number
}

export interface FinalField {
  id: string
  fieldName: string
  bengaliName: string
  value: string
  source: 'document' | 'voice'
  documentType?: string
}

interface FormContextType {
  currentStep: number
  setCurrentStep: (step: number) => void
  // Active form ID (slug from URL, e.g. 'bank', 'krishak')
  formId: string
  setFormId: (id: string) => void
  formImages: FormImage[]
  addFormImage: (image: FormImage) => void
  removeFormImage: (id: string) => void
  clearFormImages: () => void
  extractedFields: ExtractedField[]
  setExtractedFields: (fields: ExtractedField[]) => void
  updateExtractedField: (fieldId: string, value: string) => void
  documents: DocumentData[]
  setDocuments: (docs: DocumentData[]) => void
  addDocument: (doc: DocumentData) => void
  updateDocument: (docId: string, data: Partial<DocumentData>) => void
  isAnalyzing: boolean
  setIsAnalyzing: (analyzing: boolean) => void
  // Required documents from AI analysis
  requiredDocuments: RequiredDocument[]
  setRequiredDocuments: (docs: RequiredDocument[]) => void
  formTitle: string
  setFormTitle: (title: string) => void
  // Phase 2: voice & review
  voiceTranscript: VoiceTurn[]
  addVoiceTurn: (turn: VoiceTurn) => void
  clearVoiceTranscript: () => void
  currentVoiceFieldIndex: number
  setCurrentVoiceFieldIndex: (i: number) => void
  finalFieldMap: Record<string, FinalField>
  updateFinalField: (id: string, field: Partial<FinalField>) => void
  buildFinalFieldMap: () => void
  resetForm: () => void
}

const FormContext = createContext<FormContextType | undefined>(undefined)

export function FormProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formId, setFormId] = useState('')
  const [formImages, setFormImages] = useState<FormImage[]>([])
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([])
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [voiceTranscript, setVoiceTranscript] = useState<VoiceTurn[]>([])
  const [currentVoiceFieldIndex, setCurrentVoiceFieldIndex] = useState(0)
  const [finalFieldMap, setFinalFieldMap] = useState<Record<string, FinalField>>({})

  const addFormImage = (image: FormImage) => setFormImages((prev) => [...prev, image])
  const removeFormImage = (id: string) => setFormImages((prev) => prev.filter((img) => img.id !== id))
  const clearFormImages = () => setFormImages([])
  const updateExtractedField = (fieldId: string, value: string) =>
    setExtractedFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value, needsReview: false } : f))
    )
  const addDocument = (doc: DocumentData) => setDocuments((prev) => [...prev, doc])
  const updateDocument = (docId: string, data: Partial<DocumentData>) =>
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...data } : d)))

  const addVoiceTurn = (turn: VoiceTurn) => setVoiceTranscript((prev) => [...prev, turn])
  const clearVoiceTranscript = () => setVoiceTranscript([])

  const updateFinalField = (id: string, field: Partial<FinalField>) =>
    setFinalFieldMap((prev) => ({ ...prev, [id]: { ...prev[id], ...field, id } as FinalField }))

  // Merge document-extracted + voice fields into finalFieldMap
  const buildFinalFieldMap = () => {
    const map: Record<string, FinalField> = {}
    documents.forEach((doc) => {
      doc.extractedData.forEach((f) => {
        map[f.id] = {
          id: f.id,
          fieldName: f.fieldName,
          bengaliName: f.bengaliName,
          value: f.value,
          source: 'document',
          documentType: doc.documentType,
        }
      })
    })
    // Voice fields override if they exist
    Object.values(finalFieldMap).forEach((f) => {
      if (f.source === 'voice') map[f.id] = f
    })
    setFinalFieldMap(map)
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFormImages([])
    setExtractedFields([])
    setDocuments([])
    setIsAnalyzing(false)
    setRequiredDocuments([])
    setFormTitle('')
    setVoiceTranscript([])
    setCurrentVoiceFieldIndex(0)
    setFinalFieldMap({})
    // Note: formId is intentionally NOT reset here — it comes from the URL
  }

  return (
    <FormContext.Provider
      value={{
        currentStep, setCurrentStep,
        formId, setFormId,
        formImages, addFormImage, removeFormImage, clearFormImages,
        extractedFields, setExtractedFields, updateExtractedField,
        documents, setDocuments, addDocument, updateDocument,
        isAnalyzing, setIsAnalyzing,
        requiredDocuments, setRequiredDocuments,
        formTitle, setFormTitle,
        voiceTranscript, addVoiceTurn, clearVoiceTranscript,
        currentVoiceFieldIndex, setCurrentVoiceFieldIndex,
        finalFieldMap, updateFinalField, buildFinalFieldMap,
        resetForm,
      }}
    >
      {children}
    </FormContext.Provider>
  )
}

export function useFormContext() {
  const context = useContext(FormContext)
  if (!context) throw new Error('useFormContext must be used within a FormProvider')
  return context
}

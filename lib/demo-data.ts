/**
 * Demo fallback data for when Gemini API is not available.
 * Used when GEMINI_API_KEY is missing, blocked (403), or quota exceeded (429).
 * This makes the app demonstrable without a working API key.
 */

import { deriveRequiredDocuments } from './document-requirements'

// ── Demo form fields — realistic government form ──────────────────────────

export const DEMO_FORM_FIELDS = [
  {
    id: 'applicant_name',
    fieldName: 'Applicant Full Name',
    bengaliName: 'আবেদনকারীর সম্পূর্ণ নাম',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'father_name',
    fieldName: "Father's / Husband's Name",
    bengaliName: 'পিতা / স্বামীর নাম',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'date_of_birth',
    fieldName: 'Date of Birth',
    bengaliName: 'জন্ম তারিখ',
    currentValue: '',
    fieldType: 'date' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'aadhaar_number',
    fieldName: 'Aadhaar Number',
    bengaliName: 'আধার কার্ড নম্বর',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'address',
    fieldName: 'Permanent Address',
    bengaliName: 'স্থায়ী ঠিকানা',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'mobile_number',
    fieldName: 'Mobile Number',
    bengaliName: 'মোবাইল নম্বর',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'personal' as const,
  },
  {
    id: 'bank_account_number',
    fieldName: 'Bank Account Number',
    bengaliName: 'ব্যাংক অ্যাকাউন্ট নম্বর',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'financial' as const,
  },
  {
    id: 'ifsc_code',
    fieldName: 'IFSC Code',
    bengaliName: 'IFSC কোড',
    currentValue: '',
    fieldType: 'text' as const,
    required: true,
    category: 'financial' as const,
  },
  {
    id: 'annual_income',
    fieldName: 'Annual Income (₹)',
    bengaliName: 'বার্ষিক আয় (টাকা)',
    currentValue: '',
    fieldType: 'number' as const,
    required: true,
    category: 'financial' as const,
  },
  {
    id: 'land_area',
    fieldName: 'Land Area (Bigha)',
    bengaliName: 'জমির পরিমাণ (বিঘা)',
    currentValue: '',
    fieldType: 'number' as const,
    required: false,
    category: 'land' as const,
  },
]

// ── Demo document extracted fields ───────────────────────────────────────────

export const DEMO_EXTRACTED = {
  aadhaar: [
    { id: 'demo_a1', fieldName: 'Aadhaar Number',  bengaliName: 'আধার কার্ড নম্বর', value: '1234 5678 9012', confidence: 0.97, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'aadhaar' },
    { id: 'demo_a2', fieldName: 'Full Name',        bengaliName: 'সম্পূর্ণ নাম',     value: 'RAMESH CHANDRA DAS', confidence: 0.94, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'aadhaar' },
    { id: 'demo_a3', fieldName: 'Date of Birth',    bengaliName: 'জন্ম তারিখ',       value: '12/06/1988',    confidence: 0.91, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'aadhaar' },
    { id: 'demo_a4', fieldName: 'Gender',           bengaliName: 'লিঙ্গ',            value: 'Male',          confidence: 0.99, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'aadhaar' },
    { id: 'demo_a5', fieldName: 'Address',          bengaliName: 'ঠিকানা',           value: 'Vill: Rampur, PO: Beldanga, Dist: Murshidabad, WB - 742133', confidence: 0.85, category: 'personal' as const, needsReview: true,  source: 'document' as const, documentType: 'aadhaar' },
  ],
  pan: [
    { id: 'demo_p1', fieldName: 'PAN Number',       bengaliName: 'প্যান নম্বর',      value: 'ABCDE1234F',    confidence: 0.99, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'pan' },
    { id: 'demo_p2', fieldName: 'Name',             bengaliName: 'নাম',              value: 'RAMESH CHANDRA DAS', confidence: 0.96, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'pan' },
    { id: 'demo_p3', fieldName: 'Date of Birth',    bengaliName: 'জন্ম তারিখ',       value: '12/06/1988',    confidence: 0.93, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'pan' },
    { id: 'demo_p4', fieldName: "Father's Name",    bengaliName: 'পিতার নাম',        value: 'SURESH CHANDRA DAS', confidence: 0.90, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'pan' },
  ],
  'voter-id': [
    { id: 'demo_v1', fieldName: 'EPIC Number',      bengaliName: 'ভোটার আইডি নম্বর', value: 'WB/24/108/234567', confidence: 0.96, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'voter-id' },
    { id: 'demo_v2', fieldName: 'Full Name',        bengaliName: 'সম্পূর্ণ নাম',     value: 'Ramesh Chandra Das', confidence: 0.92, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'voter-id' },
    { id: 'demo_v3', fieldName: "Father's Name",    bengaliName: 'পিতার নাম',        value: 'Suresh Chandra Das', confidence: 0.89, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'voter-id' },
    { id: 'demo_v4', fieldName: 'Address',          bengaliName: 'ঠিকানা',           value: 'Rampur, Beldanga, Murshidabad', confidence: 0.87, category: 'personal' as const, needsReview: true, source: 'document' as const, documentType: 'voter-id' },
  ],
  'land-certificate': [
    { id: 'demo_l1', fieldName: 'Khasra/Dag Number', bengaliName: 'খাসরা / দাগ নম্বর', value: 'DAG-2024-0891', confidence: 0.88, category: 'land' as const, needsReview: true, source: 'document' as const, documentType: 'land-certificate' },
    { id: 'demo_l2', fieldName: 'Land Area',         bengaliName: 'জমির পরিমাণ',       value: '7.5 Bigha',    confidence: 0.91, category: 'land' as const, needsReview: false, source: 'document' as const, documentType: 'land-certificate' },
    { id: 'demo_l3', fieldName: 'Land Type',         bengaliName: 'জমির ধরন',           value: 'Agricultural', confidence: 0.94, category: 'land' as const, needsReview: false, source: 'document' as const, documentType: 'land-certificate' },
    { id: 'demo_l4', fieldName: 'Mouza / Village',   bengaliName: 'মৌজা / গ্রাম',      value: 'Rampur',       confidence: 0.92, category: 'land' as const, needsReview: false, source: 'document' as const, documentType: 'land-certificate' },
    { id: 'demo_l5', fieldName: 'District',          bengaliName: 'জেলা',               value: 'Murshidabad',  confidence: 0.97, category: 'land' as const, needsReview: false, source: 'document' as const, documentType: 'land-certificate' },
  ],
  'bank-passbook': [
    { id: 'demo_b1', fieldName: 'Account Number',   bengaliName: 'অ্যাকাউন্ট নম্বর',    value: '32145678901234', confidence: 0.94, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-passbook' },
    { id: 'demo_b2', fieldName: 'IFSC Code',        bengaliName: 'IFSC কোড',             value: 'SBIN0006789',   confidence: 0.98, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-passbook' },
    { id: 'demo_b3', fieldName: 'Account Holder',   bengaliName: 'অ্যাকাউন্ট ধারকের নাম', value: 'RAMESH CHANDRA DAS', confidence: 0.93, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'bank-passbook' },
    { id: 'demo_b4', fieldName: 'Bank Name',        bengaliName: 'ব্যাংকের নাম',          value: 'State Bank of India', confidence: 0.97, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-passbook' },
    { id: 'demo_b5', fieldName: 'Branch',           bengaliName: 'শাখা',                  value: 'Beldanga Branch', confidence: 0.91, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-passbook' },
  ],
  'bank-statement': [
    { id: 'demo_bs1', fieldName: 'Account Number',  bengaliName: 'অ্যাকাউন্ট নম্বর',    value: '32145678901234', confidence: 0.94, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-statement' },
    { id: 'demo_bs2', fieldName: 'IFSC Code',       bengaliName: 'IFSC কোড',             value: 'SBIN0006789',   confidence: 0.98, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-statement' },
    { id: 'demo_bs3', fieldName: 'Account Holder',  bengaliName: 'অ্যাকাউন্ট ধারকের নাম', value: 'RAMESH CHANDRA DAS', confidence: 0.93, category: 'personal' as const, needsReview: false, source: 'document' as const, documentType: 'bank-statement' },
    { id: 'demo_bs4', fieldName: 'Bank Name',       bengaliName: 'ব্যাংকের নাম',          value: 'State Bank of India', confidence: 0.97, category: 'financial' as const, needsReview: false, source: 'document' as const, documentType: 'bank-statement' },
  ],
}

/** Check if an error is a GCP API key block (403 / billing issue) */
export function isApiBlockedError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase()
  return (
    err?.status === 403 ||
    msg.includes('403') ||
    msg.includes('blocked') ||
    msg.includes('api_key_service_blocked') ||
    msg.includes('forbidden')
  )
}

/** Check if error is a rate-limit (429) */
export function isRateLimitError(err: any): boolean {
  const msg = (err?.message || '').toLowerCase()
  return (
    err?.status === 429 ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  )
}

/** Build a demo analyze-form response from uploaded images (simulates AI reading the form) */
export function buildDemoFormResponse(formType = '') {
  const fields = DEMO_FORM_FIELDS
  const requiredDocuments = deriveRequiredDocuments(fields, formType)
  return {
    success: true,
    demo: true,
    formTitle: 'Government Application Form (Demo)',
    fields,
    fieldCount: fields.length,
    requiredDocuments,
    demoMessage: 'ডেমো মোডে চলছে — AI কী ফলাফল দেবে তা দেখাচ্ছে',
    demoMessageEn: 'Running in demo mode — showing what AI results look like',
  }
}

/** Build a demo classify-document response */
export function buildDemoDocumentResponse(docType: string) {
  const fields = (DEMO_EXTRACTED as any)[docType] || DEMO_EXTRACTED.aadhaar
  return {
    success: true,
    demo: true,
    isCorrect: true,
    detectedType: docType,
    confidence: 0.93,
    extractedData: fields,
    extractedCount: fields.length,
    demoMessage: 'ডেমো মোডে চলছে — বাস্তব নথি থেকে এভাবেই তথ্য বের হবে',
    demoMessageEn: 'Demo mode — this is how data will be extracted from your real document',
  }
}

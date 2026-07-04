import { NextRequest, NextResponse } from 'next/server'
import {
  callOllamaVision, getModel, dataUrlToInlineData,
  parseGemmaJSON, callPythonServer, withRetry, QUOTA_MSG_BN,
  OLLAMA_URL, OLLAMA_MODEL,
} from '@/lib/gemma'
import { normalizeDocumentType, type DocumentType } from '@/lib/document-requirements'
import { buildDemoDocumentResponse, isApiBlockedError, isRateLimitError } from '@/lib/demo-data'

/**
 * POST /api/classify-document
 *
 * Backend priority:
 *   1. Ollama (local gemma3:4b) — set OLLAMA_URL in .env.local
 *   2. Python server            — set PYTHON_SERVER_URL in .env.local
 *   3. Google Gemini API        — set GEMINI_API_KEY in .env.local
 */

// ── Per-document extraction prompts ─────────────────────────────────────────

const DOC_PROMPTS: Record<string, string> = {
  aadhaar: `Extract from this Aadhaar card:
- 12-digit Aadhaar number (format: XXXX XXXX XXXX)
- Full name (as printed)
- Date of Birth (DD/MM/YYYY)
- Gender (Male/Female/Other)
- Full address including pin code
- Mobile number if visible

Bengali field names:
- Aadhaar Number → "আধার কার্ড নম্বর"
- Full Name → "সম্পূর্ণ নাম"
- Date of Birth → "জন্ম তারিখ"
- Gender → "লিঙ্গ"
- Address → "ঠিকানা"
- Mobile → "মোবাইল নম্বর"`,

  pan: `Extract from this PAN card:
- PAN number (10-character alphanumeric, format: ABCDE1234F)
- Full name (as on card, usually in CAPS)
- Date of Birth (DD/MM/YYYY)
- Father's name

Bengali field names:
- PAN Number → "প্যান নম্বর"
- Full Name → "সম্পূর্ণ নাম"
- Date of Birth → "জন্ম তারিখ"
- Father's Name → "পিতার নাম"`,

  'voter-id': `Extract from this Voter ID / EPIC card:
- EPIC number (Electors Photo Identity Card number)
- Full name
- Father's / Husband's name
- Gender
- Date of Birth or Age
- Address / Part No.
- Assembly constituency

Bengali field names:
- EPIC Number → "ভোটার আইডি নম্বর"
- Full Name → "সম্পূর্ণ নাম"
- Father's Name → "পিতার নাম"
- Gender → "লিঙ্গ"
- Date of Birth → "জন্ম তারিখ"
- Address → "ঠিকানা"`,

  'land-certificate': `Extract from this land certificate / patta / khatian document:
- Khasra number / Dag number
- Land area (in Bigha, Katha, or Acre — note the unit)
- Land type (Agricultural/Non-Agricultural/Homestead/Cultivable)
- Mouza / Village name
- District and Block
- Survey number if visible
- Owner's name if printed

Bengali field names:
- Khasra/Dag Number → "খাসরা / দাগ নম্বর"
- Land Area → "জমির পরিমাণ"
- Land Type → "জমির ধরন"
- Village/Mouza → "গ্রাম / মৌজা"
- District → "জেলা"`,

  'bank-passbook': `Extract from this bank passbook or cancelled cheque:
- Account number (full number)
- IFSC code (11-character code)
- Bank name
- Branch name
- Account holder's full name
- Account type (Savings/Current)
- MICR code if visible

Bengali field names:
- Account Number → "অ্যাকাউন্ট নম্বর"
- IFSC Code → "IFSC কোড"
- Bank Name → "ব্যাংকের নাম"
- Branch → "শাখা"
- Account Holder → "অ্যাকাউন্ট ধারকের নাম"
- Account Type → "অ্যাকাউন্টের ধরন"`,
}

function buildPrompt(expectedType: string): string {
  const fields = DOC_PROMPTS[expectedType] || 'Extract all visible text fields.'
  return `Read this Indian government document image. Expected type: "${expectedType}".

${fields}

Return ONLY this JSON:
{"detectedType":"${expectedType}","isCorrect":true,"confidence":0.9,"rejectionReason":null,"extractedData":[{"id":"field_id","fieldName":"English name","bengaliName":"Bengali name","value":"extracted value","confidence":0.9,"category":"personal","needsReview":false}]}

Rules: detectedType must be one of: aadhaar, pan, voter-id, land-certificate, bank-passbook, unknown. Set isCorrect=false if document type does not match "${expectedType}". Never guess values — use "" if not visible. Return ONLY JSON.`
}

type ExtractedField = {
  id: string
  fieldName: string
  bengaliName: string
  value: string
  confidence: number
  category: string
  needsReview: boolean
}

type ParsedDoc = {
  detectedType: string
  isCorrect: boolean
  confidence: number
  rejectionReason?: string
  extractedData: ExtractedField[]
}

export async function POST(request: NextRequest) {
  let expectedType: DocumentType = 'aadhaar'

  try {
    const body = await request.json()
    const { imageBase64, expectedType: et } = body as { imageBase64?: string; expectedType: DocumentType }
    expectedType = et || 'aadhaar'

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    const prompt = buildPrompt(expectedType)

    // ── Priority 1: Ollama local (gemma3:4b) ──────────────────────────────
    if (OLLAMA_URL) {
      console.log(`[classify-document] Trying Ollama (${OLLAMA_MODEL}) for ${expectedType}...`)
      const rawText = await callOllamaVision(prompt, [imageBase64])

      if (rawText) {
        const parsed = parseGemmaJSON<ParsedDoc>(rawText)
        if (parsed) {
          return buildResponse(parsed, expectedType)
        }
        console.warn('[classify-document] Ollama response could not be parsed:', rawText.slice(0, 300))
      } else {
        console.warn(`[classify-document] Ollama unavailable — run: ollama serve && ollama pull ${OLLAMA_MODEL}`)
      }
    }

    // ── Priority 2: Local Python server ───────────────────────────────────
    if (process.env.PYTHON_SERVER_URL) {
      const pyResult = await callPythonServer('/classify-document', { imageBase64, expectedType })
      if (pyResult?.success) {
        return NextResponse.json({ ...pyResult, backend: 'python-gemma4' })
      }
      console.warn('[classify-document] Python server unavailable, trying Gemini API...')
    }

    // ── Priority 3: Google Gemini API ─────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: OLLAMA_URL
          ? `Ollama চালু নেই। PowerShell-এ চালান: ollama serve`
          : 'AI service not configured. Set OLLAMA_URL or GEMINI_API_KEY in .env.local',
      }, { status: 503 })
    }

    const model = getModel(true)
    const imagePart = dataUrlToInlineData(imageBase64)
    console.log(`[classify-document] Calling Gemini Flash for ${expectedType}...`)

    const result = await withRetry(() => model.generateContent([prompt, imagePart]))
    const rawText = result.response.text()
    console.log('[classify-document] Raw Gemini response:', rawText.slice(0, 400))

    const parsed = parseGemmaJSON<ParsedDoc>(rawText)
    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: 'Could not read the document. Ensure image is clear, well-lit, and all text is visible.',
      }, { status: 422 })
    }

    return buildResponse(parsed, expectedType, 'gemini')

  } catch (error: any) {
    console.error('[classify-document] ERROR:', error?.message || error)

    if (isApiBlockedError(error)) {
      console.warn('[classify-document] API blocked (403) — returning demo data')
      return NextResponse.json(buildDemoDocumentResponse(expectedType))
    }

    if (isRateLimitError(error)) {
      return NextResponse.json({
        success: false,
        error: QUOTA_MSG_BN,
        isQuotaError: true,
      }, { status: 429 })
    }

    return NextResponse.json({
      success: false,
      error: `নথি পড়তে সমস্যা: ${error?.message}`,
    }, { status: 500 })
  }
}

// ── Build JSON response ────────────────────────────────────────────────────

function buildResponse(parsed: ParsedDoc, expectedType: DocumentType, backend = 'ollama') {
  const detectedType = normalizeDocumentType(parsed.detectedType || '')
  const isCorrect = detectedType === expectedType && parsed.isCorrect !== false

  const taggedFields = (parsed.extractedData || [])
    .filter((f) => f.value && f.value.trim() !== '')
    .map((f, i) => ({
      ...f,
      id: f.id || `${expectedType}_field_${i}`,
      source: 'document' as const,
      documentType: expectedType,
      category: (f.category as any) || 'other',
      needsReview: f.needsReview || f.confidence < 0.75,
    }))

  const docNames: Record<string, string> = {
    aadhaar: 'আধার কার্ড',
    pan: 'প্যান কার্ড',
    'voter-id': 'ভোটার আইডি',
    'land-certificate': 'জমির দলিল',
    'bank-passbook': 'ব্যাংক পাসবুক',
    unknown: 'অজানা নথি',
  }

  let rejectionMessage: string | undefined
  if (!isCorrect) {
    const expectedBn = docNames[expectedType] || expectedType
    const detectedBn = docNames[detectedType] || detectedType
    rejectionMessage = `এটি ${detectedBn} মনে হচ্ছে। দয়া করে ${expectedBn} আপলোড করুন।`
  }

  console.log(`[classify-document] ${backend} | Detected: ${detectedType}, Expected: ${expectedType}, Correct: ${isCorrect}, Fields: ${taggedFields.length}`)

  return NextResponse.json({
    success: true,
    isCorrect,
    detectedType,
    confidence: parsed.confidence || 0.8,
    extractedData: taggedFields,
    rejectionMessage,
    extractedCount: taggedFields.length,
    backend,
  })
}

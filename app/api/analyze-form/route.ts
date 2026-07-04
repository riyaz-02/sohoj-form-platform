import { NextRequest, NextResponse } from 'next/server'
import {
  callOllamaVision, callOllamaText,
  getModel, dataUrlToInlineData, parseGemmaJSON,
  callPythonServer, withRetry, QUOTA_MSG_BN, QUOTA_MSG_EN,
  OLLAMA_URL, OLLAMA_MODEL,
} from '@/lib/gemma'
import { deriveRequiredDocuments } from '@/lib/document-requirements'
import { buildDemoFormResponse, isApiBlockedError, isRateLimitError } from '@/lib/demo-data'

/**
 * POST /api/analyze-form
 *
 * Backend priority:
 *   1. Ollama (local gemma3:4b) — set OLLAMA_URL in .env.local
 *   2. Python server            — set PYTHON_SERVER_URL in .env.local
 *   3. Google Gemini API        — set GEMINI_API_KEY in .env.local
 */

export interface FormField {
  id: string
  fieldName: string
  bengaliName: string
  currentValue: string
  fieldType: 'text' | 'date' | 'number' | 'checkbox' | 'select'
  required: boolean
  category: 'personal' | 'land' | 'financial' | 'other'
}

// ── Shared analysis prompt (works with Ollama + Gemini) ───────────────────

const ANALYZE_PROMPT = `You are an expert OCR system for Indian government application forms.

TASK: Analyze the form image(s) and extract ALL blank fields the applicant must fill.

OUTPUT FORMAT — return ONLY this JSON, nothing else:
{
  "formTitle": "Detected form title in English",
  "fields": [
    {
      "id": "snake_case_unique_id",
      "fieldName": "Exact English label from the form",
      "bengaliName": "Bengali translation of the label",
      "currentValue": "",
      "fieldType": "text|date|number|checkbox|select",
      "required": true,
      "category": "personal|land|financial|other"
    }
  ]
}

STRICT RULES:
1. Include EVERY blank field — name, DOB, Aadhaar, PAN, address, bank account, IFSC, land area, khasra, income, signature box, etc.
2. DO NOT include pre-printed values already filled on the form
3. Translate field labels to Bengali ACCURATELY (not word-for-word, use proper Bengali govt terminology):
   - "Applicant Name" → "আবেদনকারীর নাম"
   - "Aadhaar Number" → "আধার কার্ড নম্বর"
   - "Date of Birth" → "জন্ম তারিখ"
   - "Father's Name" → "পিতার নাম"
   - "Bank Account Number" → "ব্যাংক অ্যাকাউন্ট নম্বর"
   - "IFSC Code" → "IFSC কোড"
   - "Annual Income" → "বার্ষিক আয়"
   - "Khasra Number" → "খাসরা নম্বর"
   - "Land Area" → "জমির পরিমাণ"
   - "Village" → "গ্রাম"
   - "District" → "জেলা"
   - "State" → "রাজ্য"
   - "PIN Code" → "পিন কোড"
   - "Mobile Number" → "মোবাইল নম্বর"
   - "Gender" → "লিঙ্গ"
   - "Category" → "শ্রেণী"
4. ID naming: use snake_case like "applicant_name", "aadhaar_number", "bank_account_number"
5. category:
   - personal = name, DOB, gender, address, Aadhaar, phone, caste, religion
   - land = khasra, plot, dag, mouza, village, bigha, survey, patta
   - financial = bank account, IFSC, income, PAN, tax
   - other = everything else
6. required = true for all mandatory fields (marked with * or required text)
7. Return ONLY the JSON. No markdown, no explanation, no code fences.`

// ── Field cleaner ──────────────────────────────────────────────────────────

function cleanFields(fields: FormField[]): FormField[] {
  return fields.map((f, i) => ({
    id: f.id || `field_${i}`,
    fieldName: f.fieldName || `Field ${i + 1}`,
    bengaliName: f.bengaliName || f.fieldName || `ক্ষেত্র ${i + 1}`,
    currentValue: '',
    fieldType: f.fieldType || 'text',
    required: f.required !== false,
    category: f.category || 'other',
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const images: string[] = body.images || []
    const formType: string = body.formType || ''

    if (images.length === 0) {
      return NextResponse.json({ success: false, error: 'No images provided' }, { status: 400 })
    }

    // ── Priority 1: Ollama local (gemma3:4b) ──────────────────────────────
    if (OLLAMA_URL) {
      console.log(`[analyze-form] Trying Ollama (${OLLAMA_MODEL}) with ${images.length} image(s)...`)
      const rawText = await callOllamaVision(ANALYZE_PROMPT, images)

      if (rawText) {
        const parsed = parseGemmaJSON<{ formTitle?: string; fields: FormField[] }>(rawText)
        if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
          const cleanedFields = cleanFields(parsed.fields)
          const requiredDocuments = deriveRequiredDocuments(cleanedFields, formType)
          console.log(`[analyze-form] Ollama extracted ${cleanedFields.length} fields`)
          return NextResponse.json({
            success: true,
            formTitle: parsed.formTitle || '',
            fields: cleanedFields,
            fieldCount: cleanedFields.length,
            requiredDocuments,
            backend: 'ollama',
          })
        }
        console.warn('[analyze-form] Ollama response could not be parsed:', rawText.slice(0, 300))
      } else {
        console.warn('[analyze-form] Ollama unavailable or returned null — is Ollama running?')
        console.warn(`[analyze-form] Start Ollama: ollama serve  |  Pull model: ollama pull ${OLLAMA_MODEL}`)
      }
    }

    // ── Priority 2: Local Python Gemma server ─────────────────────────────
    if (process.env.PYTHON_SERVER_URL) {
      const pyResult = await callPythonServer('/analyze-form', { images, imageCount: images.length })
      if (pyResult?.success) {
        const reqDocs = deriveRequiredDocuments(pyResult.fields || [], formType)
        return NextResponse.json({ ...pyResult, requiredDocuments: reqDocs, backend: 'python-gemma4' })
      }
      console.warn('[analyze-form] Python server unavailable, trying Gemini API...')
    }

    // ── Priority 3: Google Gemini API ─────────────────────────────────────
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: OLLAMA_URL
          ? `Ollama চালু নেই। PowerShell-এ চালান: ollama serve`
          : 'AI service not configured. Set OLLAMA_URL or GEMINI_API_KEY in .env.local',
        hint: `ollama pull ${OLLAMA_MODEL}  then  ollama serve`,
      }, { status: 503 })
    }

    const model = getModel(true)
    const imageParts = images.map(dataUrlToInlineData)
    console.log(`[analyze-form] Calling Gemini Flash with ${images.length} image(s)...`)

    const result = await withRetry(() => model.generateContent([ANALYZE_PROMPT, ...imageParts]))
    const rawText = result.response.text()
    console.log('[analyze-form] Raw Gemini response:', rawText.slice(0, 300))

    const parsed = parseGemmaJSON<{ formTitle?: string; fields: FormField[] }>(rawText)
    if (!parsed || !Array.isArray(parsed.fields) || parsed.fields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not read the form. Please ensure the image is clear and try again.',
        rawResponse: rawText.slice(0, 200),
      }, { status: 422 })
    }

    const cleanedFields = cleanFields(parsed.fields)
    const requiredDocuments = deriveRequiredDocuments(cleanedFields, formType)
    console.log(`[analyze-form] Gemini extracted ${cleanedFields.length} fields`)

    return NextResponse.json({
      success: true,
      formTitle: parsed.formTitle || '',
      fields: cleanedFields,
      fieldCount: cleanedFields.length,
      requiredDocuments,
      backend: 'gemini',
    })

  } catch (error: any) {
    console.error('[analyze-form] ERROR:', error?.message || error)

    if (isApiBlockedError(error)) {
      console.warn('[analyze-form] API blocked (403) — returning demo data')
      const body = await request.clone().json().catch(() => ({}))
      return NextResponse.json(buildDemoFormResponse(body.formType || ''))
    }

    if (isRateLimitError(error)) {
      return NextResponse.json({
        success: false,
        error: QUOTA_MSG_BN,
        errorEn: QUOTA_MSG_EN,
        isQuotaError: true,
      }, { status: 429 })
    }

    return NextResponse.json({
      success: false,
      error: `ফর্ম পড়তে সমস্যা: ${error?.message || 'Unknown error'}`,
    }, { status: 500 })
  }
}

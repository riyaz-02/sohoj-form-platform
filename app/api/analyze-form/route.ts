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
  /** Vertical position on form image as percentage from top (0–100). Used for bbox highlighting. */
  yPercent?: number
}

// ── Shared analysis prompt (works with Ollama + Gemini) ───────────────────

const ANALYZE_PROMPT = `You are an OCR system for Indian government forms. Analyze the form image and extract ALL blank fields.

Return ONLY this JSON (no markdown, no explanation):
{"formTitle":"form title","fields":[{"id":"snake_case_id","fieldName":"English label","bengaliName":"Bengali label","currentValue":"","fieldType":"text","required":true,"category":"personal","yPercent":15}]}

yPercent = approximate vertical position of the field label on the form image, as a percentage from the TOP (0 = very top, 100 = very bottom). First field ~10%, last field ~90%.
fieldType options: text, date, number, checkbox, select
category options: personal, land, financial, other
Bengali translations: Name→নাম, Aadhaar→আধার নম্বর, DOB→জন্ম তারিখ, Father→পিতার নাম, Bank Account→অ্যাকাউন্ট নম্বর, IFSC→IFSC কোড, Village→গ্রাম, District→জেলা, Mobile→মোবাইল নম্বর, Income→আয়, Gender→লিঙ্গ, Address→ঠিকানা

Rules: Include every blank field. Never include pre-filled values. Return ONLY valid JSON.`

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
    // Preserve yPercent if the model returned a valid value, else undefined
    yPercent: (typeof f.yPercent === 'number' && f.yPercent >= 0 && f.yPercent <= 100)
      ? f.yPercent
      : undefined,
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
        // Ollama sometimes returns a bare array [fields] instead of {formTitle, fields}
        // normalise both shapes into a consistent {formTitle, fields} structure
        const parsed = parseGemmaJSON<{ formTitle?: string; fields: FormField[] } | FormField[]>(rawText)

        let fields: FormField[] | null = null
        let formTitle = ''

        if (Array.isArray(parsed) && parsed.length > 0) {
          // Bare array response — treat directly as fields
          fields = parsed as FormField[]
          console.log('[analyze-form] Ollama returned bare array — treating as fields list')
        } else if (parsed && !Array.isArray(parsed) && Array.isArray((parsed as any).fields)) {
          fields = (parsed as any).fields
          formTitle = (parsed as any).formTitle || ''
        }

        if (fields && fields.length > 0) {
          const cleanedFields = cleanFields(fields)
          const requiredDocuments = deriveRequiredDocuments(cleanedFields, formType)
          console.log(`[analyze-form] Ollama extracted ${cleanedFields.length} fields`)
          return NextResponse.json({
            success: true,
            formTitle,
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

import { NextRequest, NextResponse } from 'next/server'
import {
  callOllamaText, getModel, parseGemmaJSON,
  callPythonServer, OLLAMA_URL, OLLAMA_MODEL,
} from '@/lib/gemma'

/**
 * POST /api/voice-turn
 *
 * Backend priority:
 *   1. Ollama (local gemma3:4b) — set OLLAMA_URL in .env.local
 *   2. Python server            — set PYTHON_SERVER_URL in .env.local
 *   3. Google Gemini API        — set GEMINI_API_KEY in .env.local
 *   4. Mock mode                — no config needed
 */

interface VoiceTurnRequest {
  currentFieldId: string
  currentFieldName: string
  currentFieldBengali: string
  fieldType?: string
  userSpeech: string
  transcript: { role: 'ai' | 'user'; text: string }[]
  remainingFields: { id: string; fieldName: string; bengaliName: string; questionEn: string; questionBn: string }[]
}

// ── Shared extraction prompt ───────────────────────────────────────────────

function buildVoicePrompt(
  currentFieldName: string,
  currentFieldBengali: string,
  fieldType: string,
  userSpeech: string,
): string {
  return `You are helping fill an Indian government form. The applicant has spoken their answer in Bengali or English (transcribed below).

Field being answered: "${currentFieldName}" (${currentFieldBengali})
Field type: ${fieldType}
What the applicant said: "${userSpeech}"

Task: Extract a clean, properly formatted value for this field from what was said.

Rules:
- For numbers/amounts: extract just the number (e.g., "seventy two thousand" → "72000")
- For dates: format as DD/MM/YYYY
- For names: title case
- For Aadhaar/PAN/ID numbers: extract the number only
- For income: format as "₹X,XXX"
- If the answer is unclear or incomplete, set needsClarification=true
- Keep it SHORT and FACTUAL — just the value, no extra text

Return JSON only:
{
  "extractedValue": "the clean extracted value",
  "needsClarification": false,
  "clarificationQuestion": null
}`
}

export async function POST(request: NextRequest) {
  try {
    const body: VoiceTurnRequest = await request.json()
    const {
      currentFieldId,
      currentFieldName,
      currentFieldBengali,
      fieldType = 'text',
      userSpeech,
      remainingFields = [],
    } = body

    const prompt = buildVoicePrompt(currentFieldName, currentFieldBengali, fieldType, userSpeech)

    // ── Priority 1: Ollama local (gemma3:4b) ──────────────────────────────
    if (OLLAMA_URL) {
      console.log(`[voice-turn] Trying Ollama (${OLLAMA_MODEL}) for field: ${currentFieldName}`)
      const rawText = await callOllamaText(prompt)

      if (rawText) {
        const parsed = parseGemmaJSON<{
          extractedValue: string
          needsClarification: boolean
          clarificationQuestion: string | null
        }>(rawText)

        const extractedValue = parsed?.extractedValue || userSpeech
        const currentIdx = remainingFields.findIndex((f) => f.id === currentFieldId)
        const nextField = currentIdx >= 0 ? remainingFields[currentIdx + 1] : null

        console.log(`[voice-turn] Ollama extracted: "${extractedValue}" for ${currentFieldName}`)

        return NextResponse.json({
          success: true,
          fieldId: currentFieldId,
          extractedValue,
          needsClarification: parsed?.needsClarification || false,
          clarificationQuestion: parsed?.clarificationQuestion || null,
          nextQuestion: nextField
            ? { en: nextField.questionEn, bn: nextField.questionBn, fieldId: nextField.id }
            : null,
          isComplete: !nextField,
          backend: 'ollama',
        })
      }

      console.warn(`[voice-turn] Ollama unavailable — run: ollama serve && ollama pull ${OLLAMA_MODEL}`)
    }

    // ── Priority 2: Local Python server ───────────────────────────────────
    if (process.env.PYTHON_SERVER_URL) {
      const pyResult = await callPythonServer('/voice-turn', body)
      if (pyResult?.success) {
        return NextResponse.json({ ...pyResult, backend: 'python-gemma4' })
      }
      console.warn('[voice-turn] Python server unavailable, trying Gemini API...')
    }

    // ── Priority 3: Google Gemini API ─────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      const model = getModel(false)
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseGemmaJSON<{
        extractedValue: string
        needsClarification: boolean
        clarificationQuestion: string | null
      }>(text)

      const extractedValue = parsed?.extractedValue || userSpeech
      const currentIdx = remainingFields.findIndex((f) => f.id === currentFieldId)
      const nextField = currentIdx >= 0 ? remainingFields[currentIdx + 1] : null

      return NextResponse.json({
        success: true,
        fieldId: currentFieldId,
        extractedValue,
        needsClarification: parsed?.needsClarification || false,
        clarificationQuestion: parsed?.clarificationQuestion || null,
        nextQuestion: nextField
          ? { en: nextField.questionEn, bn: nextField.questionBn, fieldId: nextField.id }
          : null,
        isComplete: !nextField,
        backend: 'gemini',
      })
    }

    // ── Priority 4: Smart mock (no config) ────────────────────────────────
    console.warn('[voice-turn] No AI backend available — using smart mock')
    await new Promise((r) => setTimeout(r, 500))

    const MOCK: Record<string, string> = {
      'voice-1': 'Financial difficulty due to crop failure',
      'voice-2': '₹72,000 per year',
      'voice-3': '4 family members',
    }
    const extractedValue = MOCK[currentFieldId] || userSpeech || 'Noted'
    const currentIdx = remainingFields.findIndex((f) => f.id === currentFieldId)
    const nextField = currentIdx >= 0 ? remainingFields[currentIdx + 1] : null

    return NextResponse.json({
      success: true,
      fieldId: currentFieldId,
      extractedValue,
      needsClarification: false,
      nextQuestion: nextField
        ? { en: nextField.questionEn, bn: nextField.questionBn, fieldId: nextField.id }
        : null,
      isComplete: !nextField,
      backend: 'mock',
    })

  } catch (error: any) {
    console.error('[voice-turn]', error?.message || error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process voice turn',
      extractedValue: '',
      isComplete: false,
    }, { status: 500 })
  }
}

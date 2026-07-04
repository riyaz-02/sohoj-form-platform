/**
 * Gemma / Ollama client for Sohoj Form
 *
 * Supports three backends — priority order:
 *
 *   1. Ollama (local — RECOMMENDED, free, no quota)
 *      Install: https://ollama.com/download
 *      Pull:    ollama pull gemma3:4b
 *      Set:     OLLAMA_URL=http://localhost:11434
 *               OLLAMA_MODEL=gemma3:4b
 *
 *   2. Local Python server (python-server/main.py)
 *      Set PYTHON_SERVER_URL=http://localhost:8000
 *
 *   3. Google Gemini API (cloud fallback)
 *      Set GEMINI_API_KEY in .env.local
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Environment ────────────────────────────────────────────────────────────
export const OLLAMA_URL   = (process.env.OLLAMA_URL   || '').replace(/\/$/, '')
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL  || 'gemma3:4b'
export const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || ''

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ── Google AI Studio model names ───────────────────────────────────────────
export const MODEL_VISION   = 'gemini-2.0-flash'
export const MODEL_TEXT     = 'gemini-2.0-flash'
export const MODEL_FALLBACK = 'gemini-2.0-flash-lite'

/** Get a Google AI Studio model instance */
export function getModel(useVision = false) {
  return genAI.getGenerativeModel({
    model: useVision ? MODEL_VISION : MODEL_TEXT,
    generationConfig: { temperature: 0.1, topP: 0.8, maxOutputTokens: 2048 },
  })
}

export function getFallbackModel() {
  return genAI.getGenerativeModel({
    model: MODEL_FALLBACK,
    generationConfig: { temperature: 0.1, topP: 0.8, maxOutputTokens: 2048 },
  })
}

// ── Ollama helpers ─────────────────────────────────────────────────────────

/**
 * Check if Ollama is running and has the required model loaded.
 */
export async function isOllamaReady(): Promise<boolean> {
  if (!OLLAMA_URL) return false
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return false
    const data = await res.json()
    // Check if our model is available
    const models: Array<{ name: string }> = data.models || []
    const modelBase = OLLAMA_MODEL.split(':')[0]
    return models.some((m) => m.name.startsWith(modelBase) || m.name.startsWith(OLLAMA_MODEL))
  } catch {
    return false
  }
}

/**
 * Call Ollama with a text-only prompt.
 * Returns the response text or null if Ollama is unavailable.
 */
export async function callOllamaText(prompt: string): Promise<string | null> {
  if (!OLLAMA_URL) return null
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, top_p: 0.8, num_predict: 2048 },
      }),
      signal: AbortSignal.timeout(120_000), // 2 min for local inference
    })
    if (!res.ok) {
      console.error('[Ollama] Text request failed:', res.status, await res.text())
      return null
    }
    const data = await res.json()
    return data.response || null
  } catch (err: any) {
    console.error('[Ollama] Text request error:', err?.message)
    return null
  }
}

/**
 * Call Ollama with a vision prompt (image + text).
 * @param prompt     The instruction prompt
 * @param imageDataUrl  data:image/...;base64,... string (or raw base64)
 * Returns the response text or null if Ollama is unavailable.
 */
export async function callOllamaVision(prompt: string, imageDataUrls: string[]): Promise<string | null> {
  if (!OLLAMA_URL) return null
  try {
    // Extract raw base64 from data URLs
    const images = imageDataUrls.map((url) => {
      if (url.includes(',')) return url.split(',')[1]
      return url // already raw base64
    })

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        images,
        stream: false,
        options: { temperature: 0.1, top_p: 0.8, num_predict: 3000 },
      }),
      signal: AbortSignal.timeout(600_000), // 10 min for vision inference (CPU ~8 t/s)
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[Ollama] Vision request failed:', res.status, errText)
      // If model doesn't support vision, try text-only
      if (errText.includes('does not support') || errText.includes('vision')) {
        console.warn('[Ollama] Model may not support vision — check OLLAMA_MODEL')
      }
      return null
    }

    const data = await res.json()
    return data.response || null
  } catch (err: any) {
    console.error('[Ollama] Vision request error:', err?.message)
    return null
  }
}

// ── Python server helpers ──────────────────────────────────────────────────

export async function isPythonServerReady(): Promise<boolean> {
  if (!PYTHON_SERVER_URL) return false
  try {
    const res = await fetch(`${PYTHON_SERVER_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    const data = await res.json()
    return data.model_loaded === true
  } catch {
    return false
  }
}

export async function callPythonServer(endpoint: string, body: object): Promise<any | null> {
  if (!PYTHON_SERVER_URL) return null
  try {
    const res = await fetch(`${PYTHON_SERVER_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────

/** Convert a base64 data URL to the inline format Gemini Vision expects */
export function dataUrlToInlineData(dataUrl: string) {
  const [header, base64] = dataUrl.split(',')
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  return { inlineData: { data: base64, mimeType } }
}

/** Parse JSON from model output — strips markdown code fences, handles arrays, recovers truncation */
export function parseGemmaJSON<T>(text: string): T | null {
  // Step 1: strip markdown code fences (```json ... ```)
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  // Step 2: try direct parse (handles complete JSON)
  try { return JSON.parse(cleaned) as T } catch { /* continue */ }

  // Step 3: extract first complete {...} or [...] block
  const objMatch   = cleaned.match(/\{[\s\S]*\}/)
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  const candidates = [objMatch?.[0], arrayMatch?.[0]]
    .filter(Boolean)
    .sort((a, b) => cleaned.indexOf(a!) - cleaned.indexOf(b!))
  for (const c of candidates) {
    try { return JSON.parse(c!) as T } catch { /* next */ }
  }

  // Step 4: smart truncation recovery
  // The model cut off mid-object (e.g. inside a string value).
  // Find the last COMPLETE object boundary (last `},` or `}\n` or `}]`)
  // and reconstruct a valid array from everything before it.
  const lastCompleteObj = /\}\s*[,\]\n]/g
  let lastIdx = -1
  let m: RegExpExecArray | null
  while ((m = lastCompleteObj.exec(cleaned)) !== null) lastIdx = m.index + 1

  if (lastIdx > 0) {
    // Find the outermost `[` before the first `{`
    const arrayStart = cleaned.indexOf('[')
    if (arrayStart >= 0 && arrayStart < lastIdx) {
      const partial = cleaned.slice(arrayStart, lastIdx) + ']'
      try {
        const result = JSON.parse(partial) as T
        console.warn('[parseGemmaJSON] Recovered', (result as any)?.length ?? '?', 'items from truncated response')
        return result
      } catch { /* not an array */ }
    }
    // Try as object-only (wrap content up to last complete field)
    const objStart = cleaned.indexOf('{')
    if (objStart >= 0) {
      const partial = cleaned.slice(objStart, lastIdx) + '}'
      try { return JSON.parse(partial) as T } catch { /* give up */ }
    }
  }

  return null
}

export { genAI }

// ── Rate-limit retry helper ────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 3000,
): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      lastError = err
      const is429 = err?.status === 429 ||
                    err?.message?.includes('429') ||
                    err?.message?.toLowerCase().includes('quota') ||
                    err?.message?.toLowerCase().includes('rate limit')
      if (!is429 || attempt === maxRetries) throw err
      const delay = baseDelayMs * Math.pow(2, attempt)
      console.warn(`[Gemini] 429 rate limit — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

export const QUOTA_MSG_BN = 'AI এখন ব্যস্ত। ৩০ সেকেন্ড অপেক্ষা করে আবার চেষ্টা করুন।'
export const QUOTA_MSG_EN = 'AI is busy. Please wait 30 seconds and try again.'

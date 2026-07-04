/**
 * GET /api/tts?text=...&lang=bn
 *
 * Server-side Bengali TTS proxy.
 * Fetches audio from Google Translate TTS (same voice as translate.google.com),
 * streams it back to the client as audio/mpeg.
 *
 * Why server-side?
 *   Browser Web Speech API depends on OS-installed voices — not reliable.
 *   Server TTS works identically on every device, OS, browser.
 *
 * Cache: responses are cached for 24h (CDN-friendly) since AGENT_LINES are static.
 */

import { NextRequest, NextResponse } from 'next/server'

// Supported languages
const LANG_MAP: Record<string, string> = {
  bn: 'bn',   // Bengali
  hi: 'hi',   // Hindi (fallback)
  en: 'en',   // English (always works)
}

// Google Translate TTS has a ~200 char limit per request
const MAX_CHUNK = 190

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text]

  const chunks: string[] = []
  // Split on Bengali sentence boundary (।) or punctuation
  const sentences = text.split(/(?<=[।.!?,])\s*/)
  let current = ''

  for (const s of sentences) {
    if ((current + s).length > MAX_CHUNK) {
      if (current) chunks.push(current.trim())
      current = s
    } else {
      current += (current ? ' ' : '') + s
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.length > 0 ? chunks : [text.slice(0, MAX_CHUNK)]
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const text = searchParams.get('text')?.trim()
  const lang = LANG_MAP[searchParams.get('lang') || 'bn'] || 'bn'

  if (!text) {
    return NextResponse.json({ error: 'text param required' }, { status: 400 })
  }

  try {
    const chunks = chunkText(text)

    // Fetch all chunks in parallel
    const audioChunks = await Promise.all(
      chunks.map(async (chunk) => {
        const url =
          `https://translate.google.com/translate_tts` +
          `?ie=UTF-8` +
          `&q=${encodeURIComponent(chunk)}` +
          `&tl=${lang}` +
          `&client=tw-ob` +
          `&ttsspeed=0.85`

        const res = await fetch(url, {
          headers: {
            // Required — Google blocks requests without a UA
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://translate.google.com/',
          },
          signal: AbortSignal.timeout(8000),
        })

        if (!res.ok) throw new Error(`gTTS ${res.status}: ${chunk}`)
        return Buffer.from(await res.arrayBuffer())
      })
    )

    // Concatenate all MP3 chunks into one response
    const combined = Buffer.concat(audioChunks)

    return new Response(combined, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(combined.byteLength),
        // Cache 1 day on CDN — AGENT_LINES text is static
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    })
  } catch (err: any) {
    console.error('[/api/tts] error:', err.message)
    // Return 503 — client will fall back to browser TTS
    return NextResponse.json(
      { error: 'TTS service unavailable', detail: err.message },
      { status: 503 }
    )
  }
}

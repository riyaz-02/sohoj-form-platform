'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX, X } from 'lucide-react'

// ── Audio cache ─────────────────────────────────────────────────────────────
// Caches Audio objects keyed by text so the same line isn't re-fetched
const audioCache = new Map<string, HTMLAudioElement>()

// ── speakText — server-side TTS with browser fallback ─────────────────────

export async function speakText(bn: string, en?: string): Promise<void> {
  if (typeof window === 'undefined' || !bn.trim()) return

  // Stop any currently playing audio
  stopSpeaking()

  try {
    // ── Primary: server-side Google TTS (works on every device) ──────────
    const cacheKey = `bn:${bn}`
    let audio = audioCache.get(cacheKey)

    if (!audio) {
      const url = `/api/tts?text=${encodeURIComponent(bn)}&lang=bn`
      audio = new Audio(url)
      audio.preload = 'auto'
      audioCache.set(cacheKey, audio)
    } else {
      // Rewind cached audio
      audio.currentTime = 0
    }

    _currentAudio = audio

    await new Promise<void>((resolve, reject) => {
      const onEnd   = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); reject(new Error('audio error')) }
      audio!.addEventListener('ended',  onEnd,   { once: true })
      audio!.addEventListener('error',  onError, { once: true })
      const cleanup = () => {
        audio!.removeEventListener('ended',  onEnd)
        audio!.removeEventListener('error', onError)
      }
      audio!.play().catch(reject)
    })

    return // success — browser TTS not needed
  } catch (err) {
    console.warn('[TTS] Server TTS failed, trying browser TTS:', err)
  }

  // ── Fallback: browser Web Speech API ─────────────────────────────────
  await browserSpeak(bn, en)
}

// ─── Currently playing audio element (for stop) ───────────────────────────
let _currentAudio: HTMLAudioElement | null = null

export function stopSpeaking() {
  if (_currentAudio) {
    _currentAudio.pause()
    _currentAudio.currentTime = 0
    _currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
}

// ── Browser TTS fallback ──────────────────────────────────────────────────

async function browserSpeak(bn: string, en?: string): Promise<void> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  const voices = await getVoices()
  const { voice, lang, text } = pickVoiceAndText(voices, bn, en)

  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = lang.startsWith('bn') ? 0.82 : 0.9
    u.pitch = 1.05
    u.volume = 1.0
    if (voice) u.voice = voice
    u.onend = () => resolve()
    u.onerror = () => resolve() // resolve even on error — don't block UI
    window.speechSynthesis.speak(u)
  })
}

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined') return Promise.resolve([])
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) { resolve(v); return }
    window.speechSynthesis.onvoiceschanged = () =>
      resolve(window.speechSynthesis.getVoices())
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
  })
}

function pickVoiceAndText(
  voices: SpeechSynthesisVoice[],
  bn: string,
  en?: string,
): { voice: SpeechSynthesisVoice | null; lang: string; text: string } {
  const hasBn = voices.some((v) => v.lang.startsWith('bn') || v.name.toLowerCase().includes('bengali'))
  const hasHi = voices.some((v) => v.lang.startsWith('hi'))

  if (hasBn) {
    const voice = voices.find((v) => v.lang === 'bn-IN') ||
                  voices.find((v) => v.lang.startsWith('bn')) ||
                  null
    return { voice, lang: 'bn-IN', text: bn }
  }
  if (hasHi) {
    const voice = voices.find((v) => v.lang === 'hi-IN') || null
    // Speak English text with Hindi voice (sounds better than English-only)
    return { voice, lang: 'hi-IN', text: en || bn }
  }
  // English always works
  const voice = voices.find((v) => v.lang === 'en-IN') ||
                voices.find((v) => v.lang.startsWith('en')) ||
                null
  return { voice, lang: 'en-US', text: en || bn }
}

// ── Prefetch common lines on idle ─────────────────────────────────────────

export function prefetchTTSLines(lines: string[]) {
  if (typeof window === 'undefined') return
  const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000))
  schedule(() => {
    lines.forEach((bn) => {
      if (!audioCache.has(`bn:${bn}`)) {
        const url = `/api/tts?text=${encodeURIComponent(bn)}&lang=bn`
        const a = new Audio(url)
        a.preload = 'auto'
        audioCache.set(`bn:${bn}`, a)
      }
    })
  })
}

// ── VoiceGuideBar component ───────────────────────────────────────────────

interface VoiceGuideBarProps {
  text: string
  textEn?: string
  isSpeaking: boolean
  onDismiss?: () => void
  onMute?: (muted: boolean) => void
}

export function VoiceGuideBar({ text, textEn, isSpeaking, onDismiss, onMute }: VoiceGuideBarProps) {
  const [muted, setMuted] = useState(false)
  const [visible, setVisible] = useState(false)
  // Estimate speech duration: ~5 chars/sec for Bengali TTS
  const estimatedDuration = Math.max(3, Math.min(text.length / 5, 14))

  useEffect(() => {
    if (text) setVisible(true)
    else {
      const t = setTimeout(() => setVisible(false), 800)
      return () => clearTimeout(t)
    }
  }, [text])

  if (!visible) return null

  const handleMute = () => {
    const next = !muted
    setMuted(next)
    if (next) stopSpeaking()
    onMute?.(next)
  }

  const handleDismiss = () => {
    stopSpeaking()
    setVisible(false)
    onDismiss?.()
  }

  return (
    // Compact pill — bottom-left, doesn't cover center content
    <div className="fixed bottom-20 left-3 z-50 max-w-[260px] voice-guide-enter">
      <div
        className="rounded-2xl overflow-hidden shadow-lg border border-white/8"
        style={{
          background: 'oklch(0.18 0.09 258 / 0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Main content row */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Small avatar dot */}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
            style={{ background: 'oklch(0.72 0.18 65)' }}
          >
            স
          </div>

          {/* Text — single truncated line */}
          <p className="flex-1 min-w-0 text-white/90 text-xs font-medium leading-tight line-clamp-2">
            {text}
          </p>

          {/* Mute / close */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={handleMute}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              {muted
                ? <VolumeX className="w-3 h-3 text-white/30" />
                : <Volume2 className="w-3 h-3 text-white/60" />}
            </button>
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-white/30" />
            </button>
          </div>
        </div>

        {/* Depleting progress bar — reverse countdown while speaking */}
        <div className="h-0.5 w-full" style={{ background: 'oklch(1 0 0 / 0.06)' }}>
          {isSpeaking && !muted && (
            <div
              key={text} /* re-mount on new text to restart animation */
              className="h-full rounded-full"
              style={{
                background: 'oklch(0.72 0.18 65)',
                width: '100%',
                animation: `deplete-bar ${estimatedDuration}s linear forwards`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}


// ── useVoiceGuide hook ────────────────────────────────────────────────────

export function useVoiceGuide() {
  const [currentText, setCurrentText]     = useState('')
  const [currentTextEn, setCurrentTextEn] = useState('')
  const [isSpeaking, setIsSpeaking]       = useState(false)
  const [muted, setMuted]                 = useState(false)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false; stopSpeaking() }
  }, [])

  const say = useCallback(async (bn: string, en?: string) => {
    if (muted || !bn.trim()) return
    if (typeof window === 'undefined') return

    const unlocked = sessionStorage.getItem('sohoj_voice_unlocked')

    setCurrentText(bn)
    setCurrentTextEn(en || '')

    if (unlocked !== 'enabled') {
      // Show text but don't speak until user taps Enable
      return
    }

    setIsSpeaking(true)
    try {
      await speakText(bn, en)
    } finally {
      if (activeRef.current) setIsSpeaking(false)
    }
  }, [muted])

  const silence = useCallback(() => {
    stopSpeaking()
    setIsSpeaking(false)
    setCurrentText('')
    setCurrentTextEn('')
  }, [])

  return { say, silence, currentText, currentTextEn, isSpeaking, muted, setMuted }
}

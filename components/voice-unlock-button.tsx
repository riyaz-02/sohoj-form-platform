'use client'

import { useState, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { speakText, stopSpeaking } from './voice-guide-bar'

const SESSION_KEY = 'sohoj_voice_unlocked'

export function VoiceUnlockButton() {
  const [state, setState] = useState<'hidden' | 'prompt' | 'enabled' | 'disabled'>('hidden')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const prev = sessionStorage.getItem(SESSION_KEY)
    if (prev === 'enabled')   setState('enabled')
    else if (prev === 'disabled') setState('disabled')
    else {
      const t = setTimeout(() => setState('prompt'), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const handleEnable = async () => {
    sessionStorage.setItem(SESSION_KEY, 'enabled')
    setState('enabled')
    // This click IS the user gesture — speak immediately
    // speakText() will auto-detect best available voice (Bengali/Hindi/English)
    await speakText(
      'নমস্কার! ভয়েস গাইড চালু হয়েছে।',
      'Hello! Voice guide is now enabled.'
    )
  }

  const handleDisable = (e: React.MouseEvent) => {
    e.stopPropagation()
    stopSpeaking()
    sessionStorage.setItem(SESSION_KEY, 'disabled')
    setState('disabled')
  }

  const handleReenable = async () => {
    sessionStorage.setItem(SESSION_KEY, 'enabled')
    setState('enabled')
    await speakText('ভয়েস গাইড চালু হয়েছে।', 'Voice guide enabled.')
  }

  if (state === 'prompt') {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center pb-8 px-4"
        style={{ background: 'oklch(0 0 0 / 0.5)', backdropFilter: 'blur(4px)' }}
      >
        <div
          className="w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
          style={{ background: 'oklch(0.20 0.09 258)' }}
        >
          <div className="h-1 w-full" style={{ background: 'oklch(0.72 0.18 65)' }} />
          <div className="p-6 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'oklch(0.72 0.18 65 / 0.15)' }}
            >
              <span className="text-3xl">🔊</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">ভয়েস গাইড</h3>
            <p className="text-white/50 text-xs mb-3">Voice Guide</p>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">
              সহজ ফর্ম আপনাকে গাইড করবে।<br />
              <span className="text-white/40 text-xs">Sohoj Form will speak and guide you.</span>
            </p>
            <button
              onClick={handleEnable}
              className="w-full py-4 rounded-2xl font-bold text-white text-base active:scale-95 mb-3 transition-all"
              style={{ background: 'oklch(0.72 0.18 65)' }}
            >
              🔊 &nbsp; চালু করুন · Enable
            </button>
            <button
              onClick={handleDisable}
              className="w-full py-2 text-sm text-white/30 hover:text-white/50 transition-colors"
            >
              এখন নয় · Skip
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'enabled') {
    return (
      <button
        onClick={handleDisable}
        title="Mute voice guide"
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg active:scale-95 hover:opacity-80 transition-all"
        style={{ background: 'oklch(0.22 0.08 258)', border: '1px solid oklch(1 0 0 / 0.12)' }}
      >
        <Volume2 className="w-3.5 h-3.5" style={{ color: 'oklch(0.72 0.18 65)' }} />
        <span className="text-white/60 text-[10px] font-medium">ভয়েস চালু</span>
      </button>
    )
  }

  if (state === 'disabled') {
    return (
      <button
        onClick={handleReenable}
        title="Enable voice guide"
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg active:scale-95 hover:opacity-80 transition-all"
        style={{ background: 'oklch(0.22 0.08 258)', border: '1px solid oklch(1 0 0 / 0.12)' }}
      >
        <VolumeX className="w-3.5 h-3.5 text-white/30" />
        <span className="text-white/30 text-[10px] font-medium">ভয়েস বন্ধ</span>
      </button>
    )
  }

  return null
}

/**
 * lib/tts.ts — re-exports from voice-guide-bar for backwards compatibility.
 * The core speakText() logic is now centralized in voice-guide-bar.tsx
 * so both the VoiceGuideBar hook and Step 3's direct speak() calls use
 * the same voice detection + fallback logic.
 */

export { speakText as speak, stopSpeaking } from '@/components/voice-guide-bar'

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false
  return window.speechSynthesis.speaking
}

/** Speak a list of items one after another */
export async function speakSequential(
  items: { text: string; textEn?: string }[],
  onItemStart?: (index: number) => void,
  onEnd?: () => void,
): Promise<void> {
  const { speakText } = await import('@/components/voice-guide-bar')
  for (let i = 0; i < items.length; i++) {
    onItemStart?.(i)
    await new Promise<void>((resolve) => {
      speakText(items[i].text, items[i].textEn).then(resolve)
    })
    await new Promise<void>((r) => setTimeout(r, 200))
  }
  onEnd?.()
}

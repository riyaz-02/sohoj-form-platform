'use client'

import Image from 'next/image'
import Link from 'next/link'

/**
 * AppHeader — Sticky top navbar shown on all form-fill steps (/form)
 * Uses the Shohoj Form logo with brand navy background
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10">
      {/* Navy gradient bar */}
      <div
        className="relative flex items-center justify-between px-4 sm:px-6 py-3"
        style={{
          background: 'linear-gradient(135deg, #111E4A 0%, #1B2E6B 60%, #2A3F8F 100%)',
        }}
      >
        {/* Logo + brand name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 shrink-0">
            <Image
              src="/logo.png"
              alt="Shohoj Form"
              fill
              className="object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
              priority
            />
          </div>
          <div className="leading-none">
            <div className="font-bold text-white text-[15px] tracking-tight">Shohoj Form</div>
            <div className="text-[10px] text-white/60 font-medium">ফর্ম ভরার কাজ, এখন হবে Sohoj</div>
          </div>
        </Link>

        {/* Right — step indicator pill */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white/80"
          style={{ background: 'oklch(1 0 0 / 0.08)', border: '1px solid oklch(1 0 0 / 0.12)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#2EC4A7] animate-pulse" />
          AI-Powered Form Assistant
        </div>
      </div>

      {/* Teal accent line at bottom */}
      <div
        className="h-[2px] w-full"
        style={{ background: 'linear-gradient(90deg, #2EC4A7, #1FA88C 50%, transparent)' }}
      />
    </header>
  )
}

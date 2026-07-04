'use client'

import Image from 'next/image'
import Link from 'next/link'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm">
      <div className="relative flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 shrink-0">
            <Image
              src="/logo.png"
              alt="Sohoj Form"
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-200"
              priority
            />
          </div>
          <div className="leading-none">
            <div className="font-bold text-gray-900 text-[15px] tracking-tight">Sohoj Form</div>
            <div className="text-[10px] text-gray-400 font-medium">সহজ ফর্ম · AI Form Assistant</div>
          </div>
        </Link>

        {/* Right badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-gray-600 bg-gray-100 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Gemma 3 · Local AI
        </div>
      </div>

      {/* Brand accent line */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, oklch(0.28 0.085 258), oklch(0.55 0.15 230) 50%, transparent)' }} />
    </header>
  )
}

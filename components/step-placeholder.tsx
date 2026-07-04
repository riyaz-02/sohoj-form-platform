'use client'

import { StepNavigator } from './step-navigator'

interface StepPlaceholderProps {
  stepNumber: number
  title: string
  bengaliTitle: string
  description: string
  bengaliDescription: string
}

/** Kept as a fallback — all steps now use dedicated components */
export function StepPlaceholder({ stepNumber, title, bengaliTitle, description, bengaliDescription }: StepPlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center py-16 animate-fade-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-bold text-xl"
          style={{ background: 'oklch(0.28 0.085 258)' }}
        >
          {stepNumber}
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{title} · {bengaliTitle}</h2>
        <p className="text-muted-foreground text-sm mb-8">{description} · {bengaliDescription}</p>
        <div className="border-2 border-dashed border-border rounded-2xl p-12 bg-muted/20">
          <p className="text-muted-foreground text-sm">
            Step {stepNumber} — Coming Soon · ধাপ {stepNumber} — শীঘ্রই আসছে
          </p>
        </div>
      </div>
      <StepNavigator />
    </div>
  )
}

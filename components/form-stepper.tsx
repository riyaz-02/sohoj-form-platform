'use client'

import { useFormContext } from '@/lib/form-context'
import { Check } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const steps = [
  { number: 1, en: 'Upload Form', bn: 'ফর্ম আপলোড' },
  { number: 2, en: 'Documents',   bn: 'ডকুমেন্ট' },
  { number: 3, en: 'Voice Fill',  bn: 'ভয়েস ফিল' },
  { number: 4, en: 'Review',      bn: 'পর্যালোচনা' },
  { number: 5, en: 'Done',        bn: 'সম্পন্ন' },
]

export function FormStepper() {
  const { currentStep } = useFormContext()
  const { language } = useLanguage()
  const isBengali = language === 'bn'
  const progressPercent = ((currentStep - 1) / (steps.length - 1)) * 100

  return (
    <div className="bg-white border-b border-border sticky top-[56px] z-30 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">

        {/* Step dots + connectors */}
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isDone   = currentStep > step.number
            const isActive = currentStep === step.number
            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Connector line */}
                {index > 0 && (
                  <div className="flex-1 h-[3px] mx-1 rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        background: 'linear-gradient(90deg, #1B2E6B, #2EC4A7)',
                        width: isDone ? '100%' : '0%',
                      }}
                    />
                  </div>
                )}

                {/* Step circle */}
                <div
                  className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
                    isDone
                      ? 'text-white shadow-sm'
                      : isActive
                      ? 'text-white shadow-lg'
                      : 'text-muted-foreground'
                  }`}
                  style={{
                    background: isDone
                      ? '#2EC4A7'
                      : isActive
                      ? 'linear-gradient(135deg, #1B2E6B, #2A3F8F)'
                      : 'oklch(0.93 0.01 248)',
                    ...(isActive ? { boxShadow: '0 0 0 4px oklch(0.70 0.14 182 / 0.20), 0 4px 12px #1B2E6B44' } : {}),
                  }}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.number}

                  {/* Active pulse ring */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-full animate-ping opacity-30"
                      style={{ background: '#2EC4A7' }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Gradient progress bar */}
        <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #1B2E6B 0%, #2EC4A7 100%)',
            }}
          />
        </div>

        {/* Step labels */}
        <div className="grid grid-cols-5 mt-2">
          {steps.map((step) => {
            const isActive = currentStep === step.number
            const isDone   = currentStep > step.number
            return (
              <div
                key={step.number}
                className={`text-center text-[10px] font-medium transition-colors truncate px-0.5 ${
                  isActive
                    ? 'font-bold'
                    : isDone
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/40'
                }`}
                style={isActive ? { color: '#1B2E6B' } : {}}
              >
                {isBengali ? step.bn : step.en}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

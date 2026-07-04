'use client'

import { useFormContext } from '@/lib/form-context'
import { Check } from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

const steps = [
  { number: 1, en: 'Upload', bn: 'ফর্ম আপলোড' },
  { number: 2, en: 'Documents', bn: 'ডকুমেন্ট' },
  { number: 3, en: 'Voice Fill', bn: 'ভয়েস ফিল' },
  { number: 4, en: 'Review', bn: 'পর্যালোচনা' },
  { number: 5, en: 'Done', bn: 'সম্পন্ন' },
]

export function FormStepper() {
  const { currentStep } = useFormContext()
  const { language } = useLanguage()
  const isBengali = language === 'bn'

  return (
    <div className="bg-white border-b border-border sticky top-[57px] z-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5">

        {/* Step dots + connectors */}
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isDone   = currentStep > step.number
            const isActive = currentStep === step.number
            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Connector line */}
                {index > 0 && (
                  <div className="flex-1 h-[2px] mx-1 rounded-full overflow-hidden bg-gray-200">
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
                  className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0 ${
                    isDone ? 'text-white' : isActive ? 'text-white' : 'text-gray-400'
                  }`}
                  style={{
                    background: isDone
                      ? '#2EC4A7'
                      : isActive
                      ? '#1B2E6B'
                      : '#E5E7EB',
                  }}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : step.number}
                  {isActive && (
                    <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: '#2EC4A7' }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Step labels */}
        <div className="grid grid-cols-5 mt-1.5">
          {steps.map((step) => {
            const isActive = currentStep === step.number
            const isDone   = currentStep > step.number
            return (
              <div
                key={step.number}
                className={`text-center text-[10px] font-medium truncate px-0.5 ${
                  isActive ? 'font-bold' : isDone ? 'text-gray-400' : 'text-gray-300'
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

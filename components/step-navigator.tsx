'use client'

import { useFormContext } from '@/lib/form-context'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface StepNavigatorProps {
  nextDisabled?: boolean
  prevDisabled?: boolean
  onNext?: () => void
  onPrev?: () => void
  nextLabel?: string
  prevLabel?: string
}

export function StepNavigator({
  nextDisabled = false,
  prevDisabled = false,
  onNext,
  onPrev,
  nextLabel,
  prevLabel,
}: StepNavigatorProps) {
  const { currentStep, setCurrentStep } = useFormContext()
  const totalSteps = 5

  const handleNext = () => {
    if (onNext) { onNext(); return }
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const handlePrev = () => {
    if (onPrev) { onPrev(); return }
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="flex items-center justify-between gap-4 mt-10 pt-6 border-t border-border/60">
      {currentStep > 1 ? (
        <button
          onClick={handlePrev}
          disabled={prevDisabled}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold text-foreground hover:bg-muted/50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
          {prevLabel || 'Back · পিছনে'}
        </button>
      ) : (
        <div />
      )}

      {currentStep < totalSteps && (
        <button
          onClick={handleNext}
          disabled={nextDisabled}
          className="btn-primary flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={nextDisabled ? { background: 'oklch(0.75 0.02 248)', boxShadow: 'none', transform: 'none' } : {}}
        >
          {nextLabel || 'Next · পরবর্তী'}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

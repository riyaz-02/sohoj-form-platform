'use client'

interface LoadingSpinnerProps {
  message?: string
  bengaliMessage?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({
  message = 'Processing...',
  bengaliMessage = 'প্রক্রিয়াকরণ হচ্ছে...',
  size = 'md',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'py-8',
    md: 'py-16',
    lg: 'py-24',
  }

  return (
    <div className={`flex flex-col items-center justify-center ${sizeMap[size]} animate-fade-in`}>
      {/* Animated ring */}
      <div className="relative w-16 h-16 mb-6">
        <div
          className="absolute inset-0 rounded-full border-4 border-border"
        />
        <div
          className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: 'oklch(0.28 0.085 258)', borderTopColor: 'transparent' }}
        />
        <div
          className="absolute inset-2 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: 'oklch(0.72 0.18 65)',
            borderTopColor: 'transparent',
            animationDirection: 'reverse',
            animationDuration: '0.8s',
          }}
        />
      </div>

      {/* Dot loader */}
      <div className="dot-loader flex gap-1.5 mb-4" style={{ color: 'oklch(0.28 0.085 258)' }}>
        <span />
        <span />
        <span />
      </div>

      <p className="text-sm font-semibold text-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">{bengaliMessage}</p>
    </div>
  )
}

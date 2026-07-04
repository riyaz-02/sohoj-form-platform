'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { ArrowLeft, Loader2, Phone, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { auth, signInWithPhoneNumber, type ConfirmationResult } from '@/lib/firebase'
import { RecaptchaVerifier } from 'firebase/auth'

const FIREBASE_CONFIGURED =
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'your_api_key_here'

export default function LoginPage() {
  const router = useRouter()
  const { language } = useLanguage()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoOtp, setDemoOtp] = useState('')

  const confirmationRef = useRef<ConfirmationResult | null>(null)
  // reCAPTCHA verifier lives inside the component — NEVER in a module
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const otp = otpDigits.join('')
  const L = (en: string, bn: string) => language === 'bn' ? bn : en

  // Cleanup reCAPTCHA when component unmounts
  useEffect(() => {
    return () => {
      try { recaptchaRef.current?.clear() } catch { /* ignore */ }
      recaptchaRef.current = null
    }
  }, [])

  /** Create fresh RecaptchaVerifier each time (must be DOM-ready) */
  const getVerifier = (): RecaptchaVerifier => {
    // Clear stale verifier
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear() } catch { /* ignore */ }
      recaptchaRef.current = null
    }
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => { /* reCAPTCHA solved */ },
      'expired-callback': () => {
        try { recaptchaRef.current?.clear() } catch { /* ignore */ }
        recaptchaRef.current = null
      },
    })
    recaptchaRef.current = verifier
    return verifier
  }

  // ─── Send OTP ──────────────────────────────────────────────
  const handleSendOTP = async () => {
    setError('')
    const digits = phoneNumber.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError(L('Enter a valid 10-digit number', 'সঠিক ১০ সংখ্যার নম্বর দিন'))
      return
    }

    setLoading(true)
    try {
      if (FIREBASE_CONFIGURED) {
        const fullNumber = `+91${digits}`
        const verifier = getVerifier()

        // Render the invisible widget first
        await verifier.render()

        const confirmation = await signInWithPhoneNumber(auth, fullNumber, verifier)
        confirmationRef.current = confirmation
        setOtpDigits(['', '', '', '', '', ''])
        setStep('otp')
        setTimeout(() => otpRefs.current[0]?.focus(), 150)
      } else {
        // Demo mode
        const res = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed'); return }
        setDemoOtp(data.otp || '')
        setStep('otp')
        setTimeout(() => otpRefs.current[0]?.focus(), 150)
      }
    } catch (err: any) {
      // Clear broken verifier
      try { recaptchaRef.current?.clear() } catch { /* ignore */ }
      recaptchaRef.current = null

      const code: string = err?.code || ''
      console.error('[OTP error]', code, err?.message)

      if (code === 'auth/invalid-phone-number') {
        setError(L('Invalid phone number', 'ফোন নম্বর ফরম্যাট ভুল'))
      } else if (code === 'auth/too-many-requests') {
        setError(L('Too many attempts. Try after 10 minutes.', 'অনেক চেষ্টা হয়েছে। ১০ মিনিট পর আবার চেষ্টা করুন।'))
      } else if (code === 'auth/captcha-check-failed' || code === 'auth/web-storage-unsupported') {
        setError(L('Browser security check failed. Use Chrome.', 'ব্রাউজার চেক ব্যর্থ হয়েছে। Chrome ব্যবহার করুন।'))
      } else if (code === 'auth/operation-not-allowed') {
        setError(L('Phone auth not enabled in Firebase Console.', 'Firebase Console-এ Phone auth চালু করুন।'))
      } else {
        setError(L(`Could not send OTP (${code || 'network error'})`, `OTP পাঠানো যায়নি (${code || 'network error'})`))
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify OTP ─────────────────────────────────────────────
  const verifyOtp = async (code: string) => {
    if (code.length < 6) return
    setLoading(true); setError('')
    try {
      if (FIREBASE_CONFIGURED && confirmationRef.current) {
        const result = await confirmationRef.current.confirm(code)
        localStorage.setItem('firebase_uid', result.user.uid)
        router.push('/dashboard')
      } else {
        if (code !== demoOtp) {
          setError(L('Wrong OTP. Try again.', 'OTP ভুল হয়েছে।'))
          setLoading(false); return
        }
        router.push('/dashboard')
      }
    } catch (err: any) {
      const c = err?.code || ''
      if (c === 'auth/invalid-verification-code') setError(L('Wrong OTP.', 'OTP ভুল।'))
      else if (c === 'auth/code-expired') setError(L('OTP expired. Resend.', 'OTP মেয়াদ শেষ। পুনরায় পাঠান।'))
      else setError(L('Verification failed.', 'যাচাই ব্যর্থ হয়েছে।'))
      setLoading(false)
    }
  }

  const handleOtpDigit = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otpDigits]; next[index] = val.slice(-1)
    setOtpDigits(next); setError('')
    if (val && index < 5) otpRefs.current[index + 1]?.focus()
    if (val && index === 5 && next.join('').length === 6) {
      setTimeout(() => verifyOtp(next.join('')), 100)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (p.length === 6) { setOtpDigits(p.split('')); otpRefs.current[5]?.focus(); setTimeout(() => verifyOtp(p), 80) }
    e.preventDefault()
  }

  const resetToPhone = () => {
    setStep('phone'); setOtpDigits(['', '', '', '', '', '']); setError(''); setDemoOtp('')
    try { recaptchaRef.current?.clear() } catch { /* ignore */ }
    recaptchaRef.current = null
  }

  return (
    <main className="min-h-screen bg-background flex">
      {/* REQUIRED: invisible reCAPTCHA mount point */}
      <div id="recaptcha-container" className="fixed bottom-0 right-0 z-50" />

      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, oklch(0.20 0.09 258) 0%, oklch(0.30 0.085 258) 60%, oklch(0.26 0.085 270) 100%)' }}
      >
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 -translate-y-1/3 translate-x-1/3" style={{ background: 'oklch(0.72 0.18 65)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-10 translate-y-1/3 -translate-x-1/3" style={{ background: 'oklch(0.72 0.18 65)' }} />
        <div className="flex items-center gap-3 relative z-10">
          <Image src="/logo.png" alt="Sohoj Form" width={48} height={48} className="rounded-2xl" />
          <div><p className="font-bold text-white text-lg leading-none">Sohoj Form</p><p className="text-white/60 text-sm">সহজ ফর্ম</p></div>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-white leading-tight mb-3">
            {L('Government Forms\nMade Simple', 'সরকারী ফর্ম\nএখন সহজ')}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            {L('Upload · Speak · Get your filled form', 'আপলোড করুন · কথা বলুন · ফর্ম পান')}
          </p>
          <div className="flex flex-wrap gap-2">
            {['🛍️ Annapurna', '🏥 Ayushman', '🌾 Krishak Bandhu', '📋 Ration Card'].map((s) => (
              <span key={s} className="text-xs font-medium text-white/80 px-3 py-1.5 rounded-full" style={{ background: 'oklch(1 0 0 / 0.12)' }}>{s}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 relative z-10">
          <ShieldCheck className="w-4 h-4 text-white/40" />
          <span className="text-white/40 text-xs">{L('Secure · No data stored', 'নিরাপদ · কোনো ডেটা সংরক্ষণ নেই')}</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-xs">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Image src="/logo.png" alt="Sohoj Form" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-foreground">Sohoj Form</span>
          </div>

          {!FIREBASE_CONFIGURED && (
            <div className="mb-5 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
              <p className="text-xs text-amber-700"><span className="font-bold">Demo mode</span> — OTP shown on screen</p>
            </div>
          )}

          {step === 'phone' ? (
            <div className="animate-fade-in">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'oklch(0.28 0.085 258 / 0.1)' }}>
                  <Phone className="w-8 h-8" style={{ color: 'oklch(0.28 0.085 258)' }} />
                </div>
                <h1 className="text-xl font-bold text-foreground">{L('Enter Mobile Number', 'মোবাইল নম্বর দিন')}</h1>
                <p className="text-sm text-muted-foreground mt-1">{L('You will receive a 6-digit code', '৬ সংখ্যার কোড আসবে')}</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center border-2 border-border rounded-2xl overflow-hidden focus-within:border-primary transition-colors bg-white">
                  <span className="px-4 py-4 text-sm font-bold text-muted-foreground border-r border-border bg-muted/40 shrink-0 select-none">+91</span>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="numeric"
                    placeholder="98765 43210"
                    value={phoneNumber}
                    onChange={(e) => { setPhoneNumber(e.target.value.replace(/\D/g, '')); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    disabled={loading}
                    maxLength={10}
                    className="flex-1 px-4 py-4 text-base font-semibold tracking-widest placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50 bg-white"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4 animate-scale-in">
                  <p className="text-sm text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <button
                id="send-otp-btn"
                onClick={handleSendOTP}
                disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-40 shadow-md"
                style={{ background: 'oklch(0.28 0.085 258)' }}
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />{L('Sending...', 'পাঠানো হচ্ছে...')}</> : L('Send OTP →', 'OTP পাঠান →')}
              </button>

              <p className="text-center text-xs text-muted-foreground/60 mt-5">
                {L('Free · Secure', 'বিনামূল্যে · নিরাপদ')}
              </p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <button onClick={resetToPhone} className="flex items-center gap-1.5 text-sm font-semibold mb-6" style={{ color: 'oklch(0.28 0.085 258)' }}>
                <ArrowLeft className="w-4 h-4" />
                {L('Change number', 'নম্বর বদলান')}
              </button>

              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'oklch(0.28 0.085 258 / 0.1)' }}>
                  <ShieldCheck className="w-8 h-8" style={{ color: 'oklch(0.28 0.085 258)' }} />
                </div>
                <h1 className="text-xl font-bold text-foreground">{L('Enter OTP', 'OTP লিখুন')}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {L('Sent to', 'পাঠানো হয়েছে')} <span className="font-bold text-foreground">+91 {phoneNumber}</span>
                </p>
                {!FIREBASE_CONFIGURED && demoOtp && (
                  <button
                    onClick={() => { setOtpDigits(demoOtp.split('')); otpRefs.current[5]?.focus(); setTimeout(() => verifyOtp(demoOtp), 80) }}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-800"
                  >
                    <span className="text-amber-500">Demo:</span>
                    <span className="font-mono font-bold tracking-widest">{demoOtp}</span>
                    <span className="text-[10px] text-amber-600">tap to fill</span>
                  </button>
                )}
              </div>

              {/* 6 OTP boxes — fixed width, never overflow */}
              <div className="flex justify-center gap-2 mb-2" onPaste={handlePaste}>
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading}
                    className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white transition-all focus:outline-none disabled:opacity-50 shrink-0 ${
                      d ? 'border-primary text-primary bg-primary/5' : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/10'
                    }`}
                  />
                ))}
              </div>

              {otp.length > 0 && !loading && (
                <div className="flex justify-center mb-3">
                  <button onClick={() => { setOtpDigits(['','','','','','']); setError(''); otpRefs.current[0]?.focus() }} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RotateCcw className="w-3 h-3" />{L('Clear', 'মুছুন')}
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4 animate-scale-in">
                  <p className="text-sm text-red-600 font-medium text-center">{error}</p>
                </div>
              )}

              <button
                id="verify-otp-btn"
                onClick={() => verifyOtp(otp)}
                disabled={loading || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-95 disabled:opacity-40 shadow-md"
                style={{ background: 'oklch(0.28 0.085 258)' }}
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" />{L('Verifying...', 'যাচাই হচ্ছে...')}</>
                  : <><CheckCircle2 className="w-5 h-5" />{L('Verify', 'যাচাই করুন')}</>}
              </button>

              <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground mb-2">{L("Didn't get the code?", 'কোড পাননি?')}</p>
                <button onClick={resetToPhone} className="text-sm font-bold hover:opacity-70" style={{ color: 'oklch(0.28 0.085 258)' }}>
                  {L('Resend OTP', 'আবার পাঠান')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

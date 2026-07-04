'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import { useLanguage, type Language } from '@/lib/language-context'
import { ChevronDown, Zap, ShieldCheck, Globe, ArrowRight, Check, FileText, Mic, Sparkles } from 'lucide-react'

const LANGUAGES: Language[] = ['en', 'bn', 'hi', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or']

const translations = {
  en: {
    badge: 'AI-Powered · Free',
    title: 'Shohoj Form',
    titleSub: 'সহজ ফর্ম',
    tagline: 'ফর্ম ভরার কাজ, এখন হবে Sohoj',
    subtitle: 'Government Forms Made Simple',
    description:
      'Upload your documents, speak your answers — our AI reads and fills your government forms in minutes.',
    loginBtn: 'Get Started Free',
    feature1Title: 'Smart AI Extraction',
    feature1Desc: 'Upload Aadhaar, PAN, Passbook — fields auto-fill from your documents',
    feature2Title: 'Secure & Private',
    feature2Desc: 'Your data stays on your device. Nothing is stored on our servers.',
    feature3Title: '10 Indian Languages',
    feature3Desc: 'Bengali, Hindi, Tamil, Telugu, Marathi and more',
    step1: 'Upload Form',
    step1Desc: 'Photo of your government form',
    step2: 'Add Documents',
    step2Desc: 'Aadhaar, PAN, Passbook etc.',
    step3: 'Speak Answers',
    step3Desc: 'Fill remaining fields by voice',
    trustLine: 'Helping farmers, families & first-time applicants across India',
    termsText: 'Free to use · No account needed · Works on any device',
  },
  bn: {
    badge: 'AI-চালিত · বিনামূল্যে',
    title: 'সহজ ফর্ম',
    titleSub: 'Shohoj Form',
    tagline: 'ফর্ম ভরার কাজ, এখন হবে Sohoj',
    subtitle: 'সরকারী ফর্ম এখন সহজ',
    description:
      'আপনার নথি আপলোড করুন, কথা বলুন — আমাদের AI মিনিটেই সরকারী ফর্ম পূরণ করবে।',
    loginBtn: 'বিনামূল্যে শুরু করুন',
    feature1Title: 'AI দিয়ে তথ্য বের করুন',
    feature1Desc: 'আধার, PAN বা পাসবুক আপলোড করুন — ফিল্ড স্বয়ংক্রিয়ভাবে পূরণ হবে',
    feature2Title: 'নিরাপদ ও ব্যক্তিগত',
    feature2Desc: 'আপনার ডেটা আপনার ডিভাইসেই থাকে, কোথাও সংরক্ষণ হয় না',
    feature3Title: '১০টি ভারতীয় ভাষা',
    feature3Desc: 'বাংলা, হিন্দি, তামিল, তেলুগু সহ আরও ভাষায় কাজ করে',
    step1: 'ফর্ম আপলোড',
    step1Desc: 'আপনার সরকারি ফর্মের ছবি তুলুন',
    step2: 'নথি যোগ করুন',
    step2Desc: 'আধার, PAN, পাসবুক ইত্যাদি',
    step3: 'কথা বলুন',
    step3Desc: 'বাকি ফিল্ড কথা বলে পূরণ করুন',
    trustLine: 'সারা ভারতে কৃষক, পরিবার ও প্রথমবার আবেদনকারীরা ব্যবহার করছেন',
    termsText: 'বিনামূল্যে · কোনো অ্যাকাউন্ট লাগবে না · যেকোনো ডিভাইসে কাজ করে',
  },
  hi: {
    badge: 'AI-संचालित · मुफ़्त',
    title: 'सहज फ़ॉर्म',
    titleSub: 'Shohoj Form',
    tagline: 'ফর্ম ভরার কাজ, এখন হবে Sohoj',
    subtitle: 'सरकारी फॉर्म अब आसान',
    description:
      'दस्तावेज़ अपलोड करें, बोलकर जवाब दें — हमारा AI मिनटों में सरकारी फॉर्म भर देगा।',
    loginBtn: 'मुफ़्त शुरू करें',
    feature1Title: 'AI एक्सट्रैक्शन',
    feature1Desc: 'आधार, PAN या पासबुक अपलोड करें — फ़ील्ड अपने आप भर जाएंगे',
    feature2Title: 'सुरक्षित और निजी',
    feature2Desc: 'आपका डेटा आपके डिवाइस पर रहता है, कहीं स्टोर नहीं होता',
    feature3Title: '10 भारतीय भाषाएं',
    feature3Desc: 'बंगाली, हिंदी, तमिल, तेलुगु और अधिक में काम करता है',
    step1: 'फॉर्म अपलोड',
    step1Desc: 'अपने सरकारी फॉर्म की फोटो लें',
    step2: 'दस्तावेज़ जोड़ें',
    step2Desc: 'आधार, PAN, पासबुक आदि',
    step3: 'बोलकर भरें',
    step3Desc: 'बाकी फ़ील्ड आवाज़ से भरें',
    trustLine: 'पूरे भारत में किसान, परिवार और पहली बार आवेदन करने वाले इस्तेमाल करते हैं',
    termsText: 'मुफ़्त · कोई अकाउंट नहीं · किसी भी डिवाइस पर काम करता है',
  },
}

const features = [
  {
    icon: Sparkles,
    key: 'feature1' as const,
    bg: 'bg-blue-50',
    iconBg: 'from-blue-500 to-blue-600',
    border: 'border-blue-100',
  },
  {
    icon: ShieldCheck,
    key: 'feature2' as const,
    bg: 'bg-teal-50',
    iconBg: 'from-teal-500 to-teal-600',
    border: 'border-teal-100',
  },
  {
    icon: Globe,
    key: 'feature3' as const,
    bg: 'bg-purple-50',
    iconBg: 'from-purple-500 to-purple-600',
    border: 'border-purple-100',
  },
]

const steps = [
  { icon: FileText, key: 'step1' as const, number: '01' },
  { icon: Zap,      key: 'step2' as const, number: '02' },
  { icon: Mic,      key: 'step3' as const, number: '03' },
]

export default function HomePage() {
  const router = useRouter()
  const { language, setLanguage, languageNames } = useLanguage()
  const [showLanguages, setShowLanguages] = useState(false)
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <main className="min-h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Decorative background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Large navy blob top-right */}
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] animate-hero-glow hero-blob"
          style={{ background: 'linear-gradient(135deg, #1B2E6B, #2A3F8F)', opacity: 0.08 }}
        />
        {/* Teal blob mid-left */}
        <div
          className="absolute top-1/3 -left-28 w-80 h-80 animate-float-delayed hero-blob"
          style={{ background: 'linear-gradient(135deg, #2EC4A7, #1FA88C)', opacity: 0.07 }}
        />
        {/* Small navy blob bottom */}
        <div
          className="absolute bottom-16 right-1/3 w-56 h-56 animate-float hero-blob"
          style={{ background: '#1B2E6B', opacity: 0.05, animationDelay: '3s' }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.28 0.10 258 / 0.04) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* ── NAVBAR ── */}
      <header className="relative z-20 border-b border-border/50 bg-white/85 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Shohoj Form Logo"
              width={42}
              height={42}
              className="object-contain drop-shadow-sm"
              priority
            />
            <div className="leading-none hidden sm:block">
              <div className="font-bold text-foreground text-[15px] tracking-tight">Shohoj Form</div>
              <div className="text-[11px] text-muted-foreground font-medium">সহজ ফর্ম</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLanguages(!showLanguages)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-white hover:bg-muted/50 transition-all text-sm font-medium shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground">{languageNames[language]}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showLanguages ? 'rotate-180' : ''}`} />
              </button>

              {showLanguages && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-border z-50 overflow-hidden animate-scale-in">
                  <div className="p-2 grid grid-cols-2 gap-1">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => { setLanguage(lang); setShowLanguages(false) }}
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-xl transition-all text-left font-medium ${
                          language === lang ? 'text-white shadow-sm' : 'text-foreground hover:bg-muted/70'
                        }`}
                        style={language === lang ? { background: '#1B2E6B' } : {}}
                      >
                        {language === lang && <Check className="w-3 h-3 shrink-0" />}
                        <span>{languageNames[lang]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA in nav */}
            <button
              onClick={() => router.push('/login')}
              className="btn-primary hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            >
              {t.loginBtn}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl w-full text-center">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border feature-badge text-xs font-semibold text-foreground mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#2EC4A7] animate-pulse" />
            {t.badge}
            <span className="text-muted-foreground/60">·</span>
            <span className="text-muted-foreground">Gemini AI</span>
          </div>

          {/* Logo hero image — static, no floating animation */}
          <div className="flex justify-center mb-5 animate-fade-in delay-75">
            <Image
              src="/logo.png"
              alt="Shohoj Form"
              width={100}
              height={100}
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-2 animate-fade-in delay-100 leading-tight tracking-tight">
            <span className="gradient-text">{t.title}</span>
          </h1>
          {t.titleSub !== t.title && (
            <p className="text-xl sm:text-2xl font-medium text-muted-foreground mb-2 animate-fade-in delay-150">
              {t.titleSub}
            </p>
          )}

          {/* Brand tagline */}
          <p className="text-sm font-semibold text-[#2EC4A7] mb-5 animate-fade-in delay-200 tracking-wide">
            {t.tagline}
          </p>

          <p className="text-2xl sm:text-3xl font-semibold text-foreground mb-6 animate-fade-in delay-200">
            {t.subtitle}
          </p>
          <p className="text-base sm:text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed animate-fade-in delay-300">
            {t.description}
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in delay-400">
            <button
              onClick={() => router.push('/login')}
              id="get-started-btn"
              className="btn-primary group inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-2xl font-bold text-white text-base"
            >
              {t.loginBtn}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground animate-fade-in delay-500">{t.termsText}</p>

          {/* ── HOW IT WORKS ── */}
          <div className="mt-16 animate-fade-in delay-500">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              How it works · কীভাবে কাজ করে
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {steps.map(({ icon: Icon, key, number }, idx) => (
                <div key={key} className="relative">
                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-[calc(50%+2rem)] w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                  )}
                  <div className="relative z-10 bg-white rounded-2xl border border-border p-5 text-left card-hover card-glow shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: 'linear-gradient(135deg, #1B2E6B, #2EC4A7)' }}
                      >
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground/60 tracking-widest mt-2">{number}</span>
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1">{t[`${key}` as keyof typeof t]}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t[`${key}Desc` as keyof typeof t]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── FEATURES ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 animate-fade-in delay-600">
            {features.map(({ icon: Icon, key, bg, iconBg, border }) => (
              <div
                key={key}
                className={`${bg} border ${border} rounded-2xl p-6 text-left card-hover card-glow`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} shadow-sm flex items-center justify-center mb-4`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1.5">
                  {t[`${key}Title` as keyof typeof t]}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t[`${key}Desc` as keyof typeof t]}
                </p>
              </div>
            ))}
          </div>

          {/* Trust line */}
          <p className="mt-10 text-xs text-muted-foreground animate-fade-in delay-700 flex items-center justify-center gap-2">
            <span className="text-[#2EC4A7]">✓</span>
            {t.trustLine}
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-border/60 bg-white/70 backdrop-blur-sm py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo in footer */}
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Shohoj Form"
              width={28}
              height={28}
              className="object-contain opacity-70"
            />
            <span className="text-xs text-muted-foreground font-medium">© 2025 Shohoj Form · সহজ ফর্ম</span>
          </div>
          <div className="flex gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy · গোপনীয়তা</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms · শর্তাবলী</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

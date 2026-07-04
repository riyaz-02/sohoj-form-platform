'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useEffect } from 'react'
import Image from 'next/image'
import { LogOut, ChevronRight, CheckCircle2, Clock, Circle, Sparkles, Users, ArrowRight } from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from '@/components/voice-guide-bar'
import { AGENT_LINES, prefetchAllLines } from '@/lib/voice-guide'

const FORMS = [
  {
    id: 'annapurna',
    enName: 'Annapurna Bhandar',
    bnName: 'অন্নপূর্ণা ভাণ্ডার',
    hiName: 'अन्नपूर्णा भंडार',
    enDesc: 'Public distribution system registration',
    bnDesc: 'সর্বজনীন বিতরণ ব্যবস্থায় নিবন্ধন',
    hiDesc: 'जन वितरण प्रणाली पंजीकरण',
    icon: '🛍️',
    gradient: 'from-blue-500/15 to-sky-400/10',
    iconBg: 'from-blue-500 to-sky-400',
    accent: 'oklch(0.55 0.15 230)',
  },
  {
    id: 'ayushman',
    enName: 'Ayushman Bharat',
    bnName: 'আয়ুষ্মান ভারত',
    hiName: 'आयुष्मान भारत',
    enDesc: 'National health protection scheme',
    bnDesc: 'জাতীয় স্বাস্থ্য সুরক্ষা প্রকল্প',
    hiDesc: 'राष्ट्रीय स्वास्थ्य सुरक्षा योजना',
    icon: '🏥',
    gradient: 'from-emerald-500/15 to-green-400/10',
    iconBg: 'from-emerald-500 to-green-400',
    accent: 'oklch(0.55 0.15 155)',
  },
  {
    id: 'ration',
    enName: 'Ration Card',
    bnName: 'রেশন কার্ড',
    hiName: 'राशन कार्ड',
    enDesc: 'Food subsidy entitlement document',
    bnDesc: 'খাদ্য ভর্তুকির যোগ্যতার নথি',
    hiDesc: 'खाद्य सब्सिडी पात्रता दस्तावेज़',
    icon: '📋',
    gradient: 'from-violet-500/15 to-purple-400/10',
    iconBg: 'from-violet-500 to-purple-400',
    accent: 'oklch(0.55 0.15 295)',
  },
  {
    id: 'bank',
    enName: 'Bank Account',
    bnName: 'ব্যাংক অ্যাকাউন্ট',
    hiName: 'बैंक खाता',
    enDesc: 'Jan Dhan government bank scheme',
    bnDesc: 'জন ধন সরকারি ব্যাংক প্রকল্প',
    hiDesc: 'जन धन सरकारी बैंक योजना',
    icon: '🏦',
    gradient: 'from-orange-500/15 to-amber-400/10',
    iconBg: 'from-orange-500 to-amber-400',
    accent: 'oklch(0.62 0.18 55)',
  },
  {
    id: 'krishak',
    enName: 'Krishak Bandhu',
    bnName: 'কৃষক বন্ধু',
    hiName: 'किसान बंधु',
    enDesc: 'Farmer assistance and welfare scheme',
    bnDesc: 'কৃষক সহায়তা ও কল্যাণ প্রকল্প',
    hiDesc: 'किसान सहायता और कल्याण योजना',
    icon: '🌾',
    gradient: 'from-amber-500/15 to-yellow-400/10',
    iconBg: 'from-amber-500 to-yellow-400',
    accent: 'oklch(0.68 0.17 75)',
  },
]

const translations = {
  en: {
    welcome: 'Good morning,',
    welcomeSub: 'নমস্কার · Which form do you need today?',
    logout: 'Logout · বের হন',
    availableForms: 'Available Forms · উপলব্ধ ফর্ম',
    startForm: 'Start · শুরু করুন',
    howItWorks: 'How it Works · এটি কীভাবে কাজ করে',
    steps: [
      { title: 'Select Form · ফর্ম নির্বাচন', desc: 'Choose the scheme you want to apply for' },
      { title: 'Upload Docs · ডকুমেন্ট আপলোড', desc: 'AI extracts your details automatically' },
      { title: 'Voice Fill · ভয়েস ফিল', desc: 'Answer remaining questions by speaking' },
      { title: 'Review · পর্যালোচনা', desc: 'Confirm all details are correct' },
      { title: 'Done · সম্পন্ন', desc: 'Download your filled form instantly' },
    ],
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    completed: 'Completed',
  },
  bn: {
    welcome: 'শুভ সকাল,',
    welcomeSub: 'Good morning · আজ কোন ফর্ম দরকার?',
    logout: 'বের হন · Logout',
    availableForms: 'উপলব্ধ ফর্ম · Available Forms',
    startForm: 'শুরু করুন · Start',
    howItWorks: 'এটি কীভাবে কাজ করে · How it Works',
    steps: [
      { title: 'ফর্ম নির্বাচন · Select Form', desc: 'যে প্রকল্পের জন্য আবেদন করতে চান তা বেছে নিন' },
      { title: 'ডকুমেন্ট আপলোড · Upload Docs', desc: 'AI স্বয়ংক্রিয়ভাবে আপনার তথ্য বের করবে' },
      { title: 'ভয়েস ফিল · Voice Fill', desc: 'বলে বলে বাকি প্রশ্নের উত্তর দিন' },
      { title: 'পর্যালোচনা · Review', desc: 'সব তথ্য সঠিক কিনা নিশ্চিত করুন' },
      { title: 'সম্পন্ন · Done', desc: 'পূরণ করা ফর্ম সঙ্গে সঙ্গে ডাউনলোড করুন' },
    ],
    notStarted: 'শুরু হয়নি',
    inProgress: 'চলছে',
    completed: 'সম্পন্ন',
  },
  hi: {
    welcome: 'सुप्रभात,',
    welcomeSub: 'Good morning · आज कौन-सा फॉर्म चाहिए?',
    logout: 'लॉगआउट · Logout',
    availableForms: 'उपलब्ध फॉर्म · Available Forms',
    startForm: 'शुरू करें · Start',
    howItWorks: 'यह कैसे काम करता है · How it Works',
    steps: [
      { title: 'फॉर्म चुनें · Select Form', desc: 'जिस योजना के लिए आवेदन करना चाहते हैं उसे चुनें' },
      { title: 'दस्तावेज़ अपलोड · Upload Docs', desc: 'AI आपकी जानकारी स्वचालित रूप से निकालेगा' },
      { title: 'वॉइस फिल · Voice Fill', desc: 'बोलकर बाकी सवालों के जवाब दें' },
      { title: 'समीक्षा करें · Review', desc: 'सभी जानकारी सही है या नहीं जांचें' },
      { title: 'हो गया · Done', desc: 'भरा हुआ फॉर्म तुरंत डाउनलोड करें' },
    ],
    notStarted: 'शुरू नहीं हुआ',
    inProgress: 'चल रहा है',
    completed: 'पूर्ण',
  },
}

const STATUS_ICONS = {
  'not-started': Circle,
  'in-progress': Clock,
  completed: CheckCircle2,
}

export default function DashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language as keyof typeof translations] || translations.en
  const guide = useVoiceGuide()

  // Prefetch all TTS audio on idle, speak welcome when unlocked
  useEffect(() => {
    prefetchAllLines() // warm cache during idle — instant playback later
    const t = setTimeout(() => guide.say(AGENT_LINES.dashboardWelcome.bn, AGENT_LINES.dashboardWelcome.en), 1000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getFormName = (form: typeof FORMS[0]) => {
    if (language === 'bn') return form.bnName
    if (language === 'hi') return form.hiName
    return form.enName
  }
  const getFormDesc = (form: typeof FORMS[0]) => {
    if (language === 'bn') return form.bnDesc
    if (language === 'hi') return form.hiDesc
    return form.enDesc
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Sohoj Form" width={40} height={40} className="rounded-xl" />
            <div>
              <div className="font-bold text-foreground text-sm">Sohoj Form</div>
              <div className="text-xs text-muted-foreground">সহজ ফর্ম</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:bg-muted/50 transition-all text-sm font-medium text-muted-foreground"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, oklch(0.22 0.09 258) 0%, oklch(0.32 0.085 258) 100%)' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 -translate-y-1/4 translate-x-1/4" style={{ background: 'oklch(0.72 0.18 65)' }} />
          <Sparkles className="absolute top-4 right-4 w-5 h-5 text-white/20" />
          <p className="text-white/70 text-sm font-medium mb-1">{t.welcome}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{t.welcomeSub}</h1>
        </div>

        {/* Forms grid */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
            <span>{t.availableForms}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FORMS.map((form) => (
              <div
                key={form.id}
                className={`bg-gradient-to-br ${form.gradient} border border-border/60 rounded-2xl overflow-hidden card-hover cursor-pointer group`}
                onClick={() => router.push(`/forms/${form.id}`)}
              >
                {/* Card top */}
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${form.iconBg} flex items-center justify-center text-2xl shadow-sm`}
                    >
                      {form.icon}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/70 text-xs font-medium text-muted-foreground border border-border/50">
                      <Circle className="w-2.5 h-2.5" />
                      {t.notStarted}
                    </span>
                  </div>
                  <h3 className="font-bold text-foreground text-base mb-1">
                    {getFormName(form)}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getFormDesc(form)}
                  </p>
                </div>

                {/* Card footer */}
                <div className="px-5 pb-5">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/forms/${form.id}`) }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all group-hover:gap-3 shadow-sm"
                    style={{ background: 'oklch(0.28 0.085 258)' }}
                  >
                    {t.startForm}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
          <h3 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            {t.howItWorks}
          </h3>
          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-border hidden sm:block" aria-hidden="true" />
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2">
              {t.steps.map((step, i) => (
                <div key={i} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-0 sm:text-center relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 sm:mb-3 z-10 text-white shadow-sm"
                    style={{ background: 'oklch(0.28 0.085 258)' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-0.5">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <VoiceGuideBar
        text={guide.currentText}
        textEn={guide.currentTextEn}
        isSpeaking={guide.isSpeaking}
        onMute={guide.setMuted}
        onDismiss={guide.silence}
      />
    </main>
  )
}

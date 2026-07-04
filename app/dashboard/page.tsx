'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/language-context'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  LogOut, Upload, Sparkles, Users, ArrowRight, Camera,
  ChevronRight, FileImage,
} from 'lucide-react'
import { VoiceGuideBar, useVoiceGuide } from '@/components/voice-guide-bar'
import { AGENT_LINES, prefetchAllLines } from '@/lib/voice-guide'
import { useFormContext } from '@/lib/form-context'

const COMMON_FORMS = [
  {
    id: 'krishak',
    enName: 'Krishak Bandhu',
    bnName: 'কৃষক বন্ধু',
    icon: 'KB',
    iconBg: 'from-amber-500 to-yellow-400',
  },
  {
    id: 'ayushman',
    enName: 'Ayushman Bharat',
    bnName: 'আয়ুষ্মান ভারত',
    icon: 'AB',
    iconBg: 'from-emerald-500 to-green-400',
  },
  {
    id: 'ration',
    enName: 'Ration Card',
    bnName: 'রেশন কার্ড',
    icon: 'RC',
    iconBg: 'from-violet-500 to-purple-400',
  },
  {
    id: 'annapurna',
    enName: 'Annapurna Bhandar',
    bnName: 'অন্নপূর্ণা ভাণ্ডার',
    icon: 'APB',
    iconBg: 'from-blue-500 to-sky-400',
  },
  {
    id: 'bank',
    enName: 'Bank Account',
    bnName: 'ব্যাংক',
    icon: 'BA',
    iconBg: 'from-orange-500 to-amber-400',
  },
]

const HOW_IT_WORKS = [
  { bn: 'ফর্ম আপলোড',   en: 'Upload Form',     desc: 'Take a photo of any govt. form' },
  { bn: 'AI বিশ্লেষণ',  en: 'AI Analyzes',     desc: 'Gemma AI reads & identifies fields' },
  { bn: 'ডকুমেন্ট',    en: 'Upload Docs',      desc: 'AI tells you which documents to bring' },
  { bn: 'ভয়েস ফিল',   en: 'Voice Fill',       desc: 'Speak remaining answers aloud' },
  { bn: 'সম্পন্ন',      en: 'Done',             desc: 'Get your filled form guide instantly' },
]

export default function DashboardPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const { resetForm, setFormId } = useFormContext()
  const guide = useVoiceGuide()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    prefetchAllLines()
    const t = setTimeout(() => guide.say(AGENT_LINES.dashboardWelcome.bn, AGENT_LINES.dashboardWelcome.en), 900)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Navigate to the auto-detect upload flow
  const goToAutoUpload = () => {
    resetForm()
    setFormId('auto')
    router.push('/forms/auto')
  }

  // Navigate to a specific known form
  const goToForm = (id: string) => {
    resetForm()
    setFormId(id)
    router.push(`/forms/${id}`)
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Navigate to auto flow — the file will be uploaded there
    goToAutoUpload()
  }

  const ln = language === 'bn' ? 'bn' : language === 'hi' ? 'hi' : 'en'

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Sohoj Form" width={36} height={36} className="rounded-xl" />
            <div>
              <div className="font-bold text-foreground text-sm">Sohoj Form</div>
              <div className="text-[11px] text-muted-foreground">সহজ ফর্ম</div>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-white hover:bg-muted/50 transition-all text-sm font-medium text-muted-foreground"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{ln === 'bn' ? 'বের হন' : 'Logout'}</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Primary Upload CTA ─────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {ln === 'bn' ? 'যেকোনো ফর্ম আপলোড করুন' : 'Upload Any Government Form'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {ln === 'bn'
                ? 'AI নিজেই বুঝবে কোন ফর্ম এবং কী কী ডকুমেন্ট লাগবে'
                : 'AI will detect the form type and tell you exactly which documents you need'}
            </p>
          </div>

          {/* Drop zone */}
          <div
            className={`
              relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer
              ${isDragging
                ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                : 'border-border hover:border-blue-300 hover:bg-blue-50/30 bg-gradient-to-br from-slate-50 to-blue-50/40'}
            `}
            onClick={goToAutoUpload}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-5 -translate-y-1/3 translate-x-1/3"
                   style={{ background: '#1B2E6B' }} />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-5 translate-y-1/3 -translate-x-1/3"
                   style={{ background: '#2EC4A7' }} />
            </div>

            <div className="relative flex flex-col items-center justify-center py-12 px-6 text-center">
              {/* Upload icon */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                   style={{ background: 'linear-gradient(135deg, #1B2E6B, #2A4A9F)' }}>
                <Camera className="w-9 h-9 text-white" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-2">
                {ln === 'bn' ? 'ফর্মের ছবি তুলুন বা আপলোড করুন' : 'Take a photo or upload your form'}
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                {ln === 'bn'
                  ? 'যেকোনো সরকারি ফর্ম — কৃষক বন্ধু, রেশন কার্ড, ব্যাংক ফর্ম ইত্যাদি'
                  : 'Any government form — Krishak Bandhu, Ration Card, Bank forms, and more'}
              </p>

              <button
                className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1B2E6B, #2A4A9F)' }}
              >
                <Upload className="w-5 h-5" />
                {ln === 'bn' ? 'ফর্ম আপলোড করুন' : 'Upload Form'}
              </button>

              <p className="text-xs text-muted-foreground mt-4">
                {ln === 'bn' ? 'অথবা এখানে ছবি টেনে আনুন' : 'or drag & drop your image here'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Common Forms (shortcuts) ──────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {ln === 'bn' ? 'পরিচিত ফর্ম বেছে নিন' : 'Or choose a common form'}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {COMMON_FORMS.map((form) => (
              <button
                key={form.id}
                onClick={() => goToForm(form.id)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-border bg-white hover:shadow-md hover:border-blue-200 transition-all shrink-0 group"
              >
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${form.iconBg} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                  {form.icon}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    {ln === 'bn' ? form.bnName : form.enName}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
              </button>
            ))}
          </div>
        </div>

        {/* ── How it Works ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-white p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">
              {ln === 'bn' ? 'কীভাবে কাজ করে' : 'How it Works'}
            </h3>
          </div>
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-px bg-border hidden sm:block" aria-hidden="true" />
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-2">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-0 sm:text-center relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 sm:mb-3 z-10 text-white shadow-sm"
                    style={{ background: i === 0 ? 'linear-gradient(135deg, #1B2E6B, #2A4A9F)' : 'oklch(0.28 0.085 258)' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground mb-0.5">
                      {ln === 'bn' ? step.bn : step.en}
                    </p>
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

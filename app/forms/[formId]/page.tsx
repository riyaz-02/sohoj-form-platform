'use client'

import { FormStepper } from '@/components/form-stepper'
import { Step1Upload } from '@/components/step-1-upload'
import { Step2Documents } from '@/components/step-2-documents'
import { Step4Review } from '@/components/step-4-review'
import { Step5Done } from '@/components/step-5-done'
import { FloatingVoicePanel } from '@/components/floating-voice-panel'
import { useFormContext } from '@/lib/form-context'
import { useLanguage } from '@/lib/language-context'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Globe, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import Image from 'next/image'

const FORM_INFO: Record<string, { en: string; bn: string; hi: string }> = {
  annapurna:        { en: 'Annapurna Bhandar', bn: 'অন্নপূর্ণা ভাণ্ডার', hi: 'अन्नपूर्णा भंडार' },
  ayushman:         { en: 'Ayushman Bharat',   bn: 'আয়ুষ্মান ভারত',     hi: 'आयुष्मान भारत'   },
  ration:           { en: 'Ration Card',        bn: 'রেশন কার্ড',         hi: 'राशन कार्ड'       },
  bank:             { en: 'Bank Account',       bn: 'ব্যাংক অ্যাকাউন্ট', hi: 'बैंक खाता'        },
  krishak:          { en: 'Krishak Bandhu',     bn: 'কৃষক বন্ধু',        hi: 'किसान बंधु'       },
  'krishak-bandhu': { en: 'Krishak Bandhu',     bn: 'কৃষক বন্ধু',        hi: 'किसान बंधु'       },
}

const STEP_DESCRIPTIONS: Record<number, { en: string; bn: string }> = {
  1: { en: 'Upload your form images',        bn: 'ফর্মের ছবি আপলোড করুন' },
  2: { en: 'Upload supporting documents',    bn: 'সহায়ক ডকুমেন্ট আপলোড করুন' },
  3: { en: 'Answer remaining questions',     bn: 'বাকি প্রশ্নের উত্তর দিন' },
  4: { en: 'Review and confirm all details', bn: 'সব তথ্য পর্যালোচনা করুন' },
  5: { en: 'Download your filled form',      bn: 'পূরণ করা ফর্ম ডাউনলোড করুন' },
}

export default function FormPage() {
  const params = useParams()
  const formId = params?.formId as string
  const { currentStep, resetForm } = useFormContext()
  const { language, setLanguage, languageNames } = useLanguage()
  const router = useRouter()
  const [showLangMenu, setShowLangMenu] = useState(false)

  useEffect(() => {
    resetForm()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  const form = FORM_INFO[formId] || { en: 'Application Form', bn: 'আবেদন ফর্ম', hi: 'आवेदन फॉर्म', icon: '📄' }
  const getFormName = () => language === 'bn' ? form.bn : language === 'hi' ? form.hi : form.en
  const stepDesc = STEP_DESCRIPTIONS[currentStep]

  return (
    <main className="min-h-screen bg-background flex flex-col">

      {/* ── Branded navy header with logo ── */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div
          className="relative px-4 sm:px-6 py-3 flex items-center gap-3"
        >
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-gray-100 hover:bg-gray-200 border border-gray-200"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>

          {/* Logo */}
          <div className="relative w-8 h-8 shrink-0">
            <Image
              src="/logo.png"
              alt="Sohoj Form"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Form name + step desc */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{getFormName()}</p>
            <p className="text-[11px] text-gray-400 truncate">
              {language === 'bn' ? stepDesc?.bn : stepDesc?.en}
            </p>
          </div>

          {/* Language toggle */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-gray-600 transition-all bg-gray-100 border border-gray-200 hover:bg-gray-200"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{languageNames[language]}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>

            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-border z-50 overflow-hidden animate-scale-in">
                <div className="p-1.5 grid grid-cols-2 gap-1">
                  {(['en', 'bn', 'hi'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangMenu(false) }}
                      className={`px-2.5 py-2 text-xs rounded-lg transition-all font-medium text-left ${
                        language === lang ? 'text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      style={language === lang ? { background: '#1B2E6B' } : {}}
                    >
                      {languageNames[lang]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Brand accent line */}
        <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, oklch(0.28 0.085 258), oklch(0.55 0.15 230) 50%, transparent)' }} />
      </header>

      {/* Step progress bar */}
      <FormStepper />

      {/* Step content */}
      <div className="flex-1">
        {currentStep === 1 && <Step1Upload />}
        {currentStep === 2 && <Step2Documents />}
        {currentStep === 3 && <Step4Review />}
        {currentStep === 4 && <Step4Review />}
        {currentStep === 5 && <Step5Done />}
      </div>

      {/* Persistent floating voice panel — visible from step 2 onward */}
      {currentStep >= 2 && currentStep <= 4 && <FloatingVoicePanel />}
    </main>
  )
}

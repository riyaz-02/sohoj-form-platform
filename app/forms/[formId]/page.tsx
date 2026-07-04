'use client'

import React from 'react'

import { Step1Upload } from '@/components/step-1-upload'
import { Step2Documents } from '@/components/step-2-documents'
import { Step4Review } from '@/components/step-4-review'
import { Step5Done } from '@/components/step-5-done'
import { FloatingVoicePanel } from '@/components/floating-voice-panel'
import { useFormContext } from '@/lib/form-context'
import { useLanguage } from '@/lib/language-context'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Globe, ChevronDown, Check } from 'lucide-react'
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

const STEPS = [
  { number: 1, bn: 'আপলোড' },
  { number: 2, bn: 'ডকুমেন্ট' },
  { number: 3, bn: 'ভয়েস' },
  { number: 4, bn: 'পর্যালোচনা' },
  { number: 5, bn: 'সম্পন্ন' },
]

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

  const form = FORM_INFO[formId] || { en: 'Application Form', bn: 'আবেদন ফর্ম', hi: 'आवेदन फॉर्म' }
  const getFormName = () => language === 'bn' ? form.bn : language === 'hi' ? form.hi : form.en

  return (
    <main className="min-h-screen bg-background flex flex-col">

      {/* ── Header: 3-column — [nav] [centered stepper] [language] ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 sm:px-6 py-2 flex items-center gap-2">

          {/* LEFT: back + logo + form name — fixed width */}
          <div className="flex items-center gap-1.5 shrink-0 w-[130px] sm:w-[160px] min-w-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-gray-600" />
            </button>
            <div className="relative w-6 h-6 shrink-0">
              <Image src="/logo.png" alt="Sohoj Form" fill className="object-contain" priority />
            </div>
            <p className="text-[11px] font-semibold text-gray-700 truncate">{getFormName()}</p>
          </div>

          {/* CENTER: step progress — constrained, centered */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-[220px]">
              {/* Dots + connectors row */}
              <div className="flex items-start">
                {STEPS.map((step, index) => {
                  const isDone   = currentStep > step.number
                  const isActive = currentStep === step.number
                  return (
                    <React.Fragment key={step.number}>
                      {/* Connector — vertically centered with dot (pt = half dot height) */}
                      {index > 0 && (
                        <div className="flex-1 pt-[9px] px-0.5">
                          <div className="h-px bg-gray-200 overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{ width: isDone ? '100%' : '0%', background: '#2EC4A7' }}
                            />
                          </div>
                        </div>
                      )}
                      {/* Dot + label */}
                      <div className="flex flex-col items-center shrink-0" style={{ width: 36 }}>
                        <div
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[8px] font-bold transition-all duration-300"
                          style={{
                            background: isDone ? '#2EC4A7' : isActive ? '#1B2E6B' : '#CBD5E1',
                            color:      isDone ? '#fff'    : isActive ? '#fff'    : '#475569',
                            boxShadow:  isActive ? '0 0 0 3px #1B2E6B22' : 'none',
                          }}
                        >
                          {isDone ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : step.number}
                        </div>
                        <span
                          className="text-[7.5px] mt-0.5 text-center leading-tight w-full truncate font-medium"
                          style={{ color: isActive ? '#1B2E6B' : isDone ? '#94A3B8' : '#94A3B8' }}
                        >
                          {step.bn}
                        </span>
                      </div>
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: language toggle — fixed width */}
          <div className="relative shrink-0 w-[70px] sm:w-[80px] flex justify-end">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              <Globe className="w-3 h-3" />
              <span>{languageNames[language]}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-7 w-32 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-1.5 grid grid-cols-2 gap-1">
                  {(['en', 'bn', 'hi'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setShowLangMenu(false) }}
                      className={`px-2 py-1.5 text-[11px] rounded-lg font-medium text-left transition-all ${
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
        {/* Accent line */}
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #1B2E6B, #2EC4A7 60%, transparent)' }} />
      </header>

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

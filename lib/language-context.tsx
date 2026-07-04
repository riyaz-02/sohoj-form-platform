'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'en' | 'bn' | 'hi' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml' | 'or'

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  bn: 'বাংলা',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  mr: 'मराठी',
  gu: 'ગુજરાતી',
  kn: 'ಕನ್ನಡ',
  ml: 'മലയാളം',
  or: 'ଓଡ଼ିଆ',
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  languageNames: Record<Language, string>
  t: (key: string, defaultValue?: string) => Promise<string>
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load language preference from localStorage
    const saved = localStorage.getItem('preferredLanguage') as Language | null
    if (saved) {
      setLanguage(saved)
    }
    setMounted(true)
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('preferredLanguage', lang)
  }

  // Simple translation function (uses static translations + API for dynamic content)
  const t = async (key: string, defaultValue: string = key) => {
    if (language === 'en') return defaultValue

    // Try static translations first
    const staticTranslations = getStaticTranslations()
    const langTranslations = staticTranslations[language as keyof typeof staticTranslations]
    if (langTranslations?.[key as keyof typeof langTranslations]) {
      return langTranslations[key as keyof typeof langTranslations]
    }

    // Fall back to API translation for dynamic content
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: defaultValue,
          targetLanguage: getGoogleLanguageCode(language),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.translatedText
      }
    } catch (error) {
      console.error('[v0] Translation error:', error)
    }

    return defaultValue
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        languageNames: LANGUAGE_NAMES,
        t,
      }}
    >
      {mounted ? children : null}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

// Static translations for common UI elements
function getStaticTranslations() {
  return {
    bn: {
      login: 'লগইন',
      logout: 'লগআউট',
      'send-otp': 'ওটিপি পাঠান',
      'verify-otp': 'ওটিপি যাচাই করুন',
      'mobile-number': 'মোবাইল নম্বর',
      'enter-otp': 'ওটিপি প্রবেश করুন',
      dashboard: 'ড্যাশবোর্ড',
      'select-language': 'ভাষা নির্বাচন করুন',
      'start-form': 'ফর্ম শুরু করুন',
      'annapurna-bhandar': 'অন্নপূর্ণা ভাণ্ডার',
      'ayushman-bharat': 'আয়ুষ্মান ভারত',
      'ration-card': 'রেশন কার্ড',
      'bank-form': 'ব্যাংক ফর্ম',
      'krishak-bandhu': 'কৃষক বন্ধু',
      'my-forms': 'আমার ফর্মসমূহ',
      'back': 'ফিরে যান',
      'submit': 'জমা দিন',
      'cancel': 'বাতিল করুন',
    },
    hi: {
      login: 'लॉगिन',
      logout: 'लॉगआउट',
      'send-otp': 'ओटीपी भेजें',
      'verify-otp': 'ओटीपी सत्यापित करें',
      'mobile-number': 'मोबाइल नंबर',
      'enter-otp': 'ओटीपी दर्ज करें',
      dashboard: 'डैशबोर्ड',
      'select-language': 'भाषा चुनें',
      'start-form': 'फॉर्म शुरू करें',
      'annapurna-bhandar': 'अन्नपूर्णा भंडार',
      'ayushman-bharat': 'आयुष्मान भारत',
      'ration-card': 'राशन कार्ड',
      'bank-form': 'बैंक फॉर्म',
      'krishak-bandhu': 'कृषक बंधु',
      'my-forms': 'मेरे फॉर्म',
      'back': 'पीछे जाएं',
      'submit': 'जमा करें',
      'cancel': 'रद्द करें',
    },
  }
}

// Map our language codes to Google Translate codes
function getGoogleLanguageCode(lang: Language): string {
  const mapping: Record<Language, string> = {
    en: 'en',
    bn: 'bn',
    hi: 'hi',
    ta: 'ta',
    te: 'te',
    mr: 'mr',
    gu: 'gu',
    kn: 'kn',
    ml: 'ml',
    or: 'or',
  }
  return mapping[lang] || 'en'
}

import type { Metadata, Viewport } from 'next'
import './globals.css'
import { FormProvider } from '@/lib/form-context'
import { LanguageProvider } from '@/lib/language-context'
import { VoiceUnlockButton } from '@/components/voice-unlock-button'

export const metadata: Metadata = {
  title: 'Shohoj Form | সহজ ফর্ম — ফর্ম ভরার কাজ, এখন হবে Sohoj',
  description:
    'Shohoj Form (সহজ ফর্ম) helps citizens fill Indian government forms with AI-powered document extraction and guided voice assistance. Free · No account needed.',
  keywords: [
    'government forms', 'সরকারি ফর্ম', 'Aadhaar', 'Ration Card',
    'Ayushman Bharat', 'Krishak Bandhu', 'শহজ ফর্ম', 'Shohoj Form',
  ],
  authors: [{ name: 'Shohoj Form' }],
  creator: 'Shohoj Form',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Shohoj Form | সহজ ফর্ম',
    description: 'Government Forms Made Simple with AI — ফর্ম ভরার কাজ, এখন হবে Sohoj',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Shohoj Form Logo' }],
  },
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
    shortcut: '/logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#1B2E6B' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen">
        <LanguageProvider>
          <FormProvider>
            {children}
            <VoiceUnlockButton />
          </FormProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}

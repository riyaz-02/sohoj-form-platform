import { NextRequest, NextResponse } from 'next/server'
import { v2 as Translate } from '@google-cloud/translate'

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguage } = await request.json()

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and targetLanguage are required' },
        { status: 400 }
      )
    }

    if (!apiKey) {
      // Fallback: return original text if no API key
      console.warn('[v0] Google Translate API key not configured')
      return NextResponse.json(
        {
          translatedText: text,
          detectedSourceLanguage: 'en',
        },
        { status: 200 }
      )
    }

    // Using a simple fetch-based approach to Google Translate API
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          key: apiKey,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json(
      {
        translatedText: data.data.translations[0].translatedText,
        detectedSourceLanguage: data.data.translations[0].detectedSourceLanguage || 'en',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[v0] Translation error:', error)
    return NextResponse.json(
      { error: 'Failed to translate text' },
      { status: 500 }
    )
  }
}

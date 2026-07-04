import { NextRequest, NextResponse } from 'next/server'

// TODO: replace with real Gemma 4 API call
// POST /api/generate-output
// Accepts the final filled field map and original form images
// Returns: a mock PDF URL and bounding box data for the hand-fill walkthrough

interface GenerateOutputRequest {
  finalFieldMap: Record<string, { value: string; fieldName: string; bengaliName: string; source: string }>
  formId?: string
}

interface BoundingBox {
  fieldId: string
  fieldName: string
  bengaliName: string
  value: string
  captionEn: string
  captionBn: string
  bbox: { x: number; y: number; width: number; height: number; pagePercent: boolean } // percentages of image dimensions
}

// Mock bounding boxes for Krishak Bandhu form (reference layout)
const MOCK_BBOXES: BoundingBox[] = [
  {
    fieldId: 'a2',
    fieldName: 'Full Name',
    bengaliName: 'সম্পূর্ণ নাম',
    value: 'Rajesh Kumar',
    captionEn: 'Write your full name here: Rajesh Kumar',
    captionBn: 'এখানে আপনার সম্পূর্ণ নাম লিখুন: রাজেশ কুমার',
    bbox: { x: 12, y: 18, width: 60, height: 6, pagePercent: true },
  },
  {
    fieldId: 'a3',
    fieldName: 'Date of Birth',
    bengaliName: 'জন্ম তারিখ',
    value: '15/05/1985',
    captionEn: 'Write your date of birth: 15/05/1985',
    captionBn: 'আপনার জন্ম তারিখ লিখুন: ১৫/০৫/১৯৮৫',
    bbox: { x: 12, y: 28, width: 35, height: 6, pagePercent: true },
  },
  {
    fieldId: 'a1',
    fieldName: 'Aadhaar Number',
    bengaliName: 'আধার নম্বর',
    value: '1234 5678 9012',
    captionEn: 'Write your Aadhaar number: 1234 5678 9012',
    captionBn: 'আপনার আধার নম্বর লিখুন: ১২৩৪ ৫৬৭৮ ৯০১২',
    bbox: { x: 12, y: 38, width: 45, height: 6, pagePercent: true },
  },
  {
    fieldId: 'l1',
    fieldName: 'Land Area (Hectares)',
    bengaliName: 'জমির আয়তন (হেক্টর)',
    value: '2.5',
    captionEn: 'Write your land area in hectares: 2.5',
    captionBn: 'হেক্টরে আপনার জমির পরিমাণ লিখুন: ২.৫',
    bbox: { x: 12, y: 50, width: 25, height: 6, pagePercent: true },
  },
  {
    fieldId: 'b1',
    fieldName: 'Account Number',
    bengaliName: 'অ্যাকাউন্ট নম্বর',
    value: '****5678',
    captionEn: 'Write your bank account number (last 4 digits visible)',
    captionBn: 'আপনার ব্যাংক অ্যাকাউন্ট নম্বর লিখুন (শেষ ৪ সংখ্যা দৃশ্যমান)',
    bbox: { x: 12, y: 62, width: 50, height: 6, pagePercent: true },
  },
]

export async function POST(request: NextRequest) {
  try {
    const body: GenerateOutputRequest = await request.json()

    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Merge provided field values into the mock bounding boxes
    const walkthrough = MOCK_BBOXES.map((box) => {
      const fieldData = body.finalFieldMap?.[box.fieldId]
      return {
        ...box,
        value: fieldData?.value || box.value,
        captionEn: fieldData?.value
          ? `${box.captionEn.split(':')[0]}: ${fieldData.value}`
          : box.captionEn,
        captionBn: fieldData?.value
          ? `${box.captionBn.split(':')[0]}: ${fieldData.value}`
          : box.captionBn,
      }
    })

    return NextResponse.json({
      success: true,
      // TODO: Gemma 4 would return a real PDF with filled form fields
      pdfUrl: '/api/generate-output/mock-pdf', // placeholder
      pdfName: `sohoj-form-${body.formId || 'filled'}-${Date.now()}.pdf`,
      walkthrough,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[generate-output] error:', error)
    return NextResponse.json({ error: 'Failed to generate output' }, { status: 500 })
  }
}

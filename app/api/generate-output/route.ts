import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/generate-output
 * Generates a step-by-step walkthrough from the REAL extracted field data.
 * Bbox positions are distributed evenly across the form height.
 */

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
  bbox: { x: number; y: number; width: number; height: number; pagePercent: boolean }
}

// Approximate x positions for typical government form fields
const FIELD_X_DEFAULTS: Record<string, number> = {
  name: 10, full_name: 10, applicant_name: 10,
  date_of_birth: 10, dob: 10,
  gender: 50, sex: 50,
  aadhaar: 10, aadhaar_number: 10, pan: 10, pan_number: 10,
  account_number: 10, bank_account: 10,
  ifsc: 50, ifsc_code: 50,
  address: 10, village: 10, district: 10, state: 50, pin: 70,
  mobile: 10, phone: 10,
  income: 10, annual_income: 10,
  father: 10, father_name: 10,
  land_area: 10, khasra: 10,
}

function getFieldX(fieldId: string): number {
  const lower = fieldId.toLowerCase()
  for (const [key, x] of Object.entries(FIELD_X_DEFAULTS)) {
    if (lower.includes(key)) return x
  }
  return 10 // default left-aligned
}

function getBengaliWriteCaption(bengaliName: string, value: string): string {
  return `${bengaliName} লিখুন: ${value}`
}

function getEnglishWriteCaption(fieldName: string, value: string): string {
  return `Write your ${fieldName}: ${value}`
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateOutputRequest = await request.json()
    const fieldMap = body.finalFieldMap || {}

    // Get entries with real values only
    const realEntries = Object.entries(fieldMap)
      .filter(([, f]) => f.value && f.value.trim() !== '' && f.value !== 'N/A')
      .map(([id, f]) => ({ id, ...f }))

    if (realEntries.length === 0) {
      return NextResponse.json({
        success: true,
        walkthrough: [],
        generatedAt: new Date().toISOString(),
      })
    }

    // Spread fields evenly across the form height (10% top padding, 10% bottom padding)
    const topPad = 10
    const bottomPad = 15
    const usableHeight = 100 - topPad - bottomPad
    const step = realEntries.length > 1 ? usableHeight / (realEntries.length - 1) : 0

    const walkthrough: BoundingBox[] = realEntries.map((f, i) => {
      const yPos = realEntries.length === 1
        ? topPad + usableHeight / 2
        : topPad + i * step

      // Width depends on value length: short values (IDs) ~40%, long values (addresses) ~75%
      const width = f.value.length > 20 ? 75 : f.value.length > 10 ? 50 : 40

      return {
        fieldId: f.id,
        fieldName: f.fieldName,
        bengaliName: f.bengaliName,
        value: f.value,
        captionEn: getEnglishWriteCaption(f.fieldName, f.value),
        captionBn: getBengaliWriteCaption(f.bengaliName, f.value),
        bbox: {
          x: getFieldX(f.id),
          y: Math.max(5, Math.min(90, yPos - 2)),
          width,
          height: 5,
          pagePercent: true,
        },
      }
    })

    return NextResponse.json({
      success: true,
      walkthrough,
      pdfName: `sohoj-form-${body.formId || 'filled'}-${Date.now()}.txt`,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[generate-output] error:', error)
    return NextResponse.json({ error: 'Failed to generate output' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/generate-output
 * Generates a step-by-step walkthrough from the REAL extracted field data.
 *
 * If the AI returned yPercent for a field (from Step 1 form analysis),
 * that value is used for the highlight position.
 * Otherwise, falls back to evenly distributing fields across the form height.
 *
 * The highlight is a FULL-WIDTH horizontal band (not a narrow box) for visual
 * forgiveness — even if the Y position is slightly off, the band still covers the field.
 */

interface FieldEntry {
  value: string
  fieldName: string
  bengaliName: string
  source: string
  /** Optional: actual vertical % position on form image from Step 1 AI */
  yPercent?: number
}

interface GenerateOutputRequest {
  finalFieldMap: Record<string, FieldEntry>
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

function getBengaliCaption(bengaliName: string, value: string): string {
  return `${bengaliName} লিখুন: ${value}`
}

function getEnglishCaption(fieldName: string, value: string): string {
  return `Write your ${fieldName}: ${value}`
}

/**
 * Calculate Y position for a field:
 * 1. Use AI-returned yPercent if available and valid
 * 2. Otherwise use ordered distribution across form height
 */
function calcYPos(
  yPercent: number | undefined,
  index: number,
  total: number,
): number {
  if (typeof yPercent === 'number' && yPercent >= 0 && yPercent <= 100) {
    return yPercent
  }
  // Fallback: evenly distributed — acknowledge this is an approximation
  const topPad = 10
  const usableHeight = 80
  if (total === 1) return topPad + usableHeight / 2
  return topPad + (index / (total - 1)) * usableHeight
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateOutputRequest = await request.json()
    const fieldMap = body.finalFieldMap || {}

    // Filter to real values only
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

    const walkthrough: BoundingBox[] = realEntries.map((f, i) => {
      const yPos = calcYPos(f.yPercent, i, realEntries.length)

      return {
        fieldId: f.id,
        fieldName: f.fieldName,
        bengaliName: f.bengaliName,
        value: f.value,
        captionEn: getEnglishCaption(f.fieldName, f.value),
        captionBn: getBengaliCaption(f.bengaliName, f.value),
        bbox: {
          // Full-width band: x=2%, width=96% so even if Y is slightly off it still
          // visually covers the target area. Height = 7% for a generous band.
          x: 2,
          y: Math.max(3, Math.min(88, yPos - 3.5)),
          width: 96,
          height: 7,
          pagePercent: true,
          // Store whether this position came from AI or was estimated
          fromAI: typeof f.yPercent === 'number',
        } as any,
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

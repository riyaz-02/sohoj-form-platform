/**
 * Document Requirements Intelligence — Sohoj Form
 *
 * KEY DESIGN PRINCIPLE:
 *   `triggers`      = why the document is NEEDED (broad — includes any field
 *                     that implies this document should be verified)
 *   `fillsPatterns` = what values the physical document ACTUALLY CONTAINS
 *                     (narrow — only what's printed on the card/passbook)
 *
 * This separation prevents showing "PAN will fill: Employer Name" when PAN
 * doesn't contain employer data — it's needed for *income verification* but
 * the user must speak their employer name themselves.
 */

export type DocumentType = 'aadhaar' | 'pan' | 'voter-id' | 'land-certificate' | 'bank-passbook'

// ── Fields users must provide via voice (not extractable from any document) ──
// When a form field matches these patterns, it goes to the voice step.
export const VOICE_REQUIRED_PATTERNS: RegExp[] = [
  /loan.?type/i, /loan.?purpose/i, /loan.?amount/i,
  /employer.?name/i, /\bemployer\b/i, /employment/i,
  /job.?title/i, /occupation/i, /profession/i,
  /monthly.?income/i, /annual.?income/i, /\bsalary\b/i, /\bwage\b/i,
  /email/i, /signature/i, /remarks/i, /purpose/i,
  /guarantor/i, /nominee/i, /relationship/i,
]

export const DOCUMENT_CATALOG: Record<DocumentType, {
  bengaliName: string
  englishName: string
  icon: string
  /** Bengali: what values this doc fills on the form */
  description: string
  descriptionEn: string
  /** Patterns for fields this document ACTUALLY CONTAINS (used for fillsFields display) */
  fillsPatterns: RegExp[]
  /** Patterns that TRIGGER needing this document (broader — includes fields needing verification) */
  triggers: RegExp[]
}> = {
  aadhaar: {
    bengaliName: 'আধার কার্ড',
    englishName: 'Aadhaar Card',
    icon: 'ID',
    description: 'নাম, জন্ম তারিখ, ঠিকানা, আধার নম্বর',
    descriptionEn: 'Name, Date of Birth, Address, Aadhaar Number',
    // What is PRINTED on an Aadhaar card
    fillsPatterns: [
      /aadhaar/i, /aadhar/i, /\buid\b/i,
      /\bname\b/i, /full.?name/i, /applicant.?name/i,
      /date.?of.?birth/i, /\bdob\b/i, /birth.?date/i,
      /\baddress\b/i, /permanent.?address/i, /residence/i,
      /\bgender\b/i, /\bmobile\b/i, /phone.?number/i,
      /pin.?code/i, /\bpincode\b/i,
    ],
    // When Aadhaar is NEEDED (basically all govt forms)
    triggers: [
      /aadhaar/i, /aadhar/i, /\buid\b/i, /unique.?id/i,
      /\bname\b/i, /applicant.?name/i, /full.?name/i,
      /date.?of.?birth/i, /\bdob\b/i,
      /\baddress\b/i, /residence/i,
      /\bgender\b/i, /\bmobile\b/i, /phone.?number/i,
    ],
  },
  pan: {
    bengaliName: 'প্যান কার্ড',
    englishName: 'PAN Card',
    icon: 'PAN',
    description: 'প্যান নম্বর, নাম, পিতার নাম',
    descriptionEn: 'PAN Number, Name, Father\'s Name',
    // What is PRINTED on a PAN card — NOT employer/income (user states those)
    fillsPatterns: [
      /\bpan\b/i, /pan.?number/i, /pan.?no/i,
      /permanent.?account/i, /tax.?id/i,
      /father.?name/i, /\bfather\b/i,
    ],
    // When PAN is NEEDED — income/employment fields require PAN for verification
    triggers: [
      /\bpan\b/i, /pan.?number/i, /pan.?no/i,
      /permanent.?account/i, /income.?tax/i, /tax.?id/i,
      /monthly.?income/i, /annual.?income/i, /\bincome\b/i,
      /employer.?name/i, /employment/i, /job.?title/i,
      /salary/i, /occupation/i,
    ],
  },
  'voter-id': {
    bengaliName: 'ভোটার আইডি কার্ড',
    englishName: 'Voter ID Card',
    icon: 'VID',
    description: 'ভোটার আইডি নম্বর (EPIC), পিতার নাম',
    descriptionEn: 'Voter ID Number (EPIC), Father\'s Name',
    fillsPatterns: [
      /\bepic\b/i, /voter.?id/i, /voter.?no/i,
      /electoral/i, /election.?card/i,
    ],
    triggers: [
      /\bepic\b/i, /voter/i, /voter.?id/i, /voter.?no/i,
      /electoral/i, /election.?card/i,
    ],
  },
  'land-certificate': {
    bengaliName: 'জমির দলিল / পর্চা',
    englishName: 'Land Certificate / Patta',
    icon: 'LC',
    description: 'জমির পরিমাণ, খাসরা নম্বর, দাগ নম্বর',
    descriptionEn: 'Land Area, Khasra Number, Plot/Dag Number',
    fillsPatterns: [
      /land.?area/i, /\bkhasra\b/i, /\bdag\b/i, /plot.?number/i,
      /\bmouza\b/i, /\bbigha\b/i, /\bpatta\b/i, /\bkhata\b/i,
      /\bacre\b/i, /survey.?number/i,
    ],
    triggers: [
      /land.?area/i, /\bkhasra\b/i, /\bdag\b/i, /plot.?number/i,
      /\bmouza\b/i, /\bbigha\b/i, /\bpatta\b/i, /\bkhata\b/i,
      /\bsurvey\b/i, /land.?type/i, /\bacre\b/i,
      /agricultural/i, /cultivat/i, /farm.?land/i,
    ],
  },
  'bank-passbook': {
    bengaliName: 'ব্যাংক পাসবুক',
    englishName: 'Bank Passbook / Statement',
    icon: 'BP',
    description: 'অ্যাকাউন্ট নম্বর, IFSC কোড, ব্যাংকের নাম',
    descriptionEn: 'Account Number, IFSC Code, Bank Name',
    // What is PRINTED in a passbook — NOT loan type/purpose (user decides those)
    fillsPatterns: [
      /account.?number/i, /bank.?account/i, /\bifsc\b/i,
      /bank.?name/i, /\bbranch\b/i, /\bmicr\b/i,
      /savings.?account/i, /current.?account/i,
    ],
    // When bank passbook is NEEDED
    triggers: [
      /account.?number/i, /bank.?account/i, /\bifsc\b/i,
      /bank.?name/i, /\bbranch\b/i, /passbook/i, /\bmicr\b/i,
      /savings.?account/i, /current.?account/i,
      // Loan fields imply bank verification is needed
      /loan.?amount/i, /loan.?purpose/i, /loan.?type/i,
      /credit.?score/i, /collateral/i,
    ],
  },
}

// ── Pre-set rules for specific government forms ──────────────────────────────

export const FORM_PRESET_DOCUMENTS: Record<string, DocumentType[]> = {
  'bank':     ['aadhaar', 'pan'],
  'krishak':  ['aadhaar', 'land-certificate', 'bank-passbook'],
  'annapurna': ['aadhaar', 'bank-passbook'],
  'ayushman': ['aadhaar'],
  'ration':   ['aadhaar', 'bank-passbook'],
  'kanyashree': ['aadhaar', 'bank-passbook'],
  'rupashree':  ['aadhaar', 'bank-passbook'],
  'swasthya':   ['aadhaar'],
  'pm-kisan':   ['aadhaar', 'land-certificate', 'bank-passbook'],
  // Full slugs (backward compat)
  'annapurna-bhandar': ['aadhaar', 'bank-passbook'],
  'ayushman-bharat':   ['aadhaar'],
  'ration-card':       ['aadhaar', 'bank-passbook'],
  'bank-form':         ['aadhaar', 'pan'],
  'krishak-bandhu':    ['aadhaar', 'land-certificate', 'bank-passbook'],
  'kanyashree-prakalpa': ['aadhaar', 'bank-passbook'],
  'rupashree-prakalpa':  ['aadhaar', 'bank-passbook'],
  'swasthya-sathi':      ['aadhaar'],
  'pm-kisan-samman':     ['aadhaar', 'land-certificate', 'bank-passbook'],
}

// ── Core types ────────────────────────────────────────────────────────────────

export interface RequiredDocument {
  type: DocumentType
  bengaliName: string
  englishName: string
  icon: string
  description: string
  descriptionEn: string
  /** Form fields whose values come FROM this document (honest — uses fillsPatterns) */
  fillsFields: string[]
  /** Form fields the user must speak (not in any document) */
  voiceFields?: string[]
  required: boolean
}

/**
 * Given extracted form fields from Step 1, determine:
 *   - which documents are required
 *   - which fields each document actually fills
 *   - which fields must be collected by voice
 */
export function deriveRequiredDocuments(
  fields: Array<{ id: string; fieldName: string; bengaliName?: string; category?: string }>,
  formType?: string,
): RequiredDocument[] {
  const presetTypes = formType ? (FORM_PRESET_DOCUMENTS[formType] || []) : []
  const triggeredTypes = new Set<DocumentType>(presetTypes)

  // Scan field names/IDs against document triggers
  for (const field of fields) {
    const searchText = `${field.id} ${field.fieldName} ${field.bengaliName || ''} ${field.category || ''}`
    for (const [docType, catalog] of Object.entries(DOCUMENT_CATALOG) as [DocumentType, typeof DOCUMENT_CATALOG[DocumentType]][]) {
      if (catalog.triggers.some((rx) => rx.test(searchText))) {
        triggeredTypes.add(docType)
      }
    }
  }

  if (triggeredTypes.size === 0) triggeredTypes.add('aadhaar')

  // Identify voice-required fields (user must speak these)
  const voiceFieldNames = fields
    .filter((f) => {
      const text = `${f.id} ${f.fieldName}`
      return VOICE_REQUIRED_PATTERNS.some((rx) => rx.test(text))
    })
    .map((f) => f.fieldName)

  const result: RequiredDocument[] = []

  for (const docType of triggeredTypes) {
    const catalog = DOCUMENT_CATALOG[docType]

    // fillsFields: only fields whose values are ACTUALLY ON the physical document
    const fillsFields = fields
      .filter((f) => {
        const text = `${f.id} ${f.fieldName}`
        // Must match fillsPatterns AND must NOT be voice-required
        return catalog.fillsPatterns.some((rx) => rx.test(text))
          && !VOICE_REQUIRED_PATTERNS.some((rx) => rx.test(text))
      })
      .map((f) => f.fieldName)
      .slice(0, 4)

    result.push({
      type: docType,
      bengaliName: catalog.bengaliName,
      englishName: catalog.englishName,
      icon: catalog.icon,
      description: catalog.description,
      descriptionEn: catalog.descriptionEn,
      fillsFields,
      voiceFields: voiceFieldNames.slice(0, 4),
      required: true,
    })
  }

  const ORDER: DocumentType[] = ['aadhaar', 'pan', 'voter-id', 'land-certificate', 'bank-passbook']
  result.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))

  return result
}

/**
 * Check if a field should be collected by voice (not from a document).
 */
export function isVoiceRequiredField(fieldId: string, fieldName: string): boolean {
  const text = `${fieldId} ${fieldName}`
  return VOICE_REQUIRED_PATTERNS.some((rx) => rx.test(text))
}

/**
 * Map document type strings to their canonical type.
 */
export function normalizeDocumentType(raw: string): DocumentType {
  const lower = raw.toLowerCase().replace(/\s+/g, '-')
  if (lower.includes('aadhaar') || lower.includes('aadhar')) return 'aadhaar'
  if (lower.includes('pan')) return 'pan'
  if (lower.includes('voter')) return 'voter-id'
  if (lower.includes('land') || lower.includes('patta') || lower.includes('khasra')) return 'land-certificate'
  if (lower.includes('bank') || lower.includes('passbook') || lower.includes('statement')) return 'bank-passbook'
  return 'aadhaar'
}

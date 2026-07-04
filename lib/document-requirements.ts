/**
 * Document Requirements Intelligence — Sohoj Form
 *
 * Maps form field names/IDs to required documents.
 * After Step 1 AI analysis, call `deriveRequiredDocuments(fields)`
 * to get ONLY the documents this specific form actually needs.
 */

export type DocumentType = 'aadhaar' | 'pan' | 'voter-id' | 'land-certificate' | 'bank-passbook'

// ── What each document provides ──────────────────────────────────────────────

export const DOCUMENT_CATALOG: Record<DocumentType, {
  bengaliName: string
  englishName: string
  icon: string
  description: string    // Bengali: what fields this doc fills
  descriptionEn: string
  /** Field types/keywords this document can fill */
  provides: string[]
  /** Pattern matches on field names/IDs that require this document */
  triggers: RegExp[]
}> = {
  aadhaar: {
    bengaliName: 'আধার কার্ড',
    englishName: 'Aadhaar Card',
    icon: '🪪',
    description: 'নাম, জন্ম তারিখ, ঠিকানা, আধার নম্বর',
    descriptionEn: 'Name, Date of Birth, Address, Aadhaar Number',
    provides: ['name', 'full_name', 'applicant_name', 'dob', 'date_of_birth', 'address', 'aadhaar', 'aadhar', 'uid', 'gender', 'mobile', 'phone'],
    triggers: [
      /aadhaar/i, /aadhar/i, /\buid\b/i, /unique.?id/i,
      /\bname\b/i, /applicant.?name/i, /full.?name/i,
      /date.?of.?birth/i, /\bdob\b/i, /birth.?date/i,
      /\baddress\b/i, /residence/i, /permanent.?address/i,
      /\bgender\b/i, /\bmobile\b/i, /phone.?number/i,
    ],
  },
  pan: {
    bengaliName: 'প্যান কার্ড',
    englishName: 'PAN Card',
    icon: '💳',
    description: 'প্যান নম্বর, নাম, পিতার নাম',
    descriptionEn: 'PAN Number, Name, Father\'s Name',
    provides: ['pan', 'pan_number', 'permanent_account', 'income_tax', 'tax_id'],
    triggers: [
      /\bpan\b/i, /pan.?number/i, /pan.?no/i,
      /permanent.?account/i, /income.?tax/i, /tax.?id/i,
    ],
  },
  'voter-id': {
    bengaliName: 'ভোটার আইডি কার্ড',
    englishName: 'Voter ID Card',
    icon: '🗳️',
    description: 'ভোটার আইডি নম্বর (EPIC), পিতার নাম, ঠিকানা',
    descriptionEn: 'Voter ID Number (EPIC), Father\'s Name, Address',
    provides: ['epic', 'voter_id', 'voter_number', 'electoral', 'election_card'],
    triggers: [
      /\bepic\b/i, /voter/i, /voter.?id/i, /voter.?no/i,
      /electoral/i, /election.?card/i, /\bepic.?number\b/i,
    ],
  },
  'land-certificate': {
    bengaliName: 'জমির দলিল / পর্চা',
    englishName: 'Land Certificate / Patta',
    icon: '📜',
    description: 'জমির পরিমাণ, খাসরা নম্বর, দাগ নম্বর, মৌজা',
    descriptionEn: 'Land Area, Khasra Number, Plot/Dag Number, Mouza',
    provides: ['land', 'land_area', 'khasra', 'dag', 'plot', 'mouza', 'village', 'survey', 'patta', 'khata', 'bigha'],
    triggers: [
      /land.?area/i, /\bkhasra\b/i, /\bdag\b/i, /plot.?number/i,
      /\bmouza\b/i, /\bbigha\b/i, /\bpatta\b/i, /\bkhata\b/i,
      /\bsurvey\b/i, /land.?type/i, /land.?size/i, /\bacre\b/i,
      /agricultural/i, /cultivat/i, /farm.?land/i,
    ],
  },
  'bank-passbook': {
    bengaliName: 'ব্যাংক পাসবুক',
    englishName: 'Bank Passbook / Statement',
    icon: '🏦',
    description: 'অ্যাকাউন্ট নম্বর, IFSC কোড, ব্যাংকের নাম',
    descriptionEn: 'Account Number, IFSC Code, Bank Name',
    provides: ['bank', 'account', 'bank_account', 'account_number', 'ifsc', 'bank_name', 'branch', 'micr'],
    triggers: [
      /account.?number/i, /bank.?account/i, /\bifsc\b/i,
      /bank.?name/i, /\bbranch\b/i, /passbook/i,
      /\bmicr\b/i, /savings.?account/i, /current.?account/i,
    ],
  },
}

// ── Pre-set rules for specific government forms ──────────────────────────────
// These are known form types — used as a strong hint before AI analysis

export const FORM_PRESET_DOCUMENTS: Record<string, DocumentType[]> = {
  'annapurna-bhandar': ['aadhaar', 'bank-passbook'],
  'ayushman-bharat':   ['aadhaar'],
  'ration-card':       ['aadhaar', 'bank-passbook'],
  'bank-form':         ['aadhaar', 'pan'],
  'krishak-bandhu':    ['aadhaar', 'land-certificate', 'bank-passbook'],
  'kanyashree':        ['aadhaar', 'bank-passbook'],
  'rupashree':         ['aadhaar', 'bank-passbook'],
  'swasthya-sathi':    ['aadhaar'],
  'pm-kisan':          ['aadhaar', 'land-certificate', 'bank-passbook'],
}

// ── Core function: derive required documents from extracted form fields ───────

export interface RequiredDocument {
  type: DocumentType
  bengaliName: string
  englishName: string
  icon: string
  description: string
  descriptionEn: string
  /** Which form fields this document will fill */
  fillsFields: string[]
  required: boolean
}

/**
 * Given extracted form fields from Step 1, determine which documents are needed.
 * Returns ONLY the documents required — not all 5 every time.
 */
export function deriveRequiredDocuments(
  fields: Array<{ id: string; fieldName: string; bengaliName?: string; category?: string }>,
  formType?: string,
): RequiredDocument[] {
  // Start with preset if form type is known
  const presetTypes = formType ? (FORM_PRESET_DOCUMENTS[formType] || []) : []

  // Scan field names/IDs against document triggers
  const triggeredTypes = new Set<DocumentType>(presetTypes)

  for (const field of fields) {
    const searchText = `${field.id} ${field.fieldName} ${field.bengaliName || ''} ${field.category || ''}`
    for (const [docType, catalog] of Object.entries(DOCUMENT_CATALOG) as [DocumentType, typeof DOCUMENT_CATALOG[DocumentType]][]) {
      if (catalog.triggers.some((rx) => rx.test(searchText))) {
        triggeredTypes.add(docType)
      }
    }
  }

  // If nothing detected, default to Aadhaar (always needed for govt forms)
  if (triggeredTypes.size === 0) triggeredTypes.add('aadhaar')

  // Build the result with which fields each doc fills
  const result: RequiredDocument[] = []
  for (const docType of triggeredTypes) {
    const catalog = DOCUMENT_CATALOG[docType]
    // Find which extracted fields this document will fill
    const fillsFields = fields
      .filter((f) => catalog.triggers.some((rx) => rx.test(`${f.id} ${f.fieldName}`)))
      .map((f) => f.fieldName)
      .slice(0, 4) // show at most 4

    result.push({
      type: docType,
      bengaliName: catalog.bengaliName,
      englishName: catalog.englishName,
      icon: catalog.icon,
      description: catalog.description,
      descriptionEn: catalog.descriptionEn,
      fillsFields,
      required: true,
    })
  }

  // Preferred display order
  const ORDER: DocumentType[] = ['aadhaar', 'pan', 'voter-id', 'land-certificate', 'bank-passbook']
  result.sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))

  return result
}

/**
 * Map document type strings to their canonical type.
 * Handles variations in AI output (e.g. "bank-statement" → "bank-passbook")
 */
export function normalizeDocumentType(raw: string): DocumentType {
  const lower = raw.toLowerCase().replace(/\s+/g, '-')
  if (lower.includes('aadhaar') || lower.includes('aadhar')) return 'aadhaar'
  if (lower.includes('pan')) return 'pan'
  if (lower.includes('voter')) return 'voter-id'
  if (lower.includes('land') || lower.includes('patta') || lower.includes('khasra')) return 'land-certificate'
  if (lower.includes('bank') || lower.includes('passbook') || lower.includes('statement')) return 'bank-passbook'
  return 'aadhaar' // safe default
}

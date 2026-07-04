/**
 * Bengali Voice Guide — Sohoj Form
 *
 * All instructions the AI agent speaks to guide the user through the form process.
 * Uses the browser's SpeechSynthesis API with bn-IN voice.
 *
 * The agent speaks:
 *   - When user arrives at each step (step entry)
 *   - When user completes an action (feedback)
 *   - When user is idle too long (nudge)
 *   - Error situations (what went wrong and what to do)
 */

import { speakText, stopSpeaking, prefetchTTSLines } from '@/components/voice-guide-bar'

// ── All agent voice lines ─────────────────────────────────────────────────────

export const AGENT_LINES = {

  // ── Landing / Welcome ──────────────────────────────────────
  welcome: {
    bn: 'সহজ ফর্মে স্বাগতম! আমি আপনাকে সরকারি ফর্ম পূরণ করতে সাহায্য করব। শুরু করতে লগইন করুন।',
    en: 'Welcome to Sohoj Form! I will help you fill your government form. Login to get started.',
  },

  // ── Login ──────────────────────────────────────────────────
  loginAskPhone: {
    bn: 'আপনার মোবাইল নম্বর দিন। আমরা একটি কোড পাঠাব।',
    en: 'Please enter your mobile number. We will send you a code.',
  },
  loginOtpSent: {
    bn: 'কোডটি আপনার ফোনে পাঠানো হয়েছে। ছয়টি সংখ্যা লিখুন।',
    en: 'A code has been sent to your phone. Enter the 6 digits.',
  },
  loginSuccess: {
    bn: 'দারুণ! সফলভাবে লগইন হয়েছে।',
    en: 'Great! You are now logged in.',
  },
  loginWrongOtp: {
    bn: 'কোডটি ভুল হয়েছে। আবার চেষ্টা করুন।',
    en: 'The code is incorrect. Please try again.',
  },

  // ── Dashboard ──────────────────────────────────────────────
  dashboardWelcome: {
    bn: 'আপনি কোন ফর্মটি পূরণ করতে চান? নিচের যেকোনো একটিতে চাপুন।',
    en: 'Which form would you like to fill? Tap any one below.',
  },

  // ── Step 1: Upload Form ────────────────────────────────────
  step1Enter: {
    bn: 'আপনার সরকারি ফর্মের একটি পরিষ্কার ছবি তুলুন। ফর্মটি সোজা ধরুন এবং আলো ভালো রাখুন।',
    en: 'Take a clear photo of your government form. Hold it straight and make sure the light is good.',
  },
  step1ImageAdded: {
    bn: 'ছবিটি যোগ হয়েছে। আরও ছবি যোগ করতে পারেন, অথবা বিশ্লেষণ করুন বাটনে চাপুন।',
    en: 'Image added. You can add more, or tap the Analyze button.',
  },
  step1Analyzing: {
    bn: 'ঠিক আছে, আমি ফর্মটি পড়ছি। একটু অপেক্ষা করুন।',
    en: 'Okay, I am reading your form. Please wait a moment.',
  },
  step1Done: {
    bn: 'চমৎকার! ফর্মটি পড়া হয়ে গেছে। এখন আপনার কাগজপত্র আপলোড করুন।',
    en: 'Excellent! Form has been read. Now upload your documents.',
  },
  step1NoImage: {
    bn: 'প্রথমে ফর্মের একটি ছবি তুলুন।',
    en: 'First take a photo of the form.',
  },

  // ── Step 2: Documents ──────────────────────────────────────
  step2Enter: {
    bn: 'এখন আপনার পরিচয়পত্র আপলোড করুন। যেকোনো একটি দিয়ে শুরু করতে পারেন।',
    en: 'Now upload your identity documents. You can start with any one.',
  },
  step2UploadAadhaar: {
    bn: 'আপনার আধার কার্ডের একটি পরিষ্কার ছবি তুলুন।',
    en: 'Take a clear photo of your Aadhaar card.',
  },
  step2UploadPan: {
    bn: 'আপনার প্যান কার্ডের ছবি তুলুন।',
    en: 'Take a photo of your PAN card.',
  },
  step2UploadVoter: {
    bn: 'আপনার ভোটার আইডি কার্ডের ছবি তুলুন।',
    en: 'Take a photo of your Voter ID card.',
  },
  step2UploadLand: {
    bn: 'আপনার জমির কাগজের ছবি তুলুন।',
    en: 'Take a photo of your land document.',
  },
  step2UploadBank: {
    bn: 'আপনার ব্যাংক পাসবুকের প্রথম পাতার ছবি তুলুন।',
    en: 'Take a photo of the first page of your bank passbook.',
  },
  step2Extracted: {
    bn: 'দারুণ! কাগজটি স্ক্যান হয়ে গেছে। তথ্য বের করা হয়েছে।',
    en: 'Great! Document scanned. Information has been extracted.',
  },
  step2WrongDoc: {
    bn: 'এটি সঠিক কাগজ নয়। সঠিক কাগজটি আবার আপলোড করুন।',
    en: 'This is not the right document. Please upload the correct one.',
  },
  step2AllDone: {
    bn: 'সমস্ত কাগজপত্র আপলোড হয়েছে। পরবর্তী ধাপে যান।',
    en: 'All documents uploaded. Proceed to the next step.',
  },

  // ── Step 3: Voice Fill ─────────────────────────────────────
  step3Enter: {
    bn: 'কিছু প্রশ্নের উত্তর দিন। মাইক্রোফোন বাটনে চাপুন এবং কথা বলুন।',
    en: 'Answer a few questions. Press the microphone button and speak.',
  },
  step3ListeningStart: {
    bn: 'বলুন...',
    en: 'Speak now...',
  },
  step3ListeningStop: {
    bn: 'ঠিক আছে, উত্তরটি নেওয়া হয়েছে।',
    en: 'Okay, your answer has been recorded.',
  },
  step3SkipQuestion: {
    bn: 'এই প্রশ্নটি এড়িয়ে যাওয়া হয়েছে।',
    en: 'This question has been skipped.',
  },
  step3AllAnswered: {
    bn: 'সমস্ত প্রশ্নের উত্তর দেওয়া হয়েছে। পর্যালোচনায় যান।',
    en: 'All questions answered. Go to review.',
  },

  // ── Step 4: Review ─────────────────────────────────────────
  step4Enter: {
    bn: 'এখানে আপনার সব তথ্য দেখুন। কিছু ভুল থাকলে চেপে ঠিক করুন। সব ঠিক থাকলে নিচে বাটনে চাপুন।',
    en: 'Check all your information here. Tap any field to correct it. When everything is correct, press the button below.',
  },
  step4Editing: {
    bn: 'তথ্যটি সম্পাদনা করুন এবং সংরক্ষণ করুন।',
    en: 'Edit the information and save.',
  },
  step4Confirmed: {
    bn: 'চমৎকার! তথ্য নিশ্চিত করা হয়েছে। ফর্ম তৈরি হচ্ছে।',
    en: 'Excellent! Information confirmed. Generating your form.',
  },

  // ── Step 5: Done ───────────────────────────────────────────
  step5Enter: {
    bn: 'অভিনন্দন! আপনার ফর্ম প্রস্তুত। ডাউনলোড করুন অথবা কীভাবে লিখতে হবে তা দেখুন।',
    en: 'Congratulations! Your form is ready. Download it or see how to fill it by hand.',
  },
  step5Download: {
    bn: 'ফর্মটি ডাউনলোড হচ্ছে।',
    en: 'Downloading your form.',
  },
  step5Walkthrough: {
    bn: 'হাতে লেখার গাইড শুরু হচ্ছে। প্রতিটি ঘরে কী লিখতে হবে দেখুন।',
    en: 'Starting the hand-fill guide. See what to write in each box.',
  },

  // ── Idle nudges ────────────────────────────────────────────
  nudge1: {
    bn: 'সাহায্য লাগলে মাইক বাটনে চাপুন।',
    en: 'If you need help, press the mic button.',
  },
  nudge2: {
    bn: 'আটকে গেলে পরবর্তী ধাপে যান, পরে ঠিক করা যাবে।',
    en: 'If stuck, go to next step — you can correct later.',
  },
} as const

export type AgentLineKey = keyof typeof AGENT_LINES

// ── Agent speaker ─────────────────────────────────────────────────────────────

let currentNudgeTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Speak an agent instruction in Bengali.
 * Automatically stops any currently speaking voice first.
 */
export function agentSpeak(key: AgentLineKey, lang: 'bn' | 'en' = 'bn') {
  stopSpeaking()
  if (currentNudgeTimer) { clearTimeout(currentNudgeTimer); currentNudgeTimer = null }
  const line = AGENT_LINES[key]
  return speakText(line.bn, line.en)
}

/**
 * Speak a custom Bengali text (for dynamic content like document names)
 */
export function agentSpeakText(text: string, en?: string) {
  stopSpeaking()
  return speakText(text, en)
}

/**
 * Prefetch all static AGENT_LINES as audio on idle.
 * Call this on the dashboard so lines play instantly later.
 */
export function prefetchAllLines() {
  const lines = Object.values(AGENT_LINES).map((l) => l.bn)
  prefetchTTSLines(lines)
}

/**
 * Schedule a nudge after a delay (resets on each action)
 */
export function scheduleNudge(key: AgentLineKey = 'nudge1', delayMs = 20000) {
  if (currentNudgeTimer) clearTimeout(currentNudgeTimer)
  currentNudgeTimer = setTimeout(() => agentSpeak(key), delayMs)
}

export function clearNudge() {
  if (currentNudgeTimer) { clearTimeout(currentNudgeTimer); currentNudgeTimer = null }
}

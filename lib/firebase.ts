/**
 * Firebase client for Sohoj Form
 * 
 * IMPORTANT: RecaptchaVerifier must NEVER be created here (module level).
 * It must be created inside a React component after the DOM is ready.
 * See app/login/page.tsx → getVerifier()
 */

import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Singleton — avoid re-initializing on Next.js hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)

export { signInWithPhoneNumber, type ConfirmationResult }

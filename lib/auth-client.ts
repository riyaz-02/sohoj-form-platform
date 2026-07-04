'use client'

import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  basePath: '/api/auth',
})

export const { signUp, signIn, signOut, useSession } = authClient

import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

const baseURL = process.env.BETTER_AUTH_URL
  ? `${process.env.BETTER_AUTH_URL}`
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL
        ? process.env.V0_RUNTIME_URL
        : 'http://localhost:3000'

const trustedOrigins = [
  baseURL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`,
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`,
  process.env.V0_RUNTIME_URL,
  'http://localhost:3000',
].filter(Boolean) as string[]

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: baseURL,
  trustedOrigins: trustedOrigins,
  plugins: [],
  socialProviders: {},
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'development',
    },
  },
})

import { createClient } from '@supabase/supabase-js'

function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v) throw new Error(`Missing env: ${key}`)
  return v
}

/** Service-role client — only used inside server routes, never exposed to browser. */
export const supabaseAdmin = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export class AuthVerificationError extends Error {
  constructor(
    readonly code: 'network' | 'invalid',
    message: string,
  ) {
    super(message)
    this.name = 'AuthVerificationError'
  }
}

function isNetworkFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  const cause = err instanceof Error && err.cause ? String(err.cause) : ''
  const combined = `${msg} ${cause}`.toLowerCase()
  return (
    combined.includes('fetch failed') ||
    combined.includes('connect timeout') ||
    combined.includes('econnrefused') ||
    combined.includes('enotfound') ||
    combined.includes('network')
  )
}

/** Verify a browser access_token and return the user (or throw). */
export async function getUserFromToken(token: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      throw new AuthVerificationError('invalid', error?.message ?? 'Invalid or expired session')
    }
    return data.user
  } catch (err) {
    if (err instanceof AuthVerificationError) throw err
    if (isNetworkFailure(err)) {
      throw new AuthVerificationError(
        'network',
        'Cannot reach Supabase. Check internet connection and SUPABASE_URL in server/.env',
      )
    }
    throw new AuthVerificationError('invalid', 'Unauthorized')
  }
}

/** Optional: check if user email is in ADMIN_EMAILS allow-list. */
export function assertAdmin(email: string | undefined) {
  const list = process.env.ADMIN_EMAILS
  if (!list) return // no list = any authenticated user is admin
  const allowed = list.split(',').map((e) => e.trim().toLowerCase())
  if (!email || !allowed.includes(email.toLowerCase())) {
    throw new Error('Forbidden: admin access only')
  }
}

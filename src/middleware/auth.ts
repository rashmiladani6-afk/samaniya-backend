import type { Request, Response, NextFunction } from 'express'
import { AuthVerificationError, getUserFromToken, assertAdmin } from '../supabase.js'

export interface AuthRequest extends Request {
  userId: string
  userEmail: string | undefined
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Bearer token' })
    return
  }
  const token = header.slice(7)
  try {
    const user = await getUserFromToken(token)
    const r = req as AuthRequest
    r.userId = user.id
    r.userEmail = user.email
    next()
  } catch (err) {
    if (err instanceof AuthVerificationError && err.code === 'network') {
      res.status(503).json({ error: err.message })
      return
    }
    const message =
      err instanceof AuthVerificationError ? err.message : 'Unauthorized'
    res.status(401).json({ error: message })
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const r = req as AuthRequest
    try {
      assertAdmin(r.userEmail)
      next()
    } catch {
      res.status(403).json({ error: 'Forbidden: admin only' })
    }
  })
}

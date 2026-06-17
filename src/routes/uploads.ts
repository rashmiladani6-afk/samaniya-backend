import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

const SignBody = z.object({
  path: z.string().min(1),
  contentType: z.string().min(1),
})

/** Returns a signed upload URL for the browser to PUT the file directly to Supabase Storage. */
router.post('/sign', requireAdmin, async (req, res) => {
  const parsed = SignBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const bucket = process.env.STORAGE_BUCKET ?? 'post-images'
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(parsed.data.path)

  if (error) {
    console.error('[uploads/sign] 500:', error.message)
    return res.status(500).json({ error: error.message })
  }
  res.json({ signedUrl: data.signedUrl, path: data.path, token: data.token })
})

/** Returns a signed read URL for a stored image path. */
router.get('/url', requireAdmin, async (req, res) => {
  const path = req.query.path as string
  if (!path) return res.status(400).json({ error: 'path required' })
  const bucket = process.env.STORAGE_BUCKET ?? 'post-images'
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  res.json({ publicUrl: data.publicUrl })
})

export default router

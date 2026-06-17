import { Router } from 'express'
import { supabaseAdmin } from '../supabase.js'

/** Public read-only categories for the blog (no auth). */
const router = Router()

router.get('/categories', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[public/categories]', error.message)
    return res.status(500).json({ error: error.message })
  }
  res.json(data ?? [])
})

export default router

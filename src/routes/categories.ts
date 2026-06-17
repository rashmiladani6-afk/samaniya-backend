import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAdmin)

const CategoryBody = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  color: z.string().default('#64748B'),
  description: z.string().default(''),
  sort_order: z.number().int().default(0),
})

router.get('/', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', async (req, res) => {
  const parsed = CategoryBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { data, error } = await supabaseAdmin
    .from('categories')
    .insert(parsed.data)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.put('/:slug', async (req, res) => {
  const parsed = CategoryBody.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { data, error } = await supabaseAdmin
    .from('categories')
    .update(parsed.data)
    .eq('slug', req.params.slug)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:slug', async (req, res) => {
  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('slug', req.params.slug)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router

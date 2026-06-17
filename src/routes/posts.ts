import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAdmin)

function mapPostDbError(message: string): string {
  if (message.includes('posts_category_check')) {
    return (
      'Database only allows old fixed categories. In Supabase → SQL Editor run: ' +
      'ALTER TABLE public.posts DROP CONSTRAINT posts_category_check; ' +
      '(Or run server/fix-posts-category-constraint.sql)'
    )
  }
  return message
}

const PostBody = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  image: z.string().default(''),
  category: z.string().min(1),
  author_id: z.string().min(1),
  date: z.string().default(''),
  read_time: z.number().int().positive(),
  views: z.number().int().default(0),
  tags: z.array(z.string()).default([]),
  content: z.string().default(''),
  status: z.enum(['draft', 'published']).default('published'),
})

router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const pageSize = Math.min(Number(req.query.per_page ?? 20), 100)
  const status = req.query.status as string | undefined

  let query = supabaseAdmin
    .from('posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (status === 'draft' || status === 'published') {
    query = query.eq('status', status)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[posts list] 500:', error.message)
    return res.status(500).json({ error: error.message })
  }
  res.json({ data, total: count ?? 0, page, per_page: pageSize })
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', req.params.id)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Post not found' })
  res.json(data)
})

router.post('/', async (req, res) => {
  const parsed = PostBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { data, error } = await supabaseAdmin.from('posts').insert(parsed.data).select().single()
  if (error) {
    console.error('[posts create] 500:', error.message, JSON.stringify(parsed.data))
    return res.status(500).json({ error: mapPostDbError(error.message) })
  }
  res.status(201).json(data)
})

router.put('/:id', async (req, res) => {
  const parsed = PostBody.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { data, error } = await supabaseAdmin
    .from('posts')
    .update(parsed.data)
    .eq('id', req.params.id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: mapPostDbError(error.message) })
  res.json(data)
})

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.from('posts').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router

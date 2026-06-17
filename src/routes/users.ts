import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()
router.use(requireAdmin)

router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1)
  const perPage = Math.min(Number(req.query.per_page ?? 20), 100)

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
  if (error) return res.status(500).json({ error: error.message })

  // Enrich with profile roles
  const ids = data.users.map((u) => u.id)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .in('id', ids)
  const roleMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.role]))

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    role: roleMap[u.id] ?? 'reader',
  }))

  res.json({ data: users, total: data.total ?? users.length, page })
})

const PatchBody = z.object({ role: z.enum(['admin', 'editor', 'reader']) })

router.patch('/:id', async (req, res) => {
  const parsed = PatchBody.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: req.params.id, role: parsed.data.role })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ id: req.params.id, role: parsed.data.role })
})

router.delete('/:id', async (req, res) => {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  await supabaseAdmin.from('profiles').delete().eq('id', req.params.id)
  res.status(204).end()
})

export default router

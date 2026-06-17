import { Router } from 'express'
import { supabaseAdmin } from '../supabase.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const [postsRes, categoriesRes, usersRes] = await Promise.all([
      supabaseAdmin.from('posts').select('views', { count: 'exact' }),
      supabaseAdmin.from('categories').select('slug', { count: 'exact' }),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1, page: 1 }),
    ])

    if (postsRes.error) throw new Error(postsRes.error.message)
    if (categoriesRes.error) throw new Error(categoriesRes.error.message)

    const totalViews = (postsRes.data ?? []).reduce(
      (sum, p) => sum + ((p as { views?: number }).views ?? 0),
      0,
    )

    res.json({
      postCount: postsRes.count ?? 0,
      categoryCount: categoriesRes.count ?? 0,
      totalViews,
      userCount: (usersRes.data as { total?: number } | null)?.total ?? 0,
    })
  } catch (err) {
    console.error('[stats] 500:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router

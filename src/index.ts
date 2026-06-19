import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { rateLimit } from 'express-rate-limit'

import statsRouter from './routes/stats.js'
import postsRouter from './routes/posts.js'
import categoriesRouter from './routes/categories.js'
import usersRouter from './routes/users.js'
import uploadsRouter from './routes/uploads.js'
import publicCategoriesRouter from './routes/publicCategories.js'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (no Origin header)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`))
      }
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '10mb' }))

const limiter = rateLimit({ windowMs: 60_000, max: 120 })
app.use('/api', limiter)

app.use('/api/public', publicCategoriesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/posts', postsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/users', usersRouter)
app.use('/api/uploads', uploadsRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`Admin API listening on http://localhost:${PORT}`)
})

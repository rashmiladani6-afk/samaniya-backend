import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// Load server/.env (script runs from server/ directory)
config({ path: resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL ?? 'admin@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? 'admin1234'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seedAdmin() {
  console.log(`Setting up admin user: ${ADMIN_EMAIL}`)

  // Try to create the user first
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  })

  let userId: string

  if (createErr) {
    if (createErr.message.toLowerCase().includes('already been registered') ||
        createErr.message.toLowerCase().includes('already exists') ||
        createErr.message.toLowerCase().includes('duplicate')) {
      // User exists — find them and update password
      console.log('  User already exists, updating password...')
      const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
      if (listErr || !list) {
        console.error('❌  Could not list users:', listErr?.message)
        process.exit(1)
      }
      const existing = list.users.find((u) => u.email === ADMIN_EMAIL)
      if (!existing) {
        console.error('❌  User not found after creation conflict — check Supabase dashboard')
        process.exit(1)
      }
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      })
      if (updateErr) {
        console.error('❌  Could not update password:', updateErr.message)
        process.exit(1)
      }
      userId = existing.id
      console.log('  Password updated.')
    } else {
      console.error('❌  Could not create user:', createErr.message)
      process.exit(1)
    }
  } else {
    userId = created.user.id
    console.log('  User created.')
  }

  // Upsert profiles row with role = admin
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, role: 'admin' }, { onConflict: 'id' })

  if (profileErr) {
    console.error('❌  Could not upsert profiles row:', profileErr.message)
    process.exit(1)
  }

  console.log('  profiles.role set to admin.')
  console.log()
  console.log('Done! Login at /admin/login with:')
  console.log(`  Email:    ${ADMIN_EMAIL}`)
  console.log(`  Password: ${ADMIN_PASSWORD}`)
}

seedAdmin()

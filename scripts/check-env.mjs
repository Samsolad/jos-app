import { readFileSync, existsSync } from 'node:fs'

const path = '.env.local'
if (!existsSync(path)) {
  console.log('No .env.local found')
  process.exit(0)
}

function jwtRole(token) {
  try {
    const payload = token.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return json.role
  } catch {
    return null
  }
}

for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  const key = m[1].trim()
  const val = m[2].trim().replace(/^["']|["']$/g, '')
  if (!val) {
    console.log(`${key}: (empty)`)
    continue
  }
  if (key === 'VITE_SUPABASE_ANON_KEY') {
    const role = jwtRole(val)
    console.log(`${key}: JWT role = ${role ?? 'unknown'}`)
    if (role === 'service_role') {
      console.error('ERROR: Use the anon public key, not service_role.')
      process.exit(1)
    }
  } else if (key.includes('KEY') || key.includes('URL')) {
    console.log(`${key}: set (${val.length} chars)`)
  }
}

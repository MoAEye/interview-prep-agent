import { createClient } from '@supabase/supabase-js'

/** Trim env; treat missing / literal "undefined" as unset; strip wrapping quotes. */
function readViteEnv(name) {
  let v = import.meta.env[name]
  if (v == null || v === '') return ''
  v = String(v).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim()
  }
  if (v === '' || v === 'undefined') return ''
  return v
}

const rawUrl = readViteEnv('VITE_SUPABASE_URL')
const rawKey = readViteEnv('VITE_SUPABASE_ANON_KEY')

/** Obvious .env.example / template values — still "unset" for auth. */
function looksLikePlaceholderUrl(u) {
  if (!u) return true
  const s = u.toLowerCase()
  return (
    s.includes('your-project-ref') ||
    s.includes('your_project') ||
    s.includes('placeholder') ||
    s.includes('xxxxx') ||
    /^https?:\/\/example\.com/i.test(u)
  )
}

function looksLikePlaceholderKey(k) {
  if (!k) return true
  const s = k.toLowerCase()
  return (
    s.includes('your-anon-key') ||
    s.includes('your_anon') ||
    s.includes('placeholder') ||
    s.includes('not-configured') ||
    k.length < 32
  )
}

function hostnameLooksLikeSupabase(urlStr) {
  try {
    const host = new URL(urlStr).hostname.toLowerCase()
    return host.endsWith('.supabase.co')
  } catch {
    return false
  }
}

/** True when URL + anon key look like a real Supabase project (not template text). */
export const isSupabaseConfigured = Boolean(
  rawUrl &&
    rawKey &&
    rawUrl.startsWith('https://') &&
    hostnameLooksLikeSupabase(rawUrl) &&
    !looksLikePlaceholderUrl(rawUrl) &&
    !looksLikePlaceholderKey(rawKey)
)

// Supabase JS v2 throws if url or key is empty — would white-screen the whole app before React mounts.
const supabaseUrl = rawUrl || 'https://placeholder.supabase.co'
const supabaseKey = rawKey || 'sb-placeholder-anon-key-not-configured'

if (!isSupabaseConfigured) {
  console.error(
    '[Supabase] Set VITE_SUPABASE_URL (https://YOUR_REF.supabase.co) and VITE_SUPABASE_ANON_KEY (long JWT from Dashboard → API) in .env.local — not the .env.example placeholders. Remove quotes around values if present. Then restart: npm run dev:vite'
  )
}

/** Avoid hung “Signing in…” when HTTPS to *.supabase.co never completes (VPN, ad block, embedded browser). */
export const SUPABASE_FETCH_TIMEOUT_MS = 35000
function fetchWithTimeout(resource, init = {}) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)
  const parent = init.signal
  if (parent) {
    if (parent.aborted) controller.abort()
    else parent.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return fetch(resource, { ...init, signal: controller.signal }).finally(() => clearTimeout(id))
}

/**
 * Browser-only check: can this machine reach your Supabase project?
 * Uses native fetch (not the client’s 35s wrapper) so login can show a quick diagnostic.
 */
export async function checkSupabaseBrowserReachable() {
  if (!isSupabaseConfigured) {
    return { ok: false, detail: "Supabase env not set" }
  }
  const base = String(supabaseUrl || "").replace(/\/$/, "")
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), 15000)
  try {
    const r = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
    let body = ""
    try {
      body = await r.text()
    } catch {
      /* ignore */
    }
    if (r.ok) {
      return { ok: true, status: r.status, detail: body.slice(0, 160) }
    }
    return { ok: false, status: r.status, detail: body.slice(0, 200) || `HTTP ${r.status}` }
  } catch (e) {
    const msg =
      e?.name === "AbortError" ? "Timed out after 15s (network or firewall)" : String(e?.message || e)
    return { ok: false, detail: msg }
  } finally {
    clearTimeout(id)
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

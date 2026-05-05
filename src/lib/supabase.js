import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\\n/g, '').trim()
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '').replace(/\\n/g, '').trim()

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'coachcrm-auth-token',
    // S-08: cap the JWT lifetime. Supabase project must be configured to
    // match — the client-side value enforces local session expiry even if
    // the server allows longer tokens.
    // 3600 = 1 hour access token; refresh token rotates on every use.
    tokenRefreshMargin: 60,  // refresh 60 s before expiry (default is 10 s)
  },
})

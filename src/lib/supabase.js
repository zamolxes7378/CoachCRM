import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    // Use a unique storage key to avoid lock contention across tabs
    storageKey: 'coachcrm-auth-token',
    // Disable lock to prevent "Lock stolen" errors with multiple tabs
    lock: undefined,
  },
})

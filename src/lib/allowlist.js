import { supabase } from './supabase'

/**
 * Check whether an email is allowed to sign in.
 *
 * Primary source: `allowed_emails` table (Track C).
 * Fallback: comma-separated VITE_ALLOWED_EMAILS env var.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function isEmailAllowed(email) {
  const normalised = email.trim().toLowerCase()

  try {
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', normalised)
      .maybeSingle()

    if (!error && data) {
      return true
    }
    // Fall through to env-var stopgap on error or no row found.
  } catch (_) {
    // Network / permission error — fall through to stopgap.
  }

  // Stopgap: consult VITE_ALLOWED_EMAILS (comma-separated list).
  const envList = import.meta.env.VITE_ALLOWED_EMAILS || ''
  if (!envList.trim()) return false

  return envList
    .split(',')
    .map(e => e.trim().toLowerCase())
    .includes(normalised)
}

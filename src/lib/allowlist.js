import { supabase } from './supabase'

/**
 * Check whether an email is allowed to sign in.
 *
 * Primary source: `allowed_emails` table (Track C).
 * Fallback: comma-separated VITE_ALLOWED_EMAILS env var.
 *
 * DEPLOY-ORDERING CONSTRAINT: This module queries the `allowed_emails` table
 * which is created by the Track C database migrations. If Track B (this branch)
 * is deployed to Vercel BEFORE Track C migrations are applied AND the
 * VITE_ALLOWED_EMAILS env var is unset, every pilot user will be locked out
 * immediately on deploy (the table query fails, the env-var fallback returns
 * false, all logins are denied).
 *
 * Safe options before deploying this branch:
 *   (a) Apply Track C Supabase migrations first so the `allowed_emails` table
 *       already exists; OR
 *   (b) Set VITE_ALLOWED_EMAILS=anne-chantal.meyer@gmail.com,claudia@kotech.ai
 *       in Vercel environment variables BEFORE triggering the deployment.
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

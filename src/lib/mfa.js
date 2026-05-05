/**
 * MFA helpers — wraps Supabase MFA enroll/challenge/verify APIs.
 * Supabase-js v2: supabase.auth.mfa.*
 */
import { supabase } from './supabase'

/**
 * Start a TOTP enrollment. Returns { id, totp: { qr_code, secret, uri } }.
 * qr_code is a data-URI SVG usable directly in <img src=...>.
 */
export async function enrollTotp() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
  if (error) throw error
  return data
}

/**
 * Challenge an already-enrolled TOTP factor.
 * Returns { id } — the challenge id needed for verify.
 */
export async function challengeTotp(factorId) {
  const { data, error } = await supabase.auth.mfa.challenge({ factorId })
  if (error) throw error
  return data
}

/**
 * Verify a TOTP challenge.
 * @param {string} factorId   — from enrollTotp() or listFactors()
 * @param {string} challengeId — from challengeTotp()
 * @param {string} code        — 6-digit user input
 */
export async function verifyTotp(factorId, challengeId, code) {
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
  if (error) throw error
  return data
}

/**
 * Returns the user's enrolled MFA factors.
 * @returns {{ totp: Factor[] }}
 */
export async function listFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw error
  return data
}

/**
 * Returns the current assurance level for the active session.
 * 'aal1' = password/OAuth only; 'aal2' = MFA verified.
 */
export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return data // { currentLevel, nextLevel, currentAuthenticationMethods }
}

/**
 * Convenience: perform a challenge+verify in one call.
 */
export async function challengeAndVerify(factorId, code) {
  const { id: challengeId } = await challengeTotp(factorId)
  return verifyTotp(factorId, challengeId, code)
}

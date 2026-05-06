/**
 * dsarService.js
 * DSAR (Demande de Droits des Personnes — RGPD) — workflow service.
 *
 * Supports:
 *  - listRequests()        admin: list all DSAR tickets
 *  - createRequest()       admin: open a new ticket
 *  - updateRequest()       admin: update status/notes
 *  - generateAccessZip()   admin: produce downloadable JSON of subject's rows
 *  - triggerErasure()      admin: anonymise all rows for a given email
 */

import { supabase } from '../lib/supabase.js'

// ─── helpers ──────────────────────────────────────────────────────────────────

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── DSAR ticket CRUD ─────────────────────────────────────────────────────────

export async function listRequests() {
  const { data, error } = await supabase
    .from('dsar_requests')
    .select('*')
    .order('raised_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createRequest({ subjectEmail, requestType, notes = '' }) {
  const { data, error } = await supabase
    .from('dsar_requests')
    .insert({
      subject_email: subjectEmail,
      request_type:  requestType,
      status:        'pending',
      notes:         notes || null,
      raised_at:     new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRequest(id, fields) {
  const allowed = ['status', 'notes', 'fulfilled_at', 'handler_id']
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([k]) => allowed.includes(k))
  )
  const { data, error } = await supabase
    .from('dsar_requests')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Access right: generate downloadable archive ──────────────────────────────

/**
 * generateAccessZip(dsarRequestId, subjectEmail)
 *
 * Queries all tables for rows referencing the subject's email,
 * then downloads a JSON file. Marks the DSAR ticket as fulfilled.
 *
 * Note: matches on partner_a.email / partner_b.email inside JSONB
 * and on contacts.note (no direct email field on contacts).
 */
export async function generateAccessZip(dsarRequestId, subjectEmail) {
  const email = subjectEmail.toLowerCase().trim()

  // Fetch clients where partner_a or partner_b email matches
  const { data: clients, error: ce } = await supabase
    .from('clients')
    .select('*')
    .or(
      `partner_a->>email.ilike.${email},partner_b->>email.ilike.${email}`
    )
  if (ce) throw ce

  const clientIds = (clients || []).map(c => c.id)

  // Fetch related sessions, reports, contacts
  const [sessionsRes, reportsRes, contactsRes] = await Promise.all([
    clientIds.length
      ? supabase.from('sessions').select('*').in('client_id', clientIds)
      : { data: [], error: null },
    clientIds.length
      ? supabase.from('reports').select('*').in('client_id', clientIds)
      : { data: [], error: null },
    clientIds.length
      ? supabase.from('contacts').select('*').in('client_id', clientIds)
      : { data: [], error: null },
  ])

  if (sessionsRes.error) throw sessionsRes.error
  if (reportsRes.error)  throw reportsRes.error
  if (contactsRes.error) throw contactsRes.error

  const archive = {
    generated_at:  new Date().toISOString(),
    subject_email: email,
    dsar_request_id: dsarRequestId,
    legal_basis:   'RGPD Art.15 — Droit d\'accès',
    data: {
      clients:  clients   || [],
      sessions: sessionsRes.data || [],
      reports:  reportsRes.data  || [],
      contacts: contactsRes.data || [],
    },
  }

  const filename = `dsar_access_${email.replace(/[^a-z0-9]/g, '_')}_${Date.now()}.json`
  downloadJson(filename, archive)

  // Mark as fulfilled
  await updateRequest(dsarRequestId, {
    status:       'fulfilled',
    fulfilled_at: new Date().toISOString(),
  })

  return { filename, counts: {
    clients:  (clients || []).length,
    sessions: (sessionsRes.data || []).length,
    reports:  (reportsRes.data  || []).length,
    contacts: (contactsRes.data || []).length,
  }}
}

// ─── Erasure right: anonymise in place ────────────────────────────────────────

/**
 * triggerErasure(dsarRequestId, subjectEmail)
 *
 * Sets retention_until = now() on all matching rows so that the next
 * purge_expired_data() run will anonymise them.
 * For immediate effect, also calls purge_expired_data(false) via RPC if
 * available (no-op if function doesn't exist yet).
 *
 * Note: accounting records (invoices) are NOT erased — they follow the 7-year
 * accounting retention regime per French law (Code général des impôts Art.54).
 */
export async function triggerErasure(dsarRequestId, subjectEmail) {
  const email = subjectEmail.toLowerCase().trim()
  const now = new Date().toISOString()

  const { data: clients, error: ce } = await supabase
    .from('clients')
    .select('id')
    .or(
      `partner_a->>email.ilike.${email},partner_b->>email.ilike.${email}`
    )
  if (ce) throw ce

  const clientIds = (clients || []).map(c => c.id)

  if (clientIds.length > 0) {
    // Set retention_until = now so purge picks them up immediately
    await Promise.all([
      supabase.from('clients')
        .update({ retention_until: now })
        .in('id', clientIds),
      supabase.from('sessions')
        .update({ retention_until: now })
        .in('client_id', clientIds),
      supabase.from('reports')
        .update({ retention_until: now })
        .in('client_id', clientIds),
      supabase.from('contacts')
        .update({ retention_until: now })
        .in('client_id', clientIds),
    ])

    // Trigger immediate purge via RPC (best-effort)
    try {
      await supabase.rpc('purge_expired_data', { dry_run: false })
    } catch (_) {
      // purge_expired_data may not be available; retention_until is set
      // and will be processed on next scheduled run.
    }
  }

  await updateRequest(dsarRequestId, {
    status:       'fulfilled',
    fulfilled_at: now,
    notes:        `Effacement déclenché pour ${email}. ${clientIds.length} dossier(s) marqué(s) pour anonymisation.`,
  })

  return { clientIds }
}

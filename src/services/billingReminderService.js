import { supabase } from '../lib/supabase.js'

// Helper to fetch all rows circumventing Supabase's max_rows API limit
async function fetchAllRows(queryBuilder) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await queryBuilder.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return { data: allData, error: null };
}

import { todayIso } from '../lib/date'

// ============================================
// Billing Reminders CRUD
// ============================================
// NOTE: These are payment reminders, not legally compliant invoices.
// Full Factur-X / L441-9 compliance is planned for Phase 2 (Q3 2026).
// See docs/compliance/factur-x_roadmap.md and docs/compliance/invoice_content_gap.md.

/**
 * Get all billing reminders for a user, with their linked session IDs.
 */
export async function getBillingReminders(userId) {
    const { data, error } = await fetchAllRows(supabase
        .from('invoices')
        .select(`
      *,
      invoice_sessions ( session_id )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    )
    if (error) throw new Error(`getBillingReminders failed: ${error.message}`)
    return data || []
}

/**
 * Get all billing reminders for a specific client.
 */
export async function getBillingRemindersByClient(clientId) {
    const { data, error } = await fetchAllRows(supabase
        .from('invoices')
        .select(`
      *,
      invoice_sessions ( session_id )
    `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
    )
    if (error) throw new Error(`getBillingRemindersByClient failed: ${error.message}`)
    return data || []
}

/**
 * Create a new billing reminder with linked sessions.
 */
export async function createBillingReminder({ userId, clientId, sessionIds, invoiceDate }) {
    // 1. Create the billing reminder
    const { data: reminder, error: remError } = await supabase
        .from('invoices')
        .insert({
            user_id: userId,
            client_id: clientId,
            invoice_date: invoiceDate || todayIso(),
            sent: false,
        })
        .select()
        .single()
    if (remError) throw new Error(`createBillingReminder failed: ${remError.message}`)

    // 2. Link sessions
    if (sessionIds?.length) {
        const links = sessionIds.map(sid => ({ invoice_id: reminder.id, session_id: sid }))
        const { error: linkError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (linkError) throw new Error(`createBillingReminder session link failed: ${linkError.message}`)
    }

    return { ...reminder, invoice_sessions: (sessionIds || []).map(sid => ({ session_id: sid })) }
}

/**
 * Update billing reminder metadata (date, sent status).
 */
export async function updateBillingReminder(reminderId, updates) {
    const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', reminderId)
        .select()
        .single()
    if (error) throw new Error(`updateBillingReminder failed: ${error.message}`)
    return data
}

/**
 * Emit a billing reminder (mark as sent).
 */
export async function emitBillingReminder(reminderId) {
    return updateBillingReminder(reminderId, { sent: true, sent_at: new Date().toISOString() })
}

/**
 * Un-emit a billing reminder (return to draft).
 */
export async function unemitBillingReminder(reminderId) {
    return updateBillingReminder(reminderId, { sent: false, sent_at: null })
}

/**
 * Add a session to an existing billing reminder.
 */
export async function addSessionToBillingReminder(reminderId, sessionId) {
    const { error } = await supabase
        .from('invoice_sessions')
        .insert({ invoice_id: reminderId, session_id: sessionId })
    if (error) throw new Error(`addSessionToBillingReminder failed: ${error.message}`)
    return true
}

/**
 * Remove a session from a billing reminder.
 */
export async function removeSessionFromBillingReminder(reminderId, sessionId) {
    const { error } = await supabase
        .from('invoice_sessions')
        .delete()
        .eq('invoice_id', reminderId)
        .eq('session_id', sessionId)
    if (error) throw new Error(`removeSessionFromBillingReminder failed: ${error.message}`)
    return true
}

/**
 * Replace all sessions on a billing reminder (set exact list).
 */
export async function setBillingReminderSessions(reminderId, sessionIds) {
    // Remove all existing links
    const { error: delError } = await supabase
        .from('invoice_sessions')
        .delete()
        .eq('invoice_id', reminderId)
    if (delError) throw new Error(`setBillingReminderSessions delete failed: ${delError.message}`)

    // Insert new links
    if (sessionIds.length) {
        const links = sessionIds.map(sid => ({ invoice_id: reminderId, session_id: sid }))
        const { error: insError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (insError) throw new Error(`setBillingReminderSessions insert failed: ${insError.message}`)
    }
    return true
}

/**
 * Delete a billing reminder and all its session links (cascade).
 */
export async function deleteBillingReminder(reminderId) {
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', reminderId)
    if (error) throw new Error(`deleteBillingReminder failed: ${error.message}`)
    return true
}

// ---------------------------------------------------------------------------
// Backwards-compat aliases — old names still work for existing callers
// ---------------------------------------------------------------------------
export const getInvoices = getBillingReminders
export const getInvoicesByClient = getBillingRemindersByClient
export const createInvoice = createBillingReminder
export const updateInvoice = updateBillingReminder
export const emitInvoice = emitBillingReminder
export const unemitInvoice = unemitBillingReminder
export const addSessionToInvoice = addSessionToBillingReminder
export const removeSessionFromInvoice = removeSessionFromBillingReminder
export const setInvoiceSessions = setBillingReminderSessions
export const deleteInvoice = deleteBillingReminder

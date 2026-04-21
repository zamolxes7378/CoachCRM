import { supabase } from '../lib/supabase.js'

// ============================================
// Invoices CRUD
// ============================================

/**
 * Get all invoices for a user, with their linked session IDs.
 */
export async function getInvoices(userId) {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      invoice_sessions ( session_id )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) console.error('getInvoices error:', error.message)
    return data || []
}

/**
 * Get all invoices for a specific client.
 */
export async function getInvoicesByClient(clientId) {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
      *,
      invoice_sessions ( session_id )
    `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
    if (error) console.error('getInvoicesByClient error:', error.message)
    return data || []
}

/**
 * Create a new invoice with linked sessions.
 */
export async function createInvoice({ userId, clientId, sessionIds, invoiceDate }) {
    // 1. Create the invoice
    const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .insert({
            user_id: userId,
            client_id: clientId,
            invoice_date: invoiceDate || new Date().toISOString().slice(0, 10),
            sent: false,
        })
        .select()
        .single()
    if (invError) { console.error('createInvoice error:', invError.message); return null }

    // 2. Link sessions
    if (sessionIds?.length) {
        const links = sessionIds.map(sid => ({ invoice_id: invoice.id, session_id: sid }))
        const { error: linkError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (linkError) console.error('createInvoice link error:', linkError.message)
    }

    return { ...invoice, invoice_sessions: (sessionIds || []).map(sid => ({ session_id: sid })) }
}

/**
 * Update invoice metadata (date, sent status).
 */
export async function updateInvoice(invoiceId, updates) {
    const { data, error } = await supabase
        .from('invoices')
        .update(updates)
        .eq('id', invoiceId)
        .select()
        .single()
    if (error) console.error('updateInvoice error:', error.message)
    return data
}

/**
 * Emit an invoice (mark as sent).
 */
export async function emitInvoice(invoiceId) {
    return updateInvoice(invoiceId, { sent: true, sent_at: new Date().toISOString() })
}

/**
 * Un-emit an invoice (return to draft).
 */
export async function unemitInvoice(invoiceId) {
    return updateInvoice(invoiceId, { sent: false, sent_at: null })
}

/**
 * Add a session to an existing invoice.
 */
export async function addSessionToInvoice(invoiceId, sessionId) {
    const { error } = await supabase
        .from('invoice_sessions')
        .insert({ invoice_id: invoiceId, session_id: sessionId })
    if (error) console.error('addSessionToInvoice error:', error.message)
    return !error
}

/**
 * Remove a session from an invoice.
 */
export async function removeSessionFromInvoice(invoiceId, sessionId) {
    const { error } = await supabase
        .from('invoice_sessions')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('session_id', sessionId)
    if (error) console.error('removeSessionFromInvoice error:', error.message)
    return !error
}

/**
 * Replace all sessions on an invoice (set exact list).
 */
export async function setInvoiceSessions(invoiceId, sessionIds) {
    // Remove all existing links
    const { error: delError } = await supabase
        .from('invoice_sessions')
        .delete()
        .eq('invoice_id', invoiceId)
    if (delError) { console.error('setInvoiceSessions delete error:', delError.message); return false }

    // Insert new links
    if (sessionIds.length) {
        const links = sessionIds.map(sid => ({ invoice_id: invoiceId, session_id: sid }))
        const { error: insError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (insError) { console.error('setInvoiceSessions insert error:', insError.message); return false }
    }
    return true
}

/**
 * Delete an invoice and all its session links (cascade).
 */
export async function deleteInvoice(invoiceId) {
    const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId)
    if (error) console.error('deleteInvoice error:', error.message)
    return !error
}

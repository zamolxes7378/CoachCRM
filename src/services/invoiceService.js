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
    if (error) throw new Error(`getInvoices failed: ${error.message}`)
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
    if (error) throw new Error(`getInvoicesByClient failed: ${error.message}`)
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
    if (invError) throw new Error(`createInvoice failed: ${invError.message}`)

    // 2. Link sessions
    if (sessionIds?.length) {
        const links = sessionIds.map(sid => ({ invoice_id: invoice.id, session_id: sid }))
        const { error: linkError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (linkError) throw new Error(`createInvoice session link failed: ${linkError.message}`)
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
    if (error) throw new Error(`updateInvoice failed: ${error.message}`)
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
    if (error) throw new Error(`addSessionToInvoice failed: ${error.message}`)
    return true
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
    if (error) throw new Error(`removeSessionFromInvoice failed: ${error.message}`)
    return true
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
    if (delError) throw new Error(`setInvoiceSessions delete failed: ${delError.message}`)

    // Insert new links
    if (sessionIds.length) {
        const links = sessionIds.map(sid => ({ invoice_id: invoiceId, session_id: sid }))
        const { error: insError } = await supabase
            .from('invoice_sessions')
            .insert(links)
        if (insError) throw new Error(`setInvoiceSessions insert failed: ${insError.message}`)
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
    if (error) throw new Error(`deleteInvoice failed: ${error.message}`)
    return true
}

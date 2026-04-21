import { supabase } from '../lib/supabase.js'

// ============================================
// Users
// ============================================
export async function getCurrentUser(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  if (error) throw new Error(`getCurrentUser failed: ${error.message}`)
  return data
}

export async function upsertUser({ id, name, email, role = 'therapist', photo_url = null }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ id, name, email, role, photo_url }, { onConflict: 'email' })
    .select()
    .single()
  if (error) throw new Error(`upsertUser failed: ${error.message}`)
  return data
}

// ============================================
// Clients
// ============================================
export async function getClients(userId) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, user_id, type, phase, status, source, start_date, created_at, updated_at, deleted_at, session_rate, session_frequency, billing_address, note_dynamique, note_axes, note_vigilance, note_objectifs, client_links, external_referrer, referred_by, prospect_stage, partner_a, partner_b')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getClients failed: ${error.message}`)
  return data || []
}

export async function getClient(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  if (error) throw new Error(`getClient failed: ${error.message}`)
  return data
}

export async function createClient(client) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()
  if (error) throw new Error(`createClient failed: ${error.message}`)
  return data
}

export async function updateClient(clientId, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single()
  if (error) throw new Error(`updateClient failed: ${error.message}`)
  return data
}

export async function deleteClient(clientId) {
  // ON DELETE CASCADE declared on reports.client_id, sessions.client_id, contacts.client_id
  // in migration.sql — deleting the client row cascades to all children automatically.
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) throw new Error(`deleteClient failed: ${error.message}`)
  return true
}

// ============================================
// Sessions
// ============================================
export async function getSessions(userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw new Error(`getSessions failed: ${error.message}`)
  return data || []
}

export async function getSessionsByClient(clientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: true })
  if (error) throw new Error(`getSessionsByClient failed: ${error.message}`)
  return data || []
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single()
  if (error) throw new Error(`createSession failed: ${error.message}`)
  return data
}

export async function updateSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw new Error(`updateSession failed: ${error.message}`)
  return data
}

export async function deleteSession(sessionId) {
  // Delete related reports first
  await supabase.from('reports').delete().eq('session_id', sessionId)
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) throw new Error(`deleteSession failed: ${error.message}`)
  return true
}

export async function deleteSessions(sessionIds) {
  if (!sessionIds?.length) return false
  // Delete related reports first
  await supabase.from('reports').delete().in('session_id', sessionIds)
  const { error } = await supabase.from('sessions').delete().in('id', sessionIds)
  if (error) throw new Error(`deleteSessions failed: ${error.message}`)
  return true
}

// ============================================
// Reports
// ============================================
export async function getReports(userId) {
  // Filter by client_id scoped to the user's own clients (RLS on reports enforces this via
  // client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())).
  // The previous sessions!inner(user_id) join was redundant and expensive.
  const { data, error } = await supabase
    .from('reports')
    .select('id, client_id, session_id, date, content, tags, client_name, session_number, narrative, themes, emotions_a, emotions_b, patterns, progress, vigilance, exercises, pedagogical_content, created_at')
    .order('date', { ascending: false })
  if (error) throw new Error(`getReports failed: ${error.message}`)
  return data || []
}

export async function createReport(report) {
  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single()
  if (error) throw new Error(`createReport failed: ${error.message}`)
  return data
}

// ============================================
// Therapy Cycles
// ============================================
export async function getTherapyCycles(userId) {
  const { data, error } = await supabase
    .from('therapy_cycles')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false })
  if (error) throw new Error(`getTherapyCycles failed: ${error.message}`)
  return data || []
}

export async function createTherapyCycle(cycle) {
  const { data, error } = await supabase
    .from('therapy_cycles')
    .insert(cycle)
    .select()
    .single()
  if (error) throw new Error(`createTherapyCycle failed: ${error.message}`)
  return data
}

export async function updateTherapyCycle(cycleId, updates) {
  const { data, error } = await supabase
    .from('therapy_cycles')
    .update(updates)
    .eq('id', cycleId)
    .select()
    .single()
  if (error) throw new Error(`updateTherapyCycle failed: ${error.message}`)
  return data
}

export async function deleteTherapyCycle(cycleId) {
  const { error } = await supabase
    .from('therapy_cycles')
    .delete()
    .eq('id', cycleId)
  if (error) throw new Error(`deleteTherapyCycle failed: ${error.message}`)
  return true
}

// ============================================
// Contacts
// ============================================
export async function getContacts(userId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  if (error) throw new Error(`getContacts failed: ${error.message}`)
  return data || []
}

export async function getContactsByClient(clientId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) throw new Error(`getContactsByClient failed: ${error.message}`)
  return data || []
}

export async function createContact(contact) {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single()
  if (error) throw new Error(`createContact failed: ${error.message}`)
  return data
}

export async function updateContact(contactId, updates) {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single()
  if (error) throw new Error(`updateContact failed: ${error.message}`)
  return data
}

export async function deleteContact(contactId) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
  if (error) throw new Error(`deleteContact failed: ${error.message}`)
  return true
}

// ============================================
// Settings
// ============================================
export async function getSettings(userId) {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`getSettings failed: ${error.message}`)
  return data
}

export async function upsertSettings(userId, settings) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw new Error(`upsertSettings failed: ${error.message}`)
  return data
}

// ============================================
// Professionals
// ============================================
export async function getProfessionals(userId) {
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`getProfessionals failed: ${error.message}`)
  return data || []
}

export async function createProfessional(professional) {
  const { data, error } = await supabase
    .from('professionals')
    .insert(professional)
    .select()
    .single()
  if (error) throw new Error(`createProfessional failed: ${error.message}`)
  return data
}

export async function updateProfessional(professionalId, updates) {
  const { data, error } = await supabase
    .from('professionals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', professionalId)
    .select()
    .single()
  if (error) throw new Error(`updateProfessional failed: ${error.message}`)
  return data
}

export async function deleteProfessional(professionalId) {
  const { error } = await supabase
    .from('professionals')
    .delete()
    .eq('id', professionalId)
  if (error) throw new Error(`deleteProfessional failed: ${error.message}`)
  return true
}

export async function deleteProfessionals(professionalIds) {
  if (!professionalIds?.length) return false
  const { error } = await supabase.from('professionals').delete().in('id', professionalIds)
  if (error) throw new Error(`deleteProfessionals failed: ${error.message}`)
  return true
}

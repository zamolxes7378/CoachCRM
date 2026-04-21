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
  if (error) console.error('getUser error:', error.message)
  return data
}

export async function upsertUser({ id, name, email, role = 'therapist', photo_url = null }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ id, name, email, role, photo_url }, { onConflict: 'email' })
    .select()
    .single()
  if (error) console.error('upsertUser error:', error.message)
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
  if (error) console.error('getClients error:', error.message)
  return data || []
}

export async function getClient(clientId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()
  if (error) console.error('getClient error:', error.message)
  return data
}

export async function createClient(client) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()
  if (error) console.error('createClient error:', error.message)
  return data
}

export async function updateClient(clientId, updates) {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .select()
    .single()
  if (error) console.error('updateClient error:', error.message)
  return data
}

export async function deleteClient(clientId) {
  // ON DELETE CASCADE declared on reports.client_id, sessions.client_id, contacts.client_id
  // in migration.sql — deleting the client row cascades to all children automatically.
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) console.error('deleteClient error:', error.message)
  return !error
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
  if (error) console.error('getSessions error:', error.message)
  return data || []
}

export async function getSessionsByClient(clientId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: true })
  if (error) console.error('getSessionsByClient error:', error.message)
  return data || []
}

export async function createSession(session) {
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single()
  if (error) console.error('createSession error:', error.message)
  return data
}

export async function updateSession(sessionId, updates) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single()
  if (error) console.error('updateSession error:', error.message)
  return data
}

export async function deleteSession(sessionId) {
  // Delete related reports first
  await supabase.from('reports').delete().eq('session_id', sessionId)
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
  if (error) console.error('deleteSession error:', error.message)
  return !error
}

export async function deleteSessions(sessionIds) {
  if (!sessionIds?.length) return false
  // Delete related reports first
  await supabase.from('reports').delete().in('session_id', sessionIds)
  const { error } = await supabase.from('sessions').delete().in('id', sessionIds)
  if (error) console.error('deleteSessions error:', error.message)
  return !error
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
  if (error) console.error('getReports error:', error.message)
  return data || []
}

export async function createReport(report) {
  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single()
  if (error) console.error('createReport error:', error.message)
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
  if (error) console.error('getTherapyCycles error:', error.message)
  return data || []
}

export async function createTherapyCycle(cycle) {
  const { data, error } = await supabase
    .from('therapy_cycles')
    .insert(cycle)
    .select()
    .single()
  if (error) console.error('createTherapyCycle error:', error.message)
  return data
}

export async function updateTherapyCycle(cycleId, updates) {
  const { data, error } = await supabase
    .from('therapy_cycles')
    .update(updates)
    .eq('id', cycleId)
    .select()
    .single()
  if (error) console.error('updateTherapyCycle error:', error.message)
  return data
}

export async function deleteTherapyCycle(cycleId) {
  const { error } = await supabase
    .from('therapy_cycles')
    .delete()
    .eq('id', cycleId)
  if (error) console.error('deleteTherapyCycle error:', error.message)
  return !error
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
  if (error) console.error('getContacts error:', error.message)
  return data || []
}

export async function getContactsByClient(clientId) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
  if (error) console.error('getContactsByClient error:', error.message)
  return data || []
}

export async function createContact(contact) {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single()
  if (error) console.error('createContact error:', error.message)
  return data
}

export async function updateContact(contactId, updates) {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select()
    .single()
  if (error) console.error('updateContact error:', error.message)
  return data
}

export async function deleteContact(contactId) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
  if (error) console.error('deleteContact error:', error.message)
  return !error
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
  if (error && error.code !== 'PGRST116') console.error('getSettings error:', error.message)
  return data
}

export async function upsertSettings(userId, settings) {
  const { data, error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) console.error('upsertSettings error:', error.message)
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
  if (error) console.error('getProfessionals error:', error.message)
  return data || []
}

export async function createProfessional(professional) {
  const { data, error } = await supabase
    .from('professionals')
    .insert(professional)
    .select()
    .single()
  if (error) console.error('createProfessional error:', error.message)
  return data
}

export async function updateProfessional(professionalId, updates) {
  const { data, error } = await supabase
    .from('professionals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', professionalId)
    .select()
    .single()
  if (error) console.error('updateProfessional error:', error.message)
  return data
}

export async function deleteProfessional(professionalId) {
  const { error } = await supabase
    .from('professionals')
    .delete()
    .eq('id', professionalId)
  if (error) console.error('deleteProfessional error:', error.message)
  return !error
}

export async function deleteProfessionals(professionalIds) {
  if (!professionalIds?.length) return false
  const { error } = await supabase.from('professionals').delete().in('id', professionalIds)
  if (error) console.error('deleteProfessionals error:', error.message)
  return !error
}

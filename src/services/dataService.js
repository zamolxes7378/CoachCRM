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

export async function upsertUser({ name, email, role = 'therapist', photo_url = null }) {
  const { data, error } = await supabase
    .from('users')
    .upsert({ name, email, role, photo_url }, { onConflict: 'email' })
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
    .select('*')
    .eq('user_id', userId)
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

// ============================================
// Reports
// ============================================
export async function getReports(userId) {
  const { data, error } = await supabase
    .from('reports')
    .select('*, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)
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
// Contacts
// ============================================
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

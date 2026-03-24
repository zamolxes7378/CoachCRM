import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import * as ds from '../services/dataService'
import {
  therapyPhases, defaultTherapyConfig, recruitmentSources as defaultSources,
  sessionRates as defaultRates, prospectStages,
  getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
  getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
  formatDate, formatTime, formatRelativeDate, getTodaySessions,
  mockCouples as demoClients, mockSessions as demoSessions,
  mockReports as demoReports, mockProfessionals as demoProfessionals
} from '../data/mockData'

const DataContext = createContext(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

// ── Adapters: Supabase → App format ──
// Maps snake_case DB fields to camelCase used by pages

function adaptClient(c) {
  if (!c) return c
  return {
    ...c,
    // Map snake_case to camelCase for compatibility
    partnerA: c.partner_a,
    partnerB: c.partner_b,
    startDate: c.start_date,
    sessionsCount: c.sessions_count,
    totalSessions: c.total_sessions,
    nextSession: c.next_session,
    lastSession: c.last_session,
    emotionalMaturity: c.emotional_maturity,
    emotionalMaturityHistory: c.emotional_maturity_history || [],
    prospectStage: c.prospect_stage,
    referredBy: c.referred_by,
    deletedAt: c.deleted_at,
    deleted: !!c.deleted_at,
    // keep id as-is (UUID)
  }
}

function adaptSession(s) {
  if (!s) return s
  // Strip timezone suffix from dates (Supabase returns timestamptz as UTC,
  // but datetime-local input is local time — treat stored dates as local)
  const stripTz = (d) => d ? d.replace(/([+-]\d{2}:\d{2}|Z)$/, '') : d
  return {
    ...s,
    date: stripTz(s.date),
    coupleId: s.client_id,
    audioFile: s.audio_file,
    hasReport: s.has_report,
    paymentMethod: s.payment_method,
    paymentReceived: s.payment_received,
    paymentStatus: s.payment_status,
    paymentAmount: s.payment_amount,
    paymentDate: s.payment_date,
    cancellationReason: s.cancellation_reason,
    needsInvoice: s.needs_invoice,
    invoiceSent: s.invoice_sent,
    invoiceDate: s.invoice_date,
    invoiceCoveredSessionIds: s.invoice_covered_session_ids,
    coveredSessionIds: s.covered_session_ids,
  }
}

function adaptReport(r) {
  if (!r) return r
  return {
    ...r,
    sessionId: r.session_id,
    coupleId: r.client_id,
    coupleName: r.couple_name,
    sessionNumber: r.session_number,
    pedagogicalContent: r.pedagogical_content || [],
    emotionsA: r.emotions_a || [],
    emotionsB: r.emotions_b || [],
  }
}

function adaptProfessional(p) {
  if (!p) return p
  return {
    ...p,
    firstName: p.first_name,
    lastName: p.last_name,
    createdAt: p.created_at,
  }
}

// Reverse adapt: App format → Supabase format (for writes)
function unadaptProfessional(p) {
  const out = { ...p }
  if ('firstName' in p) { out.first_name = p.firstName; delete out.firstName }
  if ('lastName' in p) { out.last_name = p.lastName; delete out.lastName }
  if ('createdAt' in p) { out.created_at = p.createdAt; delete out.createdAt }
  return out
}

// Reverse adapt: App format → Supabase format (for writes)
function unadaptClient(c) {
  const out = { ...c }
  if ('partnerA' in c) { out.partner_a = c.partnerA; delete out.partnerA }
  if ('partnerB' in c) { out.partner_b = c.partnerB; delete out.partnerB }
  if ('startDate' in c) { out.start_date = c.startDate; delete out.startDate }
  if ('sessionsCount' in c) { out.sessions_count = c.sessionsCount; delete out.sessionsCount }
  if ('totalSessions' in c) { out.total_sessions = c.totalSessions; delete out.totalSessions }
  if ('nextSession' in c) { out.next_session = c.nextSession; delete out.nextSession }
  if ('lastSession' in c) { out.last_session = c.lastSession; delete out.lastSession }
  if ('emotionalMaturity' in c) { out.emotional_maturity = c.emotionalMaturity; delete out.emotionalMaturity }
  if ('emotionalMaturityHistory' in c) { out.emotional_maturity_history = c.emotionalMaturityHistory; delete out.emotionalMaturityHistory }
  if ('prospectStage' in c) { out.prospect_stage = c.prospectStage; delete out.prospectStage }
  if ('referredBy' in c) { out.referred_by = c.referredBy; delete out.referredBy }
  if ('deletedAt' in c) { out.deleted_at = c.deletedAt; delete out.deletedAt }
  // Strip frontend-only fields that don't exist as DB columns
  delete out.deleted
  return out
}

function unadaptSession(s) {
  const out = { ...s }
  if ('coupleId' in s) { out.client_id = s.coupleId; delete out.coupleId }
  if ('audioFile' in s) { out.audio_file = s.audioFile; delete out.audioFile }
  if ('hasReport' in s) { out.has_report = s.hasReport; delete out.hasReport }
  if ('paymentMethod' in s) { out.payment_method = s.paymentMethod; delete out.paymentMethod }
  if ('paymentReceived' in s) { out.payment_received = s.paymentReceived; delete out.paymentReceived }
  if ('paymentStatus' in s) { out.payment_status = s.paymentStatus; delete out.paymentStatus }
  if ('paymentAmount' in s) { out.payment_amount = s.paymentAmount; delete out.paymentAmount }
  if ('paymentDate' in s) { out.payment_date = s.paymentDate; delete out.paymentDate }
  if ('cancellationReason' in s) { out.cancellation_reason = s.cancellationReason; delete out.cancellationReason }
  if ('needsInvoice' in s) { out.needs_invoice = s.needsInvoice; delete out.needsInvoice }
  if ('invoiceSent' in s) { out.invoice_sent = s.invoiceSent; delete out.invoiceSent }
  if ('invoiceDate' in s) { out.invoice_date = s.invoiceDate; delete out.invoiceDate }
  if ('invoiceCoveredSessionIds' in s) { out.invoice_covered_session_ids = s.invoiceCoveredSessionIds; delete out.invoiceCoveredSessionIds }
  if ('coveredSessionIds' in s) { out.covered_session_ids = s.coveredSessionIds; delete out.coveredSessionIds }
  return out
}

export function DataProvider({ user, children }) {
  const isDemo = user?.id === 'demo-user'
  const [rawClients, setRawClients] = useState([])
  const [rawSessions, setRawSessions] = useState([])
  const [rawReports, setRawReports] = useState([])
  const [rawProfessionals, setRawProfessionals] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      if (isDemo) {
        // Demo mode: use mockData arrays directly (no Supabase)
        setRawClients(demoClients)
        setRawSessions(demoSessions)
        setRawReports(demoReports)
        setRawProfessionals(demoProfessionals)
        setSettings(null)
      } else {
      const [c, s, r, st, p] = await Promise.all([
        ds.getClients(user.id),
        ds.getSessions(user.id),
        ds.getReports(user.id),
        ds.getSettings(user.id),
        ds.getProfessionals(user.id)
      ])
      setRawClients(c)
      setRawSessions(s)
      setRawReports(r)
      setSettings(st)
      setRawProfessionals(p)
      }
    } catch (err) {
      console.error('DataProvider load error:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // Adapted data (camelCase, compatible with existing pages)
  const clients = useMemo(() => rawClients.map(adaptClient), [rawClients])
  const sessions = useMemo(() => rawSessions.map(adaptSession).map(s => {
    // Auto-complete: sessions whose end time has passed become 'completed'
    if (s.status === 'scheduled') {
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      if (endTime <= new Date()) return { ...s, status: 'completed' }
    }
    return s
  }), [rawSessions])
  const reports = useMemo(() => rawReports.map(adaptReport), [rawReports])
  const professionals = useMemo(() => rawProfessionals.map(adaptProfessional), [rawProfessionals])

  // Derived values
  const sessionRates = { ...defaultRates, ...(settings?.session_rates || {}) }
  const recruitmentSources = settings?.recruitment_sources?.map(
    (label) => ({ key: label.toLowerCase().replace(/\s+/g, '_'), label })
  ) || defaultSources

  const value = {
    // Adapted data (pages use these as drop-in replacements for mockCouples/mockSessions)
    clients, sessions, reports, settings, loading, professionals,
    sessionRates, recruitmentSources,
    // Static helpers
    therapyPhases, defaultTherapyConfig, prospectStages,
    getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
    getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
    formatDate, formatTime, formatRelativeDate, getTodaySessions,
    // Actions (handle reverse adapting automatically)
    // In demo mode, skip Supabase calls entirely (mock data is in-memory only)
    refreshData: loadData,
    updateClient: async (id, updates) => {
      if (isDemo) return true
      const result = await ds.updateClient(id, unadaptClient(updates))
      if (result) await loadData()
      return result
    },
    createClient: async (client) => {
      if (isDemo) return true
      const result = await ds.createClient({ ...unadaptClient(client), user_id: user.id })
      if (result) await loadData()
      return result
    },
    updateSession: async (id, updates) => {
      if (isDemo) return true
      const result = await ds.updateSession(id, unadaptSession(updates))
      if (result) {
        // Auto-transition: prospect → début when first session completed
        if (updates.status === 'completed' && result.client_id) {
          const client = rawClients.find(c => c.id === result.client_id)
          if (client && client.phase === 'prospect') {
            await ds.updateClient(client.id, { phase: 'debut' })
          }
        }
        await loadData()
      }
      return result
    },
    createSession: async (session) => {
      if (isDemo) return true
      const result = await ds.createSession({ ...unadaptSession(session), user_id: user.id })
      if (result) await loadData()
      return result
    },
    createContact: async (contact) => {
      if (isDemo) return true
      const result = await ds.createContact({ ...contact, user_id: user.id })
      if (result) await loadData()
      return result
    },
    updateContact: async (...args) => {
      if (isDemo) return true
      return ds.updateContact(...args)
    },
    deleteContact: async (id) => {
      if (isDemo) return true
      const result = await ds.deleteContact(id)
      if (result) await loadData()
      return result
    },
    upsertSettings: async (settingsData) => {
      if (isDemo) return true
      const result = await ds.upsertSettings(user.id, settingsData)
      if (result) setSettings(result)
      return result
    },
    createProfessional: async (professional) => {
      if (isDemo) return true
      const result = await ds.createProfessional({ ...unadaptProfessional(professional), user_id: user.id })
      if (result) await loadData()
      return result
    },
    updateProfessional: async (id, updates) => {
      if (isDemo) return true
      const result = await ds.updateProfessional(id, unadaptProfessional(updates))
      if (result) await loadData()
      return result
    },
    deleteProfessional: async (id) => {
      if (isDemo) return true
      const result = await ds.deleteProfessional(id)
      if (result) await loadData()
      return result
    }
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

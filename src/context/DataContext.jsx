import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import * as ds from '../services/dataService'
import { Sprout, Search, Target, Award, UserPlus } from 'lucide-react'
import {
  therapyPhases as defaultPhases, defaultTherapyConfig as defaultTherapyCfg,
  recruitmentSources as defaultSources,
  sessionRates as defaultRates, prospectStages,
  getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
  getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
  formatDate, formatTime, formatRelativeDate, getTodaySessions
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

    prospectStage: c.prospect_stage,
    referredBy: c.referred_by,
    clientLinks: c.client_links || c.clientLinks || [],
    externalReferrer: c.external_referrer || c.externalReferrer || null,
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
    coupleName: r.client_name,
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

  if ('prospectStage' in c) { out.prospect_stage = c.prospectStage; delete out.prospectStage }
  if ('referredBy' in c) { out.referred_by = c.referredBy; delete out.referredBy }
  if ('clientLinks' in c) { out.client_links = c.clientLinks; delete out.clientLinks }
  if ('externalReferrer' in c) { out.external_referrer = c.externalReferrer; delete out.externalReferrer }
  if ('deletedAt' in c) { out.deleted_at = c.deletedAt; delete out.deletedAt }
  // Strip frontend-only fields that don't exist as DB columns
  delete out.deleted
  return out
}

function unadaptSession(s) {
  const out = { ...s }
  if ('coupleId' in s) { out.client_id = s.coupleId; delete out.coupleId }

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
      const [c, s, r, st, p] = await Promise.all([
        ds.getClients(user.id),
        ds.getSessions(user.id),
        ds.getReports(user.id),
        ds.getSettings(user.id),
        ds.getProfessionals(user.id)
      ])
      // Auto-complete past scheduled sessions on load
      const now = new Date()
      const rates = { ...defaultRates, ...(st?.session_rates || {}) }
      for (const sess of s) {
        if (sess.status === 'scheduled' && sess.date) {
          const endTime = new Date(new Date(sess.date).getTime() + (sess.duration || 60) * 60000)
          if (endTime <= now) {
            await ds.updateSession(sess.id, { status: 'completed' })
            sess.status = 'completed'
            // Auto-transition: prospect → client if session is free or has payment
            const client = c.find(cl => cl.id === sess.client_id)
            if (client && client.phase === 'prospect') {
              const effectiveAmount = sess.payment_amount ?? rates[client.type] ?? null
              const isFreeOrPaid = sess.payment_method || effectiveAmount === 0
              if (isFreeOrPaid) {
                await ds.updateClient(client.id, { phase: defaultPhaseKey })
                client.phase = defaultPhaseKey
              }
            }
          }
        }
      }
      setRawClients(c)
      setRawSessions(s)
      setRawReports(r)
      setSettings(st)
      setRawProfessionals(p)
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

  // Derived values — merge DB settings over defaults
  const sessionRates = { ...defaultRates, ...(settings?.session_rates || {}) }
  const recruitmentSources = settings?.recruitment_sources?.map(
    (label) => ({ key: label.toLowerCase().replace(/\s+/g, '_'), label })
  ) || defaultSources
  const therapyPhases = settings?.therapy_phases || defaultPhases
  const defaultTherapyConfig = settings?.default_therapy_config || defaultTherapyCfg
  const defaultPhaseKey = therapyPhases[0]?.key || 'debut'

  // Centralized phase icons & colors — single source of truth
  const defaultPhaseIcons = { prospect: UserPlus, debut: Sprout, analyse: Search, integration: Target, bilan_final: Award }
  const defaultPhaseColorMap = {
    prospect: { bg: '#E8D8FE', color: '#6B46C1' },
    debut: { bg: '#EBF8FF', color: '#2B6CB0' },
    analyse: { bg: '#FFF3E0', color: '#E67E22' },
    integration: { bg: '#F0FFF4', color: '#276749' },
    bilan_final: { bg: '#FAF5FF', color: '#6B46C1' }
  }
  const phaseIcons = { ...defaultPhaseIcons }
  const phaseColors = { ...defaultPhaseColorMap }
  // Ensure every custom phase has at least a fallback color/icon
  const fallbackColors = ['#2B6CB0', '#E67E22', '#276749', '#6B46C1', '#D69E2E', '#38A169', '#E53E3E']
  therapyPhases.forEach((tp, i) => {
    if (!phaseColors[tp.key]) phaseColors[tp.key] = { bg: '#F7FAFC', color: fallbackColors[i % fallbackColors.length] }
    if (!phaseIcons[tp.key]) phaseIcons[tp.key] = Sprout
  })

  // Prospect check: phase === 'prospect'
  // Note: a prospect CAN have scheduled sessions — they remain prospect until
  // a session is completed with a payment method chosen (alliance thérapeutique)
  const isProspect = useCallback((couple) => {
    if (!couple) return false
    return couple.phase === 'prospect'
  }, [])

  const value = {
    // Adapted data (pages use these as drop-in replacements for mockCouples/mockSessions)
    clients, sessions, reports, settings, loading, professionals,
    sessionRates, recruitmentSources, therapyPhases, defaultTherapyConfig,
    phaseIcons, phaseColors, defaultPhaseKey, isProspect,
    // Static helpers
    prospectStages,
    getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
    getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
    formatDate, formatTime, formatRelativeDate, getTodaySessions,
    // Actions (handle reverse adapting automatically)
    refreshData: loadData,
    updateClient: async (id, updates) => {
      const result = await ds.updateClient(id, unadaptClient(updates))
      if (result) await loadData()
      return result
    },
    createClient: async (client) => {
      const result = await ds.createClient({ ...unadaptClient(client), user_id: user.id })
      if (result) await loadData()
      return result
    },
    deleteClient: async (id) => {
      const result = await ds.deleteClient(id)
      if (result) await loadData()
      return result
    },
    updateSession: async (id, updates) => {
      // Auto-persist completion: if the session is past its end time and still 'scheduled',
      // automatically mark it as 'completed' in the DB alongside the requested update
      if (!updates.status) {
        const rawSession = rawSessions.find(s => s.id === id)
        if (rawSession && rawSession.status === 'scheduled' && rawSession.date) {
          const endTime = new Date(new Date(rawSession.date).getTime() + (rawSession.duration || 60) * 60000)
          if (endTime <= new Date()) {
            updates = { ...updates, status: 'completed' }
          }
        }
      }
      const result = await ds.updateSession(id, unadaptSession(updates))
      if (result) {
        // Auto-transition: prospect → client when session is completed AND payment method is chosen
        // (alliance thérapeutique créée — paiement peut être en attente)
        if (result.client_id) {
          const client = rawClients.find(c => c.id === result.client_id)
          if (client && client.phase === 'prospect') {
            const effectiveStatus = result.status || updates.status
            const effectivePM = result.payment_method || updates.paymentMethod || updates.payment_method
            // payment_amount may be null in DB — fall back to couple's session_rate
            const effectiveAmount = result.payment_amount ?? sessionRates[client.type] ?? null
            const isFreeOrPaid = effectivePM || effectiveAmount === 0
            if (effectiveStatus === 'completed' && isFreeOrPaid) {
              await ds.updateClient(client.id, { phase: defaultPhaseKey })
            }
          }
        }
        // Reverse transition: client → prospect when no remaining session validates the alliance
        // (alliance = completed + payment method chosen)
        if (updates.status === 'cancelled' && result.client_id) {
          const client = rawClients.find(c => c.id === result.client_id)
          if (client && client.phase !== 'prospect') {
            const validatedSessions = rawSessions.filter(
              s => s.client_id === client.id && s.id !== id && s.status === 'completed' && (s.payment_method || (s.payment_amount ?? sessionRates[client.type]) === 0)
            )
            if (validatedSessions.length === 0) {
              await ds.updateClient(client.id, { phase: 'prospect' })
            }
          }
        }
        // Reverse transition: client → prospect when payment method is removed
        if (('paymentMethod' in updates || 'payment_method' in updates) && result.client_id) {
          const effectivePM = result.payment_method
          if (!effectivePM) {
            const client = rawClients.find(c => c.id === result.client_id)
            if (client && client.phase !== 'prospect') {
              const validatedSessions = rawSessions.filter(
                s => s.client_id === client.id && s.id !== id && s.status === 'completed' && (s.payment_method || (s.payment_amount ?? sessionRates[client.type]) === 0)
              )
              if (validatedSessions.length === 0) {
                await ds.updateClient(client.id, { phase: 'prospect' })
              }
            }
          }
        }
        // Reverse transition: client → prospect when session amount changes from 0 to > 0 (no longer free)
        if (('paymentAmount' in updates || 'payment_amount' in updates) && result.client_id) {
          const newAmount = result.payment_amount
          if (newAmount > 0) {
            const client = rawClients.find(c => c.id === result.client_id)
            if (client && client.phase !== 'prospect' && !result.payment_method) {
              const validatedSessions = rawSessions.filter(
                s => s.client_id === client.id && s.id !== id && s.status === 'completed' && (s.payment_method || (s.payment_amount ?? sessionRates[client.type]) === 0)
              )
              if (validatedSessions.length === 0) {
                await ds.updateClient(client.id, { phase: 'prospect' })
              }
            }
          }
        }
        await loadData()
      }
      return result
    },
    createSession: async (session) => {
      const result = await ds.createSession({ ...unadaptSession(session), user_id: user.id })
      if (result) await loadData()
      return result
    },
    createContact: async (contact) => {
      const result = await ds.createContact({ ...contact, user_id: user.id })
      if (result) await loadData()
      return result
    },
    updateContact: async (...args) => {
      return ds.updateContact(...args)
    },
    deleteContact: async (id) => {
      const result = await ds.deleteContact(id)
      if (result) await loadData()
      return result
    },
    upsertSettings: async (settingsData) => {
      const result = await ds.upsertSettings(user.id, settingsData)
      if (result) setSettings(result)
      return result
    },
    createProfessional: async (professional) => {
      const result = await ds.createProfessional({ ...unadaptProfessional(professional), user_id: user.id })
      if (result) await loadData()
      return result
    },
    updateProfessional: async (id, updates) => {
      const result = await ds.updateProfessional(id, unadaptProfessional(updates))
      if (result) await loadData()
      return result
    },
    deleteProfessional: async (id) => {
      const result = await ds.deleteProfessional(id)
      if (result) await loadData()
      return result
    }
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

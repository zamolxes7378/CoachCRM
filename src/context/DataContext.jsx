import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import * as ds from '../services/dataService'
import { checkAllianceTransition } from '../services/allianceService'
import { adaptClient, adaptSession, adaptReport, adaptProfessional, unadaptClient, unadaptSession, unadaptProfessional } from '../data/adapters'
import { Sprout, Search, Target, Award, UserPlus } from 'lucide-react'
import {
  therapyPhases as defaultPhases, defaultTherapyConfig as defaultTherapyCfg,
  recruitmentSources as defaultSources, sessionRates as defaultRates,
  prospectStages, clientTypeLabels
} from '../data/constants'
import {
  getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
  getComputedStatus, getProspectStageInfo, getClientType,
  formatDate, formatTime, formatRelativeDate, getTodaySessions
} from '../data/helpers'

const DataContext = createContext(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

export function DataProvider({ user, children }) {
  const [rawClients, setRawClients] = useState([])
  const [rawSessions, setRawSessions] = useState([])
  const [rawReports, setRawReports] = useState([])
  const [rawProfessionals, setRawProfessionals] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // Derived values — merge DB settings over defaults
  const sessionRates = { ...defaultRates, ...(settings?.session_rates || {}) }
  const recruitmentSources = settings?.recruitment_sources?.map(
    (label) => ({ key: label.toLowerCase().replace(/\s+/g, '_'), label })
  ) || defaultSources
  const therapyPhases = settings?.therapy_phases || defaultPhases
  const defaultTherapyConfig = settings?.default_therapy_config || defaultTherapyCfg
  const defaultPhaseKey = therapyPhases[0]?.key || 'debut'

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
      const phaseKey = (st?.therapy_phases || defaultPhases)[0]?.key || 'debut'
      for (const sess of s) {
        if (sess.status === 'scheduled' && sess.date) {
          const endTime = new Date(new Date(sess.date).getTime() + (sess.duration || 60) * 60000)
          if (endTime <= now) {
            await ds.updateSession(sess.id, { status: 'completed' })
            sess.status = 'completed'
            const client = c.find(cl => cl.id === sess.client_id)
            if (client && client.phase === 'prospect') {
              const effectiveAmount = sess.payment_amount ?? rates[client.type] ?? null
              const isFreeOrPaid = sess.payment_method || effectiveAmount === 0
              if (isFreeOrPaid) {
                await ds.updateClient(client.id, { phase: phaseKey })
                client.phase = phaseKey
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
    if (s.status === 'scheduled') {
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      if (endTime <= new Date()) return { ...s, status: 'completed' }
    }
    return s
  }), [rawSessions])
  const reports = useMemo(() => rawReports.map(adaptReport), [rawReports])
  const professionals = useMemo(() => rawProfessionals.map(adaptProfessional), [rawProfessionals])

  // Phase icons & colors — single source of truth
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
  const fallbackColors = ['#2B6CB0', '#E67E22', '#276749', '#6B46C1', '#D69E2E', '#38A169', '#E53E3E']
  therapyPhases.forEach((tp, i) => {
    if (!phaseColors[tp.key]) phaseColors[tp.key] = { bg: '#F7FAFC', color: fallbackColors[i % fallbackColors.length] }
    if (!phaseIcons[tp.key]) phaseIcons[tp.key] = Sprout
  })

  const isProspect = useCallback((couple) => {
    if (!couple) return false
    return couple.phase === 'prospect'
  }, [])

  const value = {
    clients, sessions, reports, settings, loading, professionals,
    sessionRates, recruitmentSources, therapyPhases, defaultTherapyConfig,
    phaseIcons, phaseColors, defaultPhaseKey, isProspect,
    prospectStages,
    getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel,
    getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
    formatDate, formatTime, formatRelativeDate, getTodaySessions,
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
      // Auto-persist completion for past sessions
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
        await checkAllianceTransition(result, updates, rawClients, rawSessions, sessionRates, defaultPhaseKey)
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

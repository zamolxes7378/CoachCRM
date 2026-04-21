import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './ToastContext'
import * as ds from '../services/dataService'
import * as invService from '../services/invoiceService'
import { checkAllianceTransition, checkAllianceAfterBatchDelete, isAllianceValidated } from '../services/allianceService'
import { adaptClient, adaptSession, adaptReport, adaptProfessional, adaptTherapyCycle, adaptContact, adaptInvoice, unadaptClient, unadaptSession, unadaptProfessional, unadaptTherapyCycle, unadaptContact } from '../data/adapters'
import { Sprout, Search, Target, Award, UserPlus } from 'lucide-react'
import {
  therapyPhases as defaultPhases, defaultTherapyConfig as defaultTherapyCfg,
  recruitmentSources as defaultSources, sessionRates as defaultRates,
  prospectStages, clientTypeLabels
} from '../data/constants'
import {
  getClientName, getClientInitials, getPhaseLabel, getStatusLabel,
  getComputedStatus, getProspectStageInfo, getClientType,
  formatDate, formatTime, formatRelativeDate, formatDashboardDate, getTodaySessions
} from '../data/helpers'

const DataContext = createContext(null)

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

export function DataProvider({ user, children }) {
  const { showToast } = useToast()
  const [rawClients, setRawClients] = useState([])
  const [rawSessions, setRawSessions] = useState([])
  const [rawReports, setRawReports] = useState([])
  const [rawContacts, setRawContacts] = useState([])
  const [rawProfessionals, setRawProfessionals] = useState([])
  const [rawTherapyCycles, setRawTherapyCycles] = useState([])
  const [rawInvoices, setRawInvoices] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  // Derived values — merge DB settings over defaults
  const sessionRates = useMemo(() => ({
    ...defaultRates,
    ...(settings?.session_rates || {})
  }), [settings?.session_rates])

  const recruitmentSources = useMemo(() => {
    return settings?.recruitment_sources?.map(
      (label) => ({ key: label.toLowerCase().replace(/\s+/g, '_'), label })
    ) || defaultSources
  }, [settings?.recruitment_sources])

  const therapyPhases = useMemo(() => settings?.therapy_phases || defaultPhases, [settings?.therapy_phases])
  const defaultTherapyConfig = useMemo(() => settings?.default_therapy_config || defaultTherapyCfg, [settings?.default_therapy_config])
  const defaultPhaseKey = therapyPhases[0]?.key || 'debut'

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [c, s, r, st, p, ct, tc, inv] = await Promise.all([
        ds.getClients(user.id),
        ds.getSessions(user.id),
        ds.getReports(user.id),
        ds.getSettings(user.id),
        ds.getProfessionals(user.id),
        ds.getContacts(user.id),
        ds.getTherapyCycles(user.id),
        invService.getInvoices(user.id)
      ])
      // Note : L'auto-complétion des séances passées et l'audit d'alliance thérapeutique
      // sont désormais gérés de manière optimisée par l'interface locale ou lors des actions
      // de sauvegarde (Webhooks recommandés), évitant de bloquer le démarrage de l'app.
      setRawClients(c)
      setRawSessions(s)
      setRawReports(r)
      setRawContacts(ct)
      setRawTherapyCycles(tc)
      setRawInvoices(inv)
      setSettings(st)
      setRawProfessionals(p)
    } catch (err) {
      console.error('DataProvider load error:', err)
      showToast('Erreur de chargement des données. Vérifiez votre connexion.', 'error')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // Adapted data (camelCase, compatible with existing pages)
  const clients = useMemo(() => rawClients.map(adaptClient), [rawClients])
  const sessions = useMemo(() => {
    return rawSessions.map(adaptSession).map(s => {
      const now = new Date()
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      const isCompleted = now >= endTime

      const client = clients?.find(c => c.id === s.clientId)
      const effectiveAmount = s.paymentAmount ?? sessionRates[client?.type] ?? null
      const isToConfirm = s.status === 'scheduled' && isCompleted && !s.paymentMethod && effectiveAmount !== 0
      const isConfirmed = (s.status === 'completed' || (isCompleted && (!!s.paymentMethod || effectiveAmount === 0))) && s.status !== 'cancelled'

      return {
        ...s,
        isCompleted,
        isToConfirm,
        isConfirmed,
        status: isConfirmed ? 'completed' : s.status
      }
    })
  }, [rawSessions, clients, sessionRates])
  const reports = useMemo(() => rawReports.map(adaptReport), [rawReports])
  const contacts = useMemo(() => rawContacts.map(adaptContact), [rawContacts])
  const professionals = useMemo(() => rawProfessionals.map(adaptProfessional), [rawProfessionals])
  const therapyCycles = useMemo(() => rawTherapyCycles.map(adaptTherapyCycle), [rawTherapyCycles])
  const invoices = useMemo(() => rawInvoices.map(adaptInvoice), [rawInvoices])

  // Invoice helpers — memoized lookup maps
  const invoiceBySessionId = useMemo(() => {
    const map = {}
    invoices.forEach(inv => {
      (inv.sessionIds || []).forEach(sid => { map[sid] = inv })
    })
    return map
  }, [invoices])

  const getInvoiceForSession = useCallback((sessionId) => invoiceBySessionId[sessionId] || null, [invoiceBySessionId])
  const getInvoicesByClient = useCallback((clientId) => invoices.filter(i => i.clientId === clientId), [invoices])

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

  // Centralized phase resolution — single source of truth for fallback logic
  const getPhaseColor = (key) => phaseColors[key] || phaseColors[defaultPhaseKey] || phaseColors.debut
  const getPhaseIcon = (key) => phaseIcons[key] || phaseIcons[defaultPhaseKey] || Sprout

  const isProspect = useCallback((client) => {
    if (!client) return false
    return client.phase === 'prospect'
  }, [])

  const value = {
    clients, sessions, reports, contacts, settings, loading, professionals, therapyCycles, invoices,
    sessionRates, recruitmentSources, therapyPhases, defaultTherapyConfig,
    phaseIcons, phaseColors, defaultPhaseKey, getPhaseColor, getPhaseIcon, isProspect,
    prospectStages,
    getClientName, getClientInitials, getPhaseLabel, getStatusLabel,
    getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
    formatDate, formatTime, formatRelativeDate, formatDashboardDate, getTodaySessions,
    getInvoiceForSession, getInvoicesByClient,
    refreshData: loadData,
    updateClient: async (id, updates) => {
      try {
        const result = await ds.updateClient(id, unadaptClient(updates))
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('updateClient error:', err)
        showToast('Erreur lors de la mise à jour du client.', 'error')
      }
    },
    createClient: async (client) => {
      try {
        if (!user?.id) {
          showToast('Erreur : session utilisateur invalide. Rechargez la page.', 'error')
          return null
        }
        const payload = { ...unadaptClient(client), user_id: user.id }
        const result = await ds.createClient(payload)
        if (result) {
          await loadData()
          showToast('Client créé avec succès.', 'success')
        }
        return result
      } catch (err) {
        console.error('createClient error:', err)
        showToast('Erreur lors de la création du client.', 'error')
      }
    },
    deleteClient: async (id) => {
      try {
        const result = await ds.deleteClient(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('deleteClient error:', err)
        showToast('Erreur lors de la suppression du client.', 'error')
      }
    },
    updateSession: async (id, updates) => {
      try {
        // Auto-persist completion for past sessions — only if payment condition met
        if (!updates.status) {
          const rawSession = rawSessions.find(s => s.id === id)
          if (rawSession && rawSession.status === 'scheduled' && rawSession.date) {
            const endTime = new Date(new Date(rawSession.date).getTime() + (rawSession.duration || 60) * 60000)
            // Merge raw data with incoming updates to get effective payment state
            const effectivePM = updates.paymentMethod || updates.payment_method || rawSession.payment_method
            const effectiveAmount = updates.paymentAmount ?? updates.payment_amount ?? rawSession.payment_amount ?? null
            const paymentCondition = !!effectivePM || effectiveAmount === 0
            if (endTime <= new Date() && paymentCondition) {
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
      } catch (err) {
        console.error('updateSession error:', err)
        showToast('Erreur lors de la mise à jour de la séance.', 'error')
      }
    },
    createSession: async (session) => {
      try {
        if (!user?.id) {
          showToast('Erreur : session utilisateur invalide. Rechargez la page.', 'error')
          return null
        }
        const payload = { ...unadaptSession(session), user_id: user.id }
        const result = await ds.createSession(payload)
        if (result) {
          await checkAllianceTransition(result, session, rawClients, rawSessions, sessionRates, defaultPhaseKey)
          await loadData()
          showToast('Séance créée avec succès.', 'success')
        }
        return result
      } catch (err) {
        console.error('createSession error:', err)
        showToast('Erreur lors de la création de la séance.', 'error')
        return null
      }
    },
    createContact: async (contact) => {
      const result = await ds.createContact(unadaptContact({ ...contact, userId: user.id }))
      if (result) await loadData()
      return result
    },
    updateContact: async (id, updates) => {
      const result = await ds.updateContact(id, unadaptContact(updates))
      if (result) await loadData()
      return result
    },
    deleteContact: async (id) => {
      const result = await ds.deleteContact(id)
      if (result) await loadData()
      return result
    },
    deleteSession: async (id) => {
      try {
        const result = await ds.deleteSession(id)
        if (result) {
          await checkAllianceAfterBatchDelete([id], rawSessions, rawClients, sessionRates)
          await loadData()
          showToast('Séance supprimée.', 'success')
        }
        return result
      } catch (err) {
        console.error('deleteSession error:', err)
        showToast('Erreur lors de la suppression.', 'error')
      }
    },
    deleteSessions: async (ids) => {
      try {
        // Snapshot raw sessions BEFORE deletion for alliance check
        const sessionsSnapshot = [...rawSessions]
        const result = await ds.deleteSessions(ids)
        if (result) {
          await checkAllianceAfterBatchDelete(ids, sessionsSnapshot, rawClients, sessionRates)
          await loadData()
          showToast(`${ids.length} séance${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}.`, 'success')
        }
        return result
      } catch (err) {
        console.error('deleteSessions error:', err)
        showToast('Erreur lors de la suppression groupée.', 'error')
      }
    },
    upsertSettings: async (settingsData) => {
      try {
        const result = await ds.upsertSettings(user.id, settingsData)
        if (result) { setSettings(result); showToast('Paramètres sauvegardés.', 'success') }
        return result
      } catch (err) {
        console.error('upsertSettings error:', err)
        showToast('Erreur lors de la sauvegarde des paramètres.', 'error')
      }
    },
    createProfessional: async (professional) => {
      try {
        const result = await ds.createProfessional({ ...unadaptProfessional(professional), user_id: user.id })
        if (result) { await loadData(); showToast('Professionnel créé.', 'success') }
        return result
      } catch (err) {
        console.error('createProfessional error:', err)
        showToast('Erreur lors de la création du professionnel.', 'error')
      }
    },
    updateProfessional: async (id, updates) => {
      try {
        const result = await ds.updateProfessional(id, unadaptProfessional(updates))
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('updateProfessional error:', err)
        showToast('Erreur lors de la mise à jour du professionnel.', 'error')
      }
    },
    deleteProfessional: async (id) => {
      try {
        const result = await ds.deleteProfessional(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('deleteProfessional error:', err)
        showToast('Erreur lors de la suppression du professionnel.', 'error')
      }
    },
    deleteProfessionals: async (ids) => {
      try {
        const result = await ds.deleteProfessionals(ids)
        if (result) {
          await loadData()
          showToast(`${ids.length} professionnel${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}.`, 'success')
        }
        return result
      } catch (err) {
        console.error('deleteProfessionals error:', err)
        showToast('Erreur lors de la suppression groupée.', 'error')
      }
    },
    createTherapyCycle: async (cycle) => {
      try {
        const result = await ds.createTherapyCycle({ ...unadaptTherapyCycle(cycle), user_id: user.id })
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('createTherapyCycle error:', err)
        showToast('Erreur lors de la création du cycle.', 'error')
      }
    },
    deleteTherapyCycle: async (id) => {
      try {
        const result = await ds.deleteTherapyCycle(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('deleteTherapyCycle error:', err)
        showToast('Erreur lors de la suppression du cycle.', 'error')
      }
    },
    updateTherapyCycle: async (id, updates) => {
      try {
        const result = await ds.updateTherapyCycle(id, unadaptTherapyCycle(updates))
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('updateTherapyCycle error:', err)
        showToast('Erreur lors de la mise à jour du cycle.', 'error')
      }
    },
    // ── Invoice CRUD ──
    createInvoice: async ({ clientId, sessionIds, invoiceDate }) => {
      try {
        const result = await invService.createInvoice({ userId: user.id, clientId, sessionIds, invoiceDate })
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('createInvoice error:', err)
        showToast('Erreur lors de la création de la facture.', 'error')
      }
    },
    updateInvoice: async (id, updates) => {
      try {
        const result = await invService.updateInvoice(id, updates)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('updateInvoice error:', err)
        showToast('Erreur lors de la mise à jour de la facture.', 'error')
      }
    },
    emitInvoice: async (id) => {
      try {
        const result = await invService.emitInvoice(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('emitInvoice error:', err)
        showToast('Erreur lors de l\'émission de la facture.', 'error')
      }
    },
    unemitInvoice: async (id) => {
      try {
        const result = await invService.unemitInvoice(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('unemitInvoice error:', err)
        showToast('Erreur lors de la modification de la facture.', 'error')
      }
    },
    deleteInvoice: async (id) => {
      try {
        const result = await invService.deleteInvoice(id)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('deleteInvoice error:', err)
        showToast('Erreur lors de la suppression de la facture.', 'error')
      }
    },
    setInvoiceSessions: async (invoiceId, sessionIds) => {
      try {
        const result = await invService.setInvoiceSessions(invoiceId, sessionIds)
        if (result) await loadData()
        return result
      } catch (err) {
        console.error('setInvoiceSessions error:', err)
        showToast('Erreur lors de la mise à jour des séances facturées.', 'error')
      }
    }
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

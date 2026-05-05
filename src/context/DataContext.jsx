import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from './ToastContext'
import * as ds from '../services/dataService'
import * as invService from '../services/invoiceService'
import { supabase } from '../lib/supabase.js'
import { reportError } from '../lib/errorReporter'
import { emitAuditLog } from '../lib/auditLog'
import { checkAllianceTransition, checkAllianceAfterBatchDelete, isAllianceValidated } from '../services/allianceService'
import { adaptClient, adaptSession, adaptReport, adaptProfessional, adaptTherapyCycle, adaptContact, adaptInvoice, unadaptClient, unadaptSession, unadaptProfessional, unadaptTherapyCycle, unadaptContact } from '../data/adapters'
import { applyUpdate, applyDelete, applyDeleteMany, applyInsert } from '../data/listUpdaters'
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
  const rawSessionsRef = useRef(rawSessions)
  useEffect(() => { rawSessionsRef.current = rawSessions }, [rawSessions])
  const [rawReports, setRawReports] = useState([])
  const [rawContacts, setRawContacts] = useState([])
  const [rawProfessionals, setRawProfessionals] = useState([])
  const [rawTherapyCycles, setRawTherapyCycles] = useState([])
  const [rawInvoices, setRawInvoices] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const inflightRef = useRef(false)

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
    // H-06: inflight guard — skip if a load is already in progress
    if (inflightRef.current) return
    inflightRef.current = true
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
      reportError(err, { operation: 'loadData', entity: 'provider' })
      showToast('Erreur de chargement des données. Vérifiez votre connexion.', 'error')
    } finally {
      inflightRef.current = false
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // Application de la règle 41 : Cohérence Phase/Séances (Audit dynamique au chargement)
  const confirmedSessionsMap = useMemo(() => {
    const map = {}
    rawSessions.forEach(s => {
      const now = new Date()
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      const isCompleted = now >= endTime
      // On utilise rawClients pour éviter la dépendance circulaire avec clients adapté
      const rClient = rawClients.find(c => c.id === s.client_id)
      const effectiveAmount = s.payment_amount ?? sessionRates[rClient?.type] ?? null
      const isConfirmed = (s.status === 'completed' || (isCompleted && (!!s.payment_method || effectiveAmount === 0))) && s.status !== 'cancelled'
      if (isConfirmed) {
        map[s.client_id] = (map[s.client_id] || 0) + 1
      }
    })
    return map
  }, [rawSessions, rawClients, sessionRates])

  // Adapted data (camelCase, compatible with existing pages)
  const clients = useMemo(() => {
    return rawClients.map(adaptClient).map(c => {
      // Règle 41 : Tout client non-prospect n'ayant aucune séance validée est réinitialisé en prospect
      if (c.phase !== 'prospect' && !confirmedSessionsMap[c.id]) {
        return { ...c, phase: 'prospect' }
      }
      return c
    })
  }, [rawClients, confirmedSessionsMap])

  const sessions = useMemo(() => {
    return rawSessions.map(adaptSession).map(s => {
      const now = new Date()
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      const isCompleted = now >= endTime

      const client = clientById.get(s.clientId)
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
  }, [rawSessions, clientById, sessionRates])
  const reports = useMemo(() => rawReports.map(adaptReport), [rawReports])
  const contacts = useMemo(() => rawContacts.map(adaptContact), [rawContacts])
  const professionals = useMemo(() => rawProfessionals.map(adaptProfessional), [rawProfessionals])
  const therapyCycles = useMemo(() => rawTherapyCycles.map(adaptTherapyCycle), [rawTherapyCycles])
  const invoices = useMemo(() => rawInvoices.map(adaptInvoice), [rawInvoices])

  // clientById: Map<id, client> — O(1) lookup, replaces .find() call sites
  const clientById = useMemo(() => {
    const m = new Map()
    clients.forEach(c => m.set(c.id, c))
    return m
  }, [clients])

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

  // ── Internal helper: refresh affected clients after an alliance check ──
  // checkAllianceTransition / checkAllianceAfterBatchDelete call ds.updateClient
  // internally; we must sync the returned DB rows back into local state.
  const _refreshAllianceClients = useCallback(async (clientIds) => {
    if (!clientIds?.length) return
    const updated = await Promise.all(clientIds.map(id => ds.getClient(id)))
    updated.forEach(row => {
      if (row) setRawClients(prev => applyUpdate(prev, row.id, row))
    })
  }, [])

  const value = {
    clients, clientById, sessions, reports, contacts, settings, loading, professionals, therapyCycles, invoices,
    sessionRates, recruitmentSources, therapyPhases, defaultTherapyConfig,
    phaseIcons, phaseColors, defaultPhaseKey, getPhaseColor, getPhaseIcon, isProspect,
    prospectStages,
    getClientName, getClientInitials, getPhaseLabel, getStatusLabel,
    getComputedStatus, getProspectStageInfo, getClientType, clientTypeLabels,
    formatDate, formatTime, formatRelativeDate, formatDashboardDate, getTodaySessions,
    getInvoiceForSession, getInvoicesByClient,
    refreshData: loadData,

    // ── Clients ──
    updateClient: async (id, updates) => {
      try {
        const row = await ds.updateClient(id, unadaptClient(updates))
        if (row) setRawClients(prev => applyUpdate(prev, id, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'updateClient', entity: 'client', entity_id: id })
        showToast('Erreur lors de la mise à jour du client.', 'error')
        return null
      }
    },
    createClient: async (client) => {
      try {
        if (!user?.id) {
          showToast('Erreur : session utilisateur invalide. Rechargez la page.', 'error')
          return null
        }
        const payload = { ...unadaptClient(client), user_id: user.id }
        const row = await ds.createClient(payload)
        if (row) {
          setRawClients(prev => applyInsert(prev, row))
          showToast('Client créé avec succès.', 'success')
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'createClient', entity: 'client' })
        showToast('Erreur lors de la création du client.', 'error')
      }
    },
    deleteClient: async (id) => {
      try {
        const ok = await ds.deleteClient(id)
        if (ok) {
          setRawClients(prev => applyDelete(prev, id))
          await emitAuditLog({ entity: 'client', entity_id: id, action: 'delete_client' })
        }
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteClient', entity: 'client', entity_id: id })
        showToast('Erreur lors de la suppression du client.', 'error')
        return null
      }
    },

    // ── Sessions ──
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
        const row = await ds.updateSession(id, unadaptSession(updates))
        if (row) {
          setRawSessions(prev => applyUpdate(prev, id, row))
          // Alliance check may update one client's phase — re-fetch that client
          await checkAllianceTransition(row, updates, rawClients, rawSessions, sessionRates, defaultPhaseKey)
          if (row.client_id) await _refreshAllianceClients([row.client_id])
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'updateSession', entity: 'session', entity_id: id })
        showToast('Erreur lors de la mise à jour de la séance.', 'error')
        return null
      }
    },
    createSession: async (session) => {
      try {
        if (!user?.id) {
          showToast('Erreur : session utilisateur invalide. Rechargez la page.', 'error')
          return null
        }
        const payload = { ...unadaptSession(session), user_id: user.id }
        const row = await ds.createSession(payload)
        if (row) {
          setRawSessions(prev => applyInsert(prev, row))
          // Alliance check may update the client's phase — re-fetch that client
          const updatedSessions = [row, ...rawSessions]
          await checkAllianceTransition(row, session, rawClients, updatedSessions, sessionRates, defaultPhaseKey)
          if (row.client_id) await _refreshAllianceClients([row.client_id])
          showToast('Séance créée avec succès.', 'success')
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'createSession', entity: 'session' })
        showToast('Erreur lors de la création de la séance.', 'error')
        return null
      }
    },
    deleteSession: async (id) => {
      try {
        // Snapshot before deletion for alliance check
        const sessionsSnapshot = [...rawSessionsRef.current]
        const ok = await ds.deleteSession(id)
        if (ok) {
          setRawSessions(prev => applyDelete(prev, id))
          await emitAuditLog({ entity: 'session', entity_id: id, action: 'delete_session' })
          await checkAllianceAfterBatchDelete([id], sessionsSnapshot, rawClients, sessionRates)
          // Re-fetch clients that may have had their phase changed
          const affectedClientIds = [...new Set(
            sessionsSnapshot.filter(s => s.id === id).map(s => s.client_id).filter(Boolean)
          )]
          await _refreshAllianceClients(affectedClientIds)
          showToast('Séance supprimée.', 'success')
        }
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteSession', entity: 'session', entity_id: id })
        showToast('Erreur lors de la suppression.', 'error')
        return null
      }
    },
    deleteSessions: async (ids) => {
      try {
        // Snapshot raw sessions BEFORE deletion for alliance check
        const sessionsSnapshot = [...rawSessionsRef.current]
        const ok = await ds.deleteSessions(ids)
        if (ok) {
          setRawSessions(prev => applyDeleteMany(prev, ids))
          await checkAllianceAfterBatchDelete(ids, sessionsSnapshot, rawClients, sessionRates)
          // Re-fetch clients that may have had their phase changed
          const deletedSet = new Set(ids)
          const affectedClientIds = [...new Set(
            sessionsSnapshot.filter(s => deletedSet.has(s.id)).map(s => s.client_id).filter(Boolean)
          )]
          await _refreshAllianceClients(affectedClientIds)
          showToast(`${ids.length} séance${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}.`, 'success')
        }
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteSessions', entity: 'session' })
        showToast('Erreur lors de la suppression groupée.', 'error')
        return null
      }
    },

    // ── Contacts ──
    createContact: async (contact) => {
      try {
        const row = await ds.createContact(unadaptContact({ ...contact, userId: user.id }))
        if (row) setRawContacts(prev => applyInsert(prev, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'createContact', entity: 'contact' })
        showToast('Erreur lors de la création du contact.', 'error')
      }
    },
    updateContact: async (id, updates) => {
      try {
        const row = await ds.updateContact(id, unadaptContact(updates))
        if (row) setRawContacts(prev => applyUpdate(prev, id, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'updateContact', entity: 'contact', entity_id: id })
        showToast('Erreur lors de la mise à jour du contact.', 'error')
      }
    },
    deleteContact: async (id) => {
      try {
        const ok = await ds.deleteContact(id)
        if (ok) setRawContacts(prev => applyDelete(prev, id))
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteContact', entity: 'contact', entity_id: id })
        showToast('Erreur lors de la suppression du contact.', 'error')
      }
    },

    // ── Settings ──
    upsertSettings: async (settingsData) => {
      try {
        const result = await ds.upsertSettings(user.id, settingsData)
        if (result) { setSettings(result); showToast('Paramètres sauvegardés.', 'success') }
        return result
      } catch (err) {
        reportError(err, { operation: 'upsertSettings', entity: 'settings' })
        showToast('Erreur lors de la sauvegarde des paramètres.', 'error')
        return null
      }
    },

    // ── Professionals ──
    createProfessional: async (professional) => {
      try {
        const row = await ds.createProfessional({ ...unadaptProfessional(professional), user_id: user.id })
        if (row) {
          setRawProfessionals(prev => applyInsert(prev, row))
          showToast('Professionnel créé.', 'success')
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'createProfessional', entity: 'professional' })
        showToast('Erreur lors de la création du professionnel.', 'error')
        return null
      }
    },
    updateProfessional: async (id, updates) => {
      try {
        const row = await ds.updateProfessional(id, unadaptProfessional(updates))
        if (row) setRawProfessionals(prev => applyUpdate(prev, id, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'updateProfessional', entity: 'professional', entity_id: id })
        showToast('Erreur lors de la mise à jour du professionnel.', 'error')
        return null
      }
    },
    deleteProfessional: async (id) => {
      try {
        const ok = await ds.deleteProfessional(id)
        if (ok) setRawProfessionals(prev => applyDelete(prev, id))
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteProfessional', entity: 'professional', entity_id: id })
        showToast('Erreur lors de la suppression du professionnel.', 'error')
        return null
      }
    },
    deleteProfessionals: async (ids) => {
      try {
        const ok = await ds.deleteProfessionals(ids)
        if (ok) {
          setRawProfessionals(prev => applyDeleteMany(prev, ids))
          showToast(`${ids.length} professionnel${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''}.`, 'success')
        }
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteProfessionals', entity: 'professional' })
        showToast('Erreur lors de la suppression groupée.', 'error')
        return null
      }
    },

    // ── Therapy Cycles ──
    createTherapyCycle: async (cycle) => {
      try {
        const row = await ds.createTherapyCycle({ ...unadaptTherapyCycle(cycle), user_id: user.id })
        if (row) setRawTherapyCycles(prev => applyInsert(prev, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'createTherapyCycle', entity: 'therapy_cycle' })
        showToast('Erreur lors de la création du cycle.', 'error')
        return null
      }
    },
    deleteTherapyCycle: async (id) => {
      try {
        const ok = await ds.deleteTherapyCycle(id)
        if (ok) setRawTherapyCycles(prev => applyDelete(prev, id))
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteTherapyCycle', entity: 'therapy_cycle', entity_id: id })
        showToast('Erreur lors de la suppression du cycle.', 'error')
        return null
      }
    },
    updateTherapyCycle: async (id, updates) => {
      try {
        const row = await ds.updateTherapyCycle(id, unadaptTherapyCycle(updates))
        if (row) setRawTherapyCycles(prev => applyUpdate(prev, id, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'updateTherapyCycle', entity: 'therapy_cycle', entity_id: id })
        showToast('Erreur lors de la mise à jour du cycle.', 'error')
        return null
      }
    },

    // ── Invoices ──
    createInvoice: async ({ clientId, sessionIds, invoiceDate }) => {
      try {
        const row = await invService.createInvoice({ userId: user.id, clientId, sessionIds, invoiceDate })
        if (row) setRawInvoices(prev => applyInsert(prev, row))
        return row
      } catch (err) {
        reportError(err, { operation: 'createInvoice', entity: 'invoice' })
        showToast('Erreur lors de la création de la facture.', 'error')
        return null
      }
    },
    updateInvoice: async (id, updates) => {
      try {
        const row = await invService.updateInvoice(id, updates)
        if (row) {
          // Preserve existing invoice_sessions — updateInvoice only returns the invoice row
          setRawInvoices(prev => prev.map(inv =>
            inv.id === id ? { ...inv, ...row } : inv
          ))
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'updateInvoice', entity: 'invoice', entity_id: id })
        showToast('Erreur lors de la mise à jour de la facture.', 'error')
        return null
      }
    },
    emitInvoice: async (id) => {
      try {
        const row = await invService.emitInvoice(id)
        if (row) {
          setRawInvoices(prev => prev.map(inv =>
            inv.id === id ? { ...inv, ...row } : inv
          ))
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'emitInvoice', entity: 'invoice', entity_id: id })
        showToast('Erreur lors de l\'émission de la facture.', 'error')
        return null
      }
    },
    unemitInvoice: async (id) => {
      try {
        const row = await invService.unemitInvoice(id)
        if (row) {
          setRawInvoices(prev => prev.map(inv =>
            inv.id === id ? { ...inv, ...row } : inv
          ))
        }
        return row
      } catch (err) {
        reportError(err, { operation: 'unemitInvoice', entity: 'invoice', entity_id: id })
        showToast('Erreur lors de la modification de la facture.', 'error')
        return null
      }
    },
    deleteInvoice: async (id) => {
      try {
        const ok = await invService.deleteInvoice(id)
        if (ok) setRawInvoices(prev => applyDelete(prev, id))
        return ok
      } catch (err) {
        reportError(err, { operation: 'deleteInvoice', entity: 'invoice', entity_id: id })
        showToast('Erreur lors de la suppression de la facture.', 'error')
        return null
      }
    },
    setInvoiceSessions: async (invoiceId, sessionIds) => {
      try {
        const ok = await invService.setInvoiceSessions(invoiceId, sessionIds)
        if (ok) {
          // Construct the updated invoice_sessions locally — we know the exact new set
          setRawInvoices(prev => prev.map(inv =>
            inv.id === invoiceId
              ? { ...inv, invoice_sessions: sessionIds.map(sid => ({ session_id: sid })) }
              : inv
          ))
        }
        return ok
      } catch (err) {
        reportError(err, { operation: 'setInvoiceSessions', entity: 'invoice', entity_id: invoiceId })
        showToast('Erreur lors de la mise à jour des séances facturées.', 'error')
        return null
      }
    },

    // ── Reports ──
    deleteReport: async (id) => {
      try {
        const { error } = await supabase.from('reports').delete().eq('id', id)
        if (error) throw new Error(`deleteReport failed: ${error.message}`)
        setRawReports(prev => applyDelete(prev, id))
        await emitAuditLog({ entity: 'report', entity_id: id, action: 'delete_report' })
        return true
      } catch (err) {
        reportError(err, { operation: 'deleteReport', entity: 'report', entity_id: id })
        showToast('Erreur lors de la suppression du compte-rendu.', 'error')
        return null
      }
    },

    // ── Export ──
    exportClientDossier: async (client, sessions, reports, formatDateFn, getPhaseLabelFn) => {
      try {
        const { exportClientDossierExcel } = await import('../services/exportService')
        await exportClientDossierExcel(client, sessions, reports, formatDateFn, getPhaseLabelFn)
        await emitAuditLog({ entity: 'client', entity_id: client.id, action: 'export_dossier' })
      } catch (err) {
        reportError(err, { operation: 'exportClientDossier', entity: 'client', entity_id: client?.id })
        showToast('Erreur lors de l\'export du dossier.', 'error')
      }
    },
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

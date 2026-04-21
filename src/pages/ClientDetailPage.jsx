import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import AddSessionButton from '../components/AddSessionButton'
import { ArrowLeft, TrendingUp, PenTool, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, Mic, MicOff, Loader, CreditCard, Landmark, Banknote, Phone, Mail, MessageSquare, Plus, Share2, Edit3, Sparkles, RefreshCw, Globe, Hourglass, Euro, X, Trash2, BookOpen, ChevronRight, Heart, AlertCircle, Crosshair, Check, HelpCircle, Link2, Users, User, Star, Baby, Briefcase, Sprout, Search, Target, Award, UserPlus } from 'lucide-react'
import ReportIcon from '../components/ReportIcon'
import { ClientTypeIcon } from '../components/ClientTypeBadge'
// professionals removed — now from DataContext
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { findDuplicateClients, findDuplicatePros } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'
import DeleteConfirmModal from '../components/client/DeleteConfirmModal'
import NotesModal from '../components/client/NotesModal'
import SessionDetailModal from '../components/client/SessionDetailModal'
import EditIdentityModal from '../components/client/EditIdentityModal'
import useSessionModalState from '../hooks/useSessionModalState'
import SessionCard from '../components/session/SessionCard'
import ConfirmBadge from '../components/ConfirmBadge'
import PaymentBadge from '../components/PaymentBadge'
import useEditIdentityState from '../hooks/useEditIdentityState'
import ClientFinancialPanel from '../components/client/ClientFinancialPanel'
import ClientAiSynthesisPanel from '../components/client/ClientAiSynthesisPanel'
import ClientTimelinePanel from '../components/client/ClientTimelinePanel'
import ClientHeaderPanel from '../components/client/ClientHeaderPanel'
import ClientStatsPanel from '../components/client/ClientStatsPanel'
import ClientNotesPreview from '../components/client/ClientNotesPreview'
import ClientCreationMarker from '../components/client/ClientCreationMarker'
import { exportClientDossierExcel } from '../services/exportService'

export default function ClientDetailPage({ clientIdProp, sessionIdProp, onClose } = {}) {
  const params = useParams()
  const id = clientIdProp || params.id
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const from = location.state?.from
  const { clients, sessions: allSessions, reports: allReports, contacts: allContacts, therapyCycles: allTherapyCycles, recruitmentSources, sessionRates, therapyPhases: therapyPhasesData, phaseIcons, phaseColors, defaultPhaseKey, getPhaseColor, getPhaseIcon, getClientName, getClientInitials, getPhaseLabel, getStatusLabel, getClientType, isProspect, formatDate, formatTime, updateSession, updateClient, createClient, createSession, deleteSession, refreshData, professionals, createProfessional: createPro, updateProfessional: updatePro, createContact, updateContact, deleteContact, createTherapyCycle, updateTherapyCycle, deleteTherapyCycle, getInvoiceForSession, getInvoicesByClient } = useData()
  const { showToast } = useToast()
  const confirm = useConfirm()
  const client = clients.find(c => c.id === id)
  // Sanitize: compute non-self-referencing clientLinks without mutation
  const sanitizedClientLinks = useMemo(() => {
    return client?.clientLinks?.filter(l => l.clientId !== client.id) || []
  }, [client])
  const therapyCycles = useMemo(() => {
    const defaultRate = client?.sessionRate || sessionRates.client
    const initialRate = client?.sessionRate ?? defaultRate
    const dbCycles = allTherapyCycles.filter(tc => tc.clientId === id)
    if (dbCycles.length > 0) return dbCycles.sort((a, b) => a.startDate.localeCompare(b.startDate))
    return [{ id: 'tc_initial', startDate: client?.startDate || client?.createdAt?.split('T')[0] || '2025-01-01', rate: initialRate, totalSessions: client?.totalSessions || 20, phase: client?.phase || (therapyPhasesData[0]?.key || 'debut') }]
  }, [allTherapyCycles, id, client, sessionRates, therapyPhasesData])

  const activeCycle = therapyCycles[therapyCycles.length - 1]
  const currentRate = activeCycle?.rate || client?.sessionRate || (client?.type === 'individual' ? sessionRates.individual : sessionRates.client)

  // Session modal state (from hook)
  const { state: sessionModalState, actions: sessionModalActions } = useSessionModalState({
    sessions: allSessions.filter(s => s.clientId === id),
    updateSession,
    sessionRate: currentRate,
    originalRate: currentRate
  })
  const { sessionUpdates, expandedSessionId, rateOverrides, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions } = sessionModalState
  const { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR } = sessionModalActions

  // Edit identity state (from hook)
  const { state: editIdentityState, actions: editIdentityActions } = useEditIdentityState({ client, getClientType })
  const { editPartnerA, editPartnerB, editChildren, editType, editReferents, editSource, showEditModal, showDeleteConfirm, modalShowAddLink, modalAddLinkSearch, modalReferrerSearch, modalSelectedReferrer, modalShowReferrerDropdown, modalExternalReferrer } = editIdentityState
  const { setEditPartnerA, setEditPartnerB, setEditChildren, setEditType, setEditReferents, setEditSource, setShowEditModal, setShowDeleteConfirm, setModalShowAddLink, setModalAddLinkSearch, setModalReferrerSearch, setModalSelectedReferrer, setModalShowReferrerDropdown, setModalExternalReferrer } = editIdentityActions

  const [showContactForm, setShowContactForm] = useState(false)
  const [contactType, setContactType] = useState('phone')
  const [contactNote, setContactNote] = useState('')
  const [editingContactId, setEditingContactId] = useState(null)
  const [phaseFilter, setPhaseFilter] = useState(null)
  const [contactDate, setContactDate] = useState(new Date().toISOString().slice(0, 16))
  const contacts = useMemo(() => allContacts.filter(c => c.clientId === id), [allContacts, id])
  const [aiGenerating, setAiGenerating] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [confirmingContactId, setConfirmingContactId] = useState(null)
  const [confirmContactDate, setConfirmContactDate] = useState('')

  const safeGetRate = (sid) => (typeof getRate === 'function' ? getRate(sid) : (activeCycle?.rate || currentRate))

  const [showAddLink, setShowAddLink] = useState(false)
  const [addLinkType, setAddLinkType] = useState('dossier')
  const [addLinkSearch, setAddLinkSearch] = useState('')

  // Determine which cycle a session belongs to
  const getSessionCycle = (session) => {
    for (let i = therapyCycles.length - 1; i >= 0; i--) {
      if (session.date >= therapyCycles[i].startDate) return therapyCycles[i]
    }
    return therapyCycles[0]
  }

  useEffect(() => {
    if (editingTotal && totalInputRef.current) totalInputRef.current.focus()
  }, [editingTotal])

  // Auto-expand session from query param or prop
  useEffect(() => {
    const sid = sessionIdProp || searchParams.get('sessionId')
    if (sid) {
      // If opened via clientIdProp (modal context, e.g. from Finances), 
      // wait for parent animation to finish (slideUp 0.25s)
      const delay = clientIdProp ? 300 : 0
      const timer = setTimeout(() => {
        setExpandedSessionId(sid)
        // Small delay to ensure the DOM is rendered
        setTimeout(() => {
          const el = document.getElementById(`session-${sid}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [sessionIdProp, clientIdProp, searchParams])


  const sessions = allSessions.filter(s => s.clientId === id).map(s => {
    // Auto-complete: only if past AND payment condition met (paymentMethod set OR paymentAmount = 0)
    if (s.status === 'scheduled') {
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      const effectiveAmount = s.paymentAmount ?? sessionRates.client ?? null
      const paymentCondition = !!s.paymentMethod || effectiveAmount === 0
      if (endTime <= new Date() && paymentCondition) return { ...s, status: 'completed' }
    }
    return s
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const reports = allReports.filter(r => r.clientId === id)
  const PhaseIcon = client ? getPhaseIcon(client.phase) : HelpCircle

  // Compute session numbers chronologically
  const sortedSessions = [...sessions].filter(s => s.status !== 'cancelled').sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const sessionNumbers = {}
  // Number sessions per therapy cycle so each new therapy starts from 1
  const cycleCounters = {}
  sortedSessions.forEach(s => {
    const cycle = getSessionCycle(s)
    const cid = cycle?.id || 'default'
    cycleCounters[cid] = (cycleCounters[cid] || 0) + 1
    sessionNumbers[s.id] = cycleCounters[cid]
  })

  // Cycle-aware counts
  const activeCycleSessions = sessions.filter(s => getSessionCycle(s)?.id === activeCycle.id)
  const [completedCount, reportsCount, pendingReportsCount] = useMemo(() => {
    const completed = activeCycleSessions.filter(s => s.status === 'completed')
    const hasR = activeCycleSessions.filter(s => s.hasReport || sessionUpdates[s.id]?.hasReport)
    const pending = activeCycleSessions.filter(s => s.status === 'completed' && !(s.hasReport || sessionUpdates[s.id]?.hasReport))
    return [completed.length, hasR.length, pending.length]
  }, [activeCycleSessions, sessionUpdates])

  if (!client) {
    return <div className="empty-state"><p>Client non trouvé</p></div>
  }

  // Compute next/last session
  const now = new Date()
  const futureSessions = sessions.filter(s => new Date(s.date) > now && s.status !== 'cancelled')
  const pastSessions = sessions.filter(s => new Date(s.date) <= now && s.status !== 'cancelled')
  const nextSessionDate = futureSessions.length > 0 ? futureSessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0].date : null
  const lastSessionDate = pastSessions.length > 0 ? pastSessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date : null

  const handleAddContact = async () => {
    if (!contactNote.trim()) return
    await createContact({
      clientId: id,
      type: contactType,
      date: contactDate,
      note: contactNote.trim()
    })
    setContactNote('')
    setEditingContactId(null)
    setShowContactForm(false)
  }

  const handleEditContact = (contact) => {
    setEditingContactId(contact.id)
    setContactType(contact.type)
    setContactDate(contact.date)
    setContactNote(contact.note)
    setShowContactForm(true)
  }

  const handleUpdateContact = async () => {
    if (!contactNote.trim()) return
    await updateContact(editingContactId, {
      type: contactType,
      date: contactDate,
      note: contactNote.trim()
    })
    setContactNote('')
    setEditingContactId(null)
    setShowContactForm(false)
  }

  const handleDeleteContact = async (contactId) => {
    await deleteContact(contactId)
  }

  const contactIcons = { phone: Phone, email: Mail, sms: MessageSquare, social: Share2, web: Globe, parrainage: Award }
  const contactLabels = { phone: 'Appel', email: 'Email', sms: 'SMS', social: 'Réseaux sociaux', web: 'Site web', parrainage: 'Parrainage' }
  const contactColors = { phone: { bg: '#E8F5E9', color: '#2E7D32' }, email: { bg: '#E3F2FD', color: '#1565C0' }, sms: { bg: '#FFF3E0', color: '#E65100' }, social: { bg: '#F3E5F5', color: '#7B1FA2' }, web: { bg: '#E0F2F1', color: '#00695C' }, parrainage: { bg: '#F5F0FF', color: '#8B5CF6' } }



  return (
    <div>
      <button className="btn btn-ghost" onClick={() => {
        if (onClose) {
          onClose()
        } else if (from) {
          navigate(from)
        } else {
          navigate(client.phase === 'prospect' ? '/clients?tab=prospects' : '/clients')
        }
      }} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <ClientHeaderPanel
        client={client}
        clients={clients}
        navigate={navigate}
        setEditPartnerA={setEditPartnerA}
        setEditPartnerB={setEditPartnerB}
        setEditChildren={setEditChildren}
        setEditType={setEditType}
        setShowEditModal={setShowEditModal}
        getClientType={getClientType}
        getClientInitials={getClientInitials}
        getClientName={getClientName}
        updateClient={updateClient}
        showAddLink={showAddLink}
        setShowAddLink={setShowAddLink}
        addLinkSearch={addLinkSearch}
        setAddLinkSearch={setAddLinkSearch}
        onExport={() => exportClientDossierExcel(client, sessions, allReports.filter(r => r.clientId === id), formatDate, getPhaseLabel)}
      />

      {/* Synthesis + Stats — 50/50 layout */}
      <ClientStatsPanel
        client={client}
        sessions={sessions}
        allSessions={allSessions}
        therapyPhasesData={therapyPhasesData}
        phaseColors={phaseColors}
        activeCycle={activeCycle}
        getSessionCycle={getSessionCycle}
        getPhaseIcon={getPhaseIcon}
        getPhaseLabel={getPhaseLabel}
        formatDate={formatDate}
        updateClient={updateClient}
        updateTherapyCycle={updateTherapyCycle}
        updateSession={updateSession}
        clientId={id}
        pendingReportsCount={pendingReportsCount}
        totalSessions={client?.totalSessions || 20}
        completedCount={completedCount}
      />

      <div className="grid-2" style={{ flex: 1, alignItems: 'stretch' }}>
        {/* Session Cards — harmonized with dashboard */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Calendar size={22} />
              <h3>Thérapie #{therapyCycles.filter(c => sessions.some(s => s.date >= c.startDate && getSessionCycle(s)?.id === c.id)).length || 1}</h3>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.714rem', padding: '4px 10px' }}
                onClick={() => setShowContactForm(!showContactForm)}
              >
                <Plus size={14} /> Contact
              </button>
              <AddSessionButton label="Séance" onClick={async () => {
                // Default date = today, time = current hour
                const now = new Date()
                const h = now.getHours()
                const dateStr = now.toISOString().split('T')[0]
                const timeStr = `${String(h).padStart(2, '0')}:00`
                // Inherit phase
                const recentSessions = sessions.filter(s => s.clientId === id && s.status !== 'cancelled').sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                const lastSessionPhase = recentSessions[0]?.phase
                const clientPhase = client?.phase !== 'prospect' ? client?.phase : null
                const inheritedPhase = lastSessionPhase || clientPhase || (therapyPhasesData[0]?.key || 'debut')
                // Create session and immediately open the SessionDetailModal
                const newSession = await createSession({
                  clientId: id,
                  date: `${dateStr}T${timeStr}:00`,
                  duration: 60,
                  phase: inheritedPhase,
                  status: 'scheduled',
                })
                if (newSession?.id) {
                  setExpandedSessionId(newSession.id)
                }
              }} />
            </div>
          </div>

          <ClientTimelinePanel
            client={client}
            clients={clients}
            contacts={contacts}
            sessions={sessions}
            therapyCycles={therapyCycles}
            setTherapyCycles={setTherapyCycles}
            getSessionCycle={getSessionCycle}
            getClientName={getClientName}
            contactIcons={contactIcons}
            contactLabels={contactLabels}
            contactColors={contactColors}
            showContactForm={showContactForm}
            setShowContactForm={setShowContactForm}
            contactType={contactType}
            setContactType={setContactType}
            contactDate={contactDate}
            setContactDate={setContactDate}
            contactNote={contactNote}
            setContactNote={setContactNote}
            editingContactId={editingContactId}
            setEditingContactId={setEditingContactId}
            handleAddContact={handleAddContact}
            handleUpdateContact={handleUpdateContact}
            handleDeleteContact={handleDeleteContact}
            updateContact={updateContact}
            phaseFilter={phaseFilter}
            confirmingContactId={confirmingContactId}
            setConfirmingContactId={setConfirmingContactId}
            confirmContactDate={confirmContactDate}
            setConfirmContactDate={setConfirmContactDate}
            sessionNumbers={sessionNumbers}
            sessionUpdates={sessionUpdates}
            recordingSessionId={recordingSessionId}
            safeGetRate={safeGetRate}
            expandedSessionId={expandedSessionId}
            setExpandedSessionId={setExpandedSessionId}
            deleteSession={deleteSession}
            getPhaseColor={getPhaseColor}
            getPhaseIcon={getPhaseIcon}
            getPhaseLabel={getPhaseLabel}
            getClientType={getClientType}
            isProspect={isProspect}
            formatDate={formatDate}
            formatTime={formatTime}
            navigate={navigate}
            activeCycle={activeCycle}
            confirm={confirm}
            defaultPhaseKey={defaultPhaseKey}
          />

          {/* Creation date marker — always visible at bottom */}
          <ClientCreationMarker
            client={client}
            completedCount={completedCount}
            updateClient={updateClient}
            createTherapyCycle={createTherapyCycle}
            currentRate={currentRate}
            therapyPhasesData={therapyPhasesData}
            formatDate={formatDate}
            confirm={confirm}
          />
        </div>

        <div>

          {/* AI Synthesis */}
          <ClientAiSynthesisPanel
            client={client}
            completedCount={completedCount}
            reportsCount={reportsCount}
            updateClient={updateClient}
            aiGenerating={aiGenerating}
            setAiGenerating={setAiGenerating}
          />

          {/* Notes du dossier — compact preview */}
          <ClientNotesPreview
            client={client}
            setShowNotesModal={setShowNotesModal}
          />

          {/* Mini Financial Dashboard */}
          <ClientFinancialPanel
            sessions={sessions}
            client={client}
            therapyCycles={therapyCycles}
            activeCycle={activeCycle}
            sessionNumbers={sessionNumbers}
            safeGetRate={safeGetRate}
            getInvoiceForSession={getInvoiceForSession}
            formatDate={formatDate}
            setExpandedSessionId={setExpandedSessionId}
            setContactNote={setContactNote}
            setShowContactForm={setShowContactForm}
            sessionRates={sessionRates}
            defaultPhaseKey={defaultPhaseKey}
            getPhaseColor={getPhaseColor}
          />
        </div>
      </div>

      {/* Mes notes du dossier */}
      {showNotesModal && (
        <NotesModal
          clientName={getClientName(client)}
          noteCategories={{
            dynamique: client.noteDynamique || '',
            axes: client.noteAxes || '',
            vigilance: client.noteVigilance || '',
            objectifs: client.noteObjectifs || ''
          }}
          setNoteCategories={(updater) => {
            const current = {
              dynamique: client.noteDynamique || '',
              axes: client.noteAxes || '',
              vigilance: client.noteVigilance || '',
              objectifs: client.noteObjectifs || ''
            }
            const next = typeof updater === 'function' ? updater(current) : updater
            updateClient(client.id, {
              noteDynamique: next.dynamique,
              noteAxes: next.axes,
              noteVigilance: next.vigilance,
              noteObjectifs: next.objectifs
            })
          }}
          globalNote={client.notes || ''}
          setGlobalNote={(val) => updateClient(client.id, { notes: val })}
          onClose={() => setShowNotesModal(false)}
        />
      )}

      {/* Session Detail Modal */}
      {expandedSessionId && (() => {
        const session = allSessions.filter(s => s.clientId === id).find(s => s.id === expandedSessionId)
        if (!session) return null
        const sessionNum = sessionNumbers[session.id]
        return (
          <SessionDetailModal
            session={session}
            client={client}
            sessions={allSessions.filter(s => s.clientId === id)}
            sessionNum={sessionNum}
            sessionModal={sessionModalState}
            sessionActions={sessionModalActions}
            therapy={{ phasesData: therapyPhasesData, defaultPhaseKey, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, sessionNumbers }}
            utils={{ updateSession, formatDate, getClientName }}
          />
        )
      })()}

      {/* Edit Identity Panel */}
      {showEditModal && (
        <EditIdentityModal
          client={client}
          editState={editIdentityState}
          editActions={editIdentityActions}
          therapy={{ phasesData: therapyPhasesData, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, phase: client.phase, setPhase: (val) => updateClient(client.id, { phase: val }), status: client.status }}
          data={{ clients, professionals, recruitmentSources }}
          utils={{ updateClient, createClient, updatePro, createPro, navigate, getClientName, getClientType, getClientInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert, formatDate, getPhaseLabel, showToast }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          client={client}
          clientName={getClientName(client)}
          onConfirm={async () => {
            const now = new Date().toISOString()
            if (updateClient) {
              await updateClient(client.id, { deleted: true, deletedAt: now })
            }
            setShowDeleteConfirm(false)
            setShowEditModal(false)
            navigate(client.phase === 'prospect' ? '/clients?tab=prospects' : '/clients')
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}



      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div >
  )
}

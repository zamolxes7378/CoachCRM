import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, PenTool, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Calendar, Mic, MicOff, Loader, CreditCard, Landmark, Banknote, Phone, Mail, MessageSquare, Plus, Share2, Edit3, Sparkles, RefreshCw, Globe, Hourglass, Euro, X, Trash2, BookOpen, ChevronRight, Heart, AlertCircle, Crosshair, Check, HelpCircle, Link2, Users, User, Star, Baby, Briefcase, Sprout, Search, Target, Award, UserPlus } from 'lucide-react'
// professionals removed — now from DataContext
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'
import { findDuplicateClients, findDuplicatePros } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'
import DeleteConfirmModal from '../components/client/DeleteConfirmModal'
import NotesModal from '../components/client/NotesModal'
import SessionDetailModal from '../components/client/SessionDetailModal'
import EditIdentityModal from '../components/client/EditIdentityModal'
import useSessionModalState from '../hooks/useSessionModalState'
import SessionCard from '../components/session/SessionCard'
import useEditIdentityState from '../hooks/useEditIdentityState'





export default function CoupleDetailPage({ coupleIdProp, onClose } = {}) {
  const params = useParams()
  const id = coupleIdProp || params.id
  const navigate = useNavigate()
  const { clients, sessions: allSessions, reports: allReports, recruitmentSources, sessionRates, therapyPhases: therapyPhasesData, phaseIcons, phaseColors, defaultPhaseKey, getPhaseColor, getPhaseIcon, getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel, getClientType, formatDate, formatTime, updateSession, updateClient, createSession, deleteSession, refreshData, professionals, createProfessional: createPro, updateProfessional: updatePro } = useData()
  const confirm = useConfirm()
  const couple = clients.find(c => c.id === id)
  // Sanitize: remove self-referencing clientLinks
  if (couple?.clientLinks) {
    couple.clientLinks = couple.clientLinks.filter(l => l.clientId !== couple.id)
  }
  // Session modal state (from hook)
  const { state: sessionModalState, actions: sessionModalActions } = useSessionModalState({ sessions: allSessions.filter(s => s.coupleId === id), updateSession, sessionRate: couple?.type === 'individual' ? sessionRates.individual : sessionRates.couple, originalRate: couple?.type === 'individual' ? sessionRates.individual : sessionRates.couple })
  const { sessionUpdates, expandedSessionId, rateOverrides, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions } = sessionModalState
  const { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR } = sessionModalActions

  // Edit identity state (from hook)
  const { state: editIdentityState, actions: editIdentityActions } = useEditIdentityState({ couple, getClientType })
  const { editPartnerA, editPartnerB, editChildren, editType, editReferents, editSource, showEditModal, showDeleteConfirm, modalShowAddLink, modalAddLinkSearch, modalReferrerSearch, modalSelectedReferrer, modalShowReferrerDropdown, modalExternalReferrer } = editIdentityState
  const { setEditPartnerA, setEditPartnerB, setEditChildren, setEditType, setEditReferents, setEditSource, setShowEditModal, setShowDeleteConfirm, setModalShowAddLink, setModalAddLinkSearch, setModalReferrerSearch, setModalSelectedReferrer, setModalShowReferrerDropdown, setModalExternalReferrer } = editIdentityActions

    const [status, setStatus] = useState(couple?.status || 'active')
  const [phase, setPhase] = useState(couple?.phase || 'prospect')
  const [totalSessions, setTotalSessions] = useState(couple?.totalSessions || 20)
  const [editingTotal, setEditingTotal] = useState(false)
  const [tempTotal, setTempTotal] = useState(totalSessions)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactType, setContactType] = useState('phone')
  const [contactNote, setContactNote] = useState('')
  const [editingContactId, setEditingContactId] = useState(null)
  const [phaseFilter, setPhaseFilter] = useState(null)
  const [contactDate, setContactDate] = useState(new Date().toISOString().slice(0, 16))
  const [contacts, setContacts] = useState(() => {
    // Use stored contacts if available (e.g. mirror parrainage events)
    if (couple?.contacts && couple.contacts.length > 0) return couple.contacts
    // For legacy mock clients only, show sample contacts
    if (couple?.id && /^c\d+$/.test(couple.id)) return [
      { id: 'c1', type: 'phone', date: '2026-03-18T09:30', note: 'Appel de suivi — le couple se sent bien, RAS.' },
      { id: 'c2', type: 'email', date: '2026-03-10T14:00', note: 'Envoi du récapitulatif de la séance 7.' },
      { id: 'c3', type: 'sms', date: '2026-03-05T11:15', note: 'Confirmation du RDV du 7 mars.' },
    ]
    return []
  })
  const totalInputRef = useRef(null)
  const [aiSynthesis, setAiSynthesis] = useState(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [globalNote, setGlobalNote] = useState(couple?.notes || '')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [confirmingContactId, setConfirmingContactId] = useState(null)
  const [confirmContactDate, setConfirmContactDate] = useState('')
  const [noteCategories, setNoteCategories] = useState({
    dynamique: couple?.noteDynamique || '',
    axes: couple?.noteAxes || '',
    vigilance: couple?.noteVigilance || '',
    objectifs: couple?.noteObjectifs || ''
  })
  const defaultRate = couple?.type === 'individual' ? sessionRates.individual : sessionRates.couple
  const [therapyCycles, setTherapyCycles] = useState([{ id: 'tc1', startDate: couple?.startDate || '2025-01-01', rate: defaultRate, totalSessions: couple?.totalSessions || 20, phase: couple?.phase || (therapyPhasesData[0]?.key || 'debut') }])
  const activeCycle = therapyCycles[therapyCycles.length - 1]
  const [sessionRate, setSessionRate] = useState(activeCycle.rate)
  const [editingRate, setEditingRate] = useState(false)
  const [tempRate, setTempRate] = useState(activeCycle.rate)
  const rateInputRef = useRef(null)
  const [editingSessionRate, setEditingSessionRate] = useState(null)
  const [tempSessionRate, setTempSessionRate] = useState('')
  const [originalRate] = useState(activeCycle.rate) // rate at initialization, for past sessions
  const todayStr = new Date().toISOString().split('T')[0]
  const [phaseDropdownOpen, setPhaseDropdownOpen] = useState(false)
  const [sessionFrequency, setSessionFrequency] = useState(couple?.sessionFrequency || 2)
  const [editingFrequency, setEditingFrequency] = useState(false)
  const [tempFrequency, setTempFrequency] = useState(2)
  const frequencyInputRef = useRef(null)
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

  if (!couple) {
    return <div className="empty-state"><p>Couple non trouvé</p></div>
  }

  const sessions = allSessions.filter(s => s.coupleId === id).map(s => {
    // Auto-complete: only if past AND payment condition met (paymentMethod set OR paymentAmount = 0)
    if (s.status === 'scheduled') {
      const endTime = new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000)
      const effectiveAmount = s.paymentAmount ?? sessionRates[couple?.type] ?? null
      const paymentCondition = !!s.paymentMethod || effectiveAmount === 0
      if (endTime <= new Date() && paymentCondition) return { ...s, status: 'completed' }
    }
    return s
  }).sort((a, b) => b.date.localeCompare(a.date))
  const reports = allReports.filter(r => r.coupleId === id)
  const PhaseIcon = getPhaseIcon(phase)

  // Compute session numbers chronologically
  const sortedSessions = [...sessions].filter(s => s.status !== 'cancelled').sort((a, b) => a.date.localeCompare(b.date))
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
  const completedCount = activeCycleSessions.filter(s => s.status === 'completed').length
  const reportsCount = activeCycleSessions.filter(s => s.hasReport || sessionUpdates[s.id]?.hasReport).length

  // Compute next/last session
  const now = new Date()
  const futureSessions = sessions.filter(s => new Date(s.date) > now && s.status !== 'cancelled')
  const pastSessions = sessions.filter(s => new Date(s.date) <= now && s.status !== 'cancelled')
  const nextSessionDate = futureSessions.length > 0 ? futureSessions.sort((a, b) => a.date.localeCompare(b.date))[0].date : null
  const lastSessionDate = pastSessions.length > 0 ? pastSessions.sort((a, b) => b.date.localeCompare(a.date))[0].date : null

  const handleSaveTotal = () => {
    const val = parseInt(tempTotal)
    if (val > 0) {
      setTotalSessions(val)
      couple.totalSessions = val
      updateClient(couple.id, { totalSessions: val })
    }
    setEditingTotal(false)
  }

  const handleAddContact = () => {
    if (!contactNote.trim()) return
    setContacts(prev => [{
      id: `c${Date.now()}`, type: contactType, date: contactDate, note: contactNote.trim()
    }, ...prev])
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

  const handleUpdateContact = () => {
    if (!contactNote.trim()) return
    setContacts(prev => prev.map(c => c.id === editingContactId
      ? { ...c, type: contactType, date: contactDate, note: contactNote.trim() }
      : c
    ))
    setContactNote('')
    setEditingContactId(null)
    setShowContactForm(false)
  }

  const handleDeleteContact = (contactId) => {
    setContacts(prev => prev.filter(c => c.id !== contactId))
  }

  const contactIcons = { phone: Phone, email: Mail, sms: MessageSquare, social: Share2, web: Globe, parrainage: Award }
  const contactLabels = { phone: 'Appel', email: 'Email', sms: 'SMS', social: 'Réseaux sociaux', web: 'Site web', parrainage: 'Parrainage' }
  const contactColors = { phone: { bg: '#E8F5E9', color: '#2E7D32' }, email: { bg: '#E3F2FD', color: '#1565C0' }, sms: { bg: '#FFF3E0', color: '#E65100' }, social: { bg: '#F3E5F5', color: '#7B1FA2' }, web: { bg: '#E0F2F1', color: '#00695C' }, parrainage: { bg: '#F5F0FF', color: '#8B5CF6' } }

  // Generate virtual parrainage events from clientLinks (dynamic — disappear if link removed)
  const parrainageEvents = (couple.clientLinks || []).filter(l => l.type === 'parrainage' || l.type === 'parrainage-pro').map(link => {
    const isPro = link.type === 'parrainage-pro'
    const linkedName = isPro ? link.proName : (() => { const c = clients.find(c => c.id === link.clientId); return c ? getCoupleName(c) : link.clientId })() 
    const isParrain = link.role === 'parrain'
    return {
      id: `parrainage-link-${link.clientId || link.proId}`,
      itemType: 'contact',
      type: 'parrainage',
      date: (couple.createdAt || couple.startDate || new Date().toISOString()).split('T')[0],
      note: isParrain ? `A parrainé ${linkedName}` : `Parrainé par ${linkedName}`,
      linkedClientId: isPro ? null : link.clientId,
      linkedClientName: linkedName,
      done: true
    }
  })

  // Merge sessions and contacts into a timeline
  // Build timeline with cycle separators
  const rawTimelineItems = [
    ...sessions.map(s => ({ ...s, itemType: 'session' })),
    ...contacts.filter(c => c.type !== 'parrainage').map(c => ({ ...c, itemType: 'contact' })),
    ...parrainageEvents
  ].sort((a, b) => b.date.localeCompare(a.date))

  // Insert cycle separators — consider both sessions and contacts for cycle boundaries
  const timelineItems = []
  let lastCycleId = null
  rawTimelineItems.forEach(item => {
    if (therapyCycles.length > 1) {
      // Determine which cycle this item belongs to based on its date
      const itemDate = item.date
      let itemCycle = null
      if (item.itemType === 'session') {
        itemCycle = getSessionCycle(item)
      } else {
        // For contacts, find cycle the same way as sessions
        for (let i = therapyCycles.length - 1; i >= 0; i--) {
          if (itemDate >= therapyCycles[i].startDate) { itemCycle = therapyCycles[i]; break }
        }
        if (!itemCycle) itemCycle = therapyCycles[0]
      }
      if (itemCycle && lastCycleId !== null && itemCycle.id !== lastCycleId) {
        const cycleIdx = therapyCycles.findIndex(c => c.id === itemCycle.id)
        const nextCycleIdx = cycleIdx + 1
        const nextCycleStartDate = therapyCycles[nextCycleIdx]?.startDate || ''
        const cyclesWithSessions = therapyCycles.slice(0, nextCycleIdx + 1).filter(c => sessions.some(s => s.date >= c.startDate && getSessionCycle(s)?.id === c.id)).length
        timelineItems.push({ itemType: 'cycleSeparator', cycleIndex: cyclesWithSessions || 1, startDate: nextCycleStartDate, cycleId: therapyCycles[nextCycleIdx]?.id, id: `sep_${itemCycle.id}` })
      }
      lastCycleId = itemCycle?.id
    }
    timelineItems.push(item)
  })

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => onClose ? onClose() : navigate(couple.phase === 'prospect' ? '/couples?tab=prospects' : '/couples')} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      {/* Header */}
      <div className="couple-header">
        <div className="couple-avatar" onClick={() => { setEditPartnerA({ ...couple.partnerA }); setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {}); setEditChildren(couple.children || []); setEditType(getClientType(couple)); setShowEditModal(true) }} style={{ background: status === 'inactive' ? 'var(--primary-200)' : couple.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', color: status === 'inactive' ? 'white' : couple.phase === 'prospect' ? '#6B46C1' : 'white', cursor: 'pointer' }} title="Modifier l'identité">{getCoupleInitials(couple)}</div>
        <div className="couple-info">
          <div style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            {getClientType(couple) === 'individual' && <><User size={18} /> <span>Individuel</span></>}
            {getClientType(couple) === 'couple' && <><Users size={18} /> <span>Couple</span></>}
            {getClientType(couple) === 'family' && (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="9" r="2"/>
                  <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                  <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                </svg>
                <span>Famille</span>
              </>
            )}
          </div>
          <h1
            onClick={() => { setEditPartnerA({ ...couple.partnerA }); setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {}); setEditChildren(couple.children || []); setEditType(getClientType(couple)); setShowEditModal(true) }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Modifier l'identité"
          >
            {getCoupleName(couple)}
            <Edit3 size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.5, transition: 'opacity 0.2s' }} />
          </h1>

        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div
            onClick={() => {
              const newStatus = status === 'active' ? 'inactive' : 'active'
              setStatus(newStatus)
              couple.status = newStatus
              updateClient(couple.id, { status: newStatus })
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', userSelect: 'none',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'transparent'
            }}
          >
            <span style={{
              fontSize: '0.857rem', fontWeight: 600,
              color: status === 'active' ? '#276749' : 'var(--text-tertiary)'
            }}>
              {status === 'active' ? 'Actif' : 'Inactif'}
            </span>
            <div style={{
              width: 48, height: 26, borderRadius: 13,
              background: status === 'active' ? '#C6F6D5' : '#D1D5DB',
              position: 'relative', transition: 'background 0.3s ease',
              flexShrink: 0,
              boxShadow: status === 'active'
                ? 'inset 0 2px 4px rgba(0,0,0,0.08), 0 1px 2px rgba(39,103,73,0.15)'
                : 'inset 0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F0F0 100%)',
                position: 'absolute', top: 2,
                left: status === 'active' ? 24 : 2,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Client Links Section */}
      {(() => {
        const links = couple.clientLinks || []
        const linkConfig = {
          dossier: { color: '#6366F1', bg: '#EEF2FF', Icon: Link2, label: 'Dossier lié' },
          parrainage: { color: '#8B5CF6', bg: '#F5F0FF', Icon: Award, label: 'Parrainage' },
          'parrainage-pro': { color: '#7C3AED', bg: '#F5F0FF', Icon: Briefcase, label: 'Parrain Pro' }
        }
        const hasLinks = links.length > 0

        return (hasLinks || showAddLink) ? (
          <div style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            marginBottom: 'var(--space-md)', padding: '8px 0'
          }}>
            {links.map((link, idx) => {
              const cfg = linkConfig[link.type] || linkConfig.dossier
              // For parrainage-pro, the linked entity is a professional (not in clients)
              const isPro = link.type === 'parrainage-pro'
              const linked = isPro ? null : clients.find(c => c.id === link.clientId)
              if (!isPro && !linked) return null
              const displayName = isPro ? link.proName : getCoupleName(linked)
              const roleLabel = link.type === 'parrainage' && link.role
                ? (link.role === 'filleul' ? '· Parrain' : '· Filleul')
                : isPro ? '· Parrain Pro' : (getClientType(linked) === 'individual' ? 'Individuel' : getClientType(linked) === 'couple' ? 'Couple' : 'Famille')
              return (
                <div
                  key={idx}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px 4px 8px',
                    borderRadius: 'var(--radius-md)',
                    background: cfg.bg,
                    border: `1px solid ${cfg.color}20`,
                    cursor: 'pointer',
                    fontSize: '0.786rem', fontWeight: 600,
                    color: cfg.color,
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => isPro ? navigate('/admin/reseau-pro') : navigate(`/couples/${linked.id}`)}
                  title={`${cfg.label} — cliquer pour ouvrir`}
                  onMouseEnter={e => { e.currentTarget.style.background = cfg.color + '20'; e.currentTarget.querySelector('.link-x')?.style && (e.currentTarget.querySelector('.link-x').style.opacity = '1') }}
                  onMouseLeave={e => { e.currentTarget.style.background = cfg.bg; e.currentTarget.querySelector('.link-x')?.style && (e.currentTarget.querySelector('.link-x').style.opacity = '0') }}
                >
                  <cfg.Icon size={13} />
                  <span>{displayName}</span>
                  <span style={{ fontSize: '0.571rem', fontWeight: 400, opacity: 0.7 }}>
                    {roleLabel}
                  </span>
                  <button
                    className="link-x"
                    onClick={e => {
                      e.stopPropagation()
                      couple.clientLinks = couple.clientLinks.filter((_, i) => i !== idx)
                      // Also remove reverse link (only for non-pro links)
                      if (linked && linked.clientLinks) {
                        linked.clientLinks = linked.clientLinks.filter(l => l.clientId !== couple.id)
                        updateClient(linked.id, { clientLinks: linked.clientLinks })
                      }
                      updateClient(couple.id, { clientLinks: couple.clientLinks })
                      setShowAddLink(prev => !prev) // force re-render
                      setTimeout(() => setShowAddLink(false), 0)
                    }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: cfg.color, padding: '0 0 0 2px', opacity: 0,
                      transition: 'opacity 0.2s', display: 'flex', alignItems: 'center'
                    }}
                    title="Retirer ce lien"
                  >
                    <X size={12} />
                  </button>
                </div>
              )
            })}

            {/* Add link button / dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowAddLink(!showAddLink)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 'var(--radius-md)',
                  background: 'none', border: '1px dashed var(--border-light)',
                  color: 'var(--text-tertiary)', cursor: 'pointer',
                  fontSize: '0.714rem', fontWeight: 500,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-main)'; e.currentTarget.style.color = 'var(--accent-main)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
              >
                <Plus size={12} /> Lier un dossier
              </button>

              {showAddLink && (
                <>
                <div onClick={() => { setShowAddLink(false); setAddLinkSearch('') }} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 20,
                  marginTop: 6, width: 260,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: 'var(--space-sm)'
                }}>
                  {/* Search */}
                  <input
                    className="input"
                    placeholder="Rechercher un client..."
                    value={addLinkSearch}
                    onChange={e => setAddLinkSearch(e.target.value)}
                    autoFocus
                    style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)' }}
                  />

                  {/* Results */}
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {clients
                      .filter(c => c.id !== couple.id && !c.deleted)
                      .filter(c => !links.some(l => l.clientId === c.id))
                      .filter(c => !addLinkSearch || getCoupleName(c).toLowerCase().includes(addLinkSearch.toLowerCase()))
                      .slice(0, 8)
                      .map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (!couple.clientLinks) couple.clientLinks = []
                              couple.clientLinks.push({ clientId: c.id, type: 'dossier' })
                              if (!c.clientLinks) c.clientLinks = []
                              c.clientLinks.push({ clientId: couple.id, type: 'dossier' })
                              updateClient(couple.id, { clientLinks: couple.clientLinks })
                              updateClient(c.id, { clientLinks: c.clientLinks })
                              setShowAddLink(false)
                              setAddLinkSearch('')
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer', fontSize: '0.786rem',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Link2 size={13} color="#6366F1" />
                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getCoupleName(c)}</span>
                            <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                              {getClientType(c) === 'individual' ? 'Individuel' : getClientType(c) === 'couple' ? 'Couple' : 'Famille'}
                            </span>
                          </div>
                        ))
                    }
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 'var(--space-sm)', padding: '2px 0' }}>
            <button
              onClick={() => setShowAddLink(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 'var(--radius-md)',
                background: 'none', border: '1px dashed var(--border-light)',
                color: 'var(--text-tertiary)', cursor: 'pointer',
                fontSize: '0.714rem', fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-main)'; e.currentTarget.style.color = 'var(--accent-main)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
            >
              <Plus size={12} /> Lier un dossier
            </button>
          </div>
        )
      })()}

      {/* Synthesis + Stats — 50/50 layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        {/* Left: Avancement thérapie */}
        <div className="card" style={{ padding: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avancement dans la thérapie</span>
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{completedCount}/{totalSessions} séances</span>
          </div>
          {(() => {
            const therapyPhases = therapyPhasesData.map(tp => tp.key)
            const phaseCounts = {}
            therapyPhases.forEach(p => { phaseCounts[p] = sessions.filter(s => s.phase === p && s.status !== 'cancelled').length })
            const totalPhased = therapyPhases.reduce((sum, p) => sum + (phaseCounts[p] || 0), 0)
            const currentPhaseIcon = getPhaseIcon(phase)
            const CurrentPhaseIcon = currentPhaseIcon
            // Derive display phase from nearest future session (or most recent past)
            const nowTs = new Date().toISOString()
            const activeSess = sessions.filter(s => s.status !== 'cancelled' && getSessionCycle(s)?.id === activeCycle.id)
            const futureFirst = activeSess.filter(s => s.date > nowTs).sort((a, b) => a.date.localeCompare(b.date))[0]
            const pastFirst = activeSess.filter(s => s.date <= nowTs).sort((a, b) => b.date.localeCompare(a.date))[0]
            const displayPhase = futureFirst?.phase || pastFirst?.phase || phase
            const DisplayIcon = getPhaseIcon(displayPhase)
            return (

              <>
                {/* Multi-segment bar — completed (vivid) + scheduled (light) — active cycle only */}
                {(() => {
                  const now = new Date().toISOString()
                  const cycleSessions = sessions.filter(s => s.status !== 'cancelled' && getSessionCycle(s)?.id === activeCycle.id)
                  const doneByPhase = {}
                  const scheduledByPhase = {}
                  therapyPhases.forEach(p => {
                    doneByPhase[p] = cycleSessions.filter(s => s.phase === p && s.status !== 'scheduled' && s.date <= now).length
                    scheduledByPhase[p] = cycleSessions.filter(s => s.phase === p && s.status === 'scheduled').length
                  })
                  const totalAssigned = therapyPhases.reduce((s, p) => s + (doneByPhase[p] || 0) + (scheduledByPhase[p] || 0), 0)
                  const barBase = Math.max(totalSessions, totalAssigned)
                  return (
                    <>
                      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 6, background: '#E2E8F0' }}>
                        {therapyPhases.map((p, i) => {
                          const done = doneByPhase[p] || 0
                          const sched = scheduledByPhase[p] || 0
                          if (done + sched === 0) return null
                          const pc = phaseColors[p]
                          return (
                            <React.Fragment key={p}>
                              {done > 0 && <div style={{
                                width: `${(done / barBase) * 100}%`,
                                background: pc?.color || '#2B6CB0',
                                transition: 'width 0.3s'
                              }} title={`${getPhaseLabel(p)} : ${done} effectuée${done > 1 ? 's' : ''}`} />}
                              {sched > 0 && <div style={{
                                width: `${(sched / barBase) * 100}%`,
                                background: pc?.bg || '#EBF8FF',
                                borderLeft: done > 0 ? '1px solid white' : 'none',
                                transition: 'width 0.3s'
                              }} title={`${getPhaseLabel(p)} : ${sched} planifiée${sched > 1 ? 's' : ''}`} />}
                            </React.Fragment>
                          )
                        })}
                      </div>
                      {/* Phase labels */}
                      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 10, flexWrap: 'wrap' }}>
                        {therapyPhases.map(p => {
                          const done = doneByPhase[p] || 0
                          const sched = scheduledByPhase[p] || 0
                          const total = done + sched
                          const pc = phaseColors[p]
                          const PhIcon = getPhaseIcon(p)
                          return (
                            <div key={p} style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              fontSize: '0.643rem', color: total > 0 ? (pc?.color || '#2B6CB0') : 'var(--text-tertiary)',
                              fontWeight: total > 0 ? 600 : 400,
                              opacity: total > 0 ? 1 : 0.5
                            }}>
                              <PhIcon size={10} />
                              <span>{getPhaseLabel(p)}</span>
                              <span style={{ fontWeight: 700 }}>({done}{sched > 0 ? `+${sched}` : ''})</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </>
            )
          })()}
          {nextSessionDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
              <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
                Prochain RDV : {formatDate(nextSessionDate)}
              </span>
            </div>
          ) : status === 'active' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', background: '#FFFBEB',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #FEF3C7'
            }}>
              <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
              <span style={{ fontSize: '0.714rem', color: '#D97706', fontWeight: 600 }}>
                Aucun prochain RDV planifié
              </span>
            </div>
          ) : lastSessionDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
                Dernier RDV : {formatDate(lastSessionDate)}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)' }}>
                Aucun RDV
              </span>
            </div>
          )}
        </div>

        {/* Right: 4 stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)' }}
            onClick={() => { setTempTotal(totalSessions); setEditingTotal(true) }}
            title="Cliquer pour modifier l'objectif"
          >
            <Target size={24} style={{ color: '#276749', marginBottom: 4, cursor: 'pointer' }} />
            {editingTotal ? (
              <div>
                <input
                  ref={totalInputRef}
                  type="number" min="1" value={tempTotal}
                  onChange={e => setTempTotal(e.target.value)}
                  onBlur={handleSaveTotal}
                  onKeyDown={e => e.key === 'Enter' && handleSaveTotal()}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 40, border: '2px solid #276749', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#F0FFF4', color: '#276749', outline: 'none' }}
                />
              </div>
            ) : (
              <div className="stat-value" style={{ fontSize: '1.286rem', color: '#276749', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                {totalSessions}
                <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <div className="stat-label" style={{ fontSize: '0.643rem' }}>Objectif</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)', cursor: 'pointer' }}
            onClick={() => { setTempRate(sessionRate); setEditingRate(true); setTimeout(() => rateInputRef.current?.focus(), 50) }}
          >
            <Euro size={24} style={{ color: '#E67E22', marginBottom: 4 }} />
            {editingRate ? (
              <div>
                <input
                  ref={rateInputRef}
                  type="number" min="0" step="5" value={tempRate}
                  onChange={e => setTempRate(e.target.value)}
                  onBlur={() => { const v = parseFloat(tempRate); if (v > 0) setSessionRate(v); setEditingRate(false) }}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 50, border: '2px solid #E67E22', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#FFF3E0', color: '#E67E22', outline: 'none' }}
                />
              </div>
            ) : (
              <div className="stat-value" style={{ fontSize: '1.286rem', color: '#E67E22', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                {sessionRate}€
                <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <div className="stat-label" style={{ fontSize: '0.643rem' }}>Tarif spécifique</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)', cursor: 'pointer' }}
            onClick={() => { setTempFrequency(sessionFrequency); setEditingFrequency(true); setTimeout(() => frequencyInputRef.current?.focus(), 50) }}
            title="Cliquer pour modifier la fréquence"
          >
            <RefreshCw size={24} style={{ color: '#2B6CB0', marginBottom: 4 }} />
            {editingFrequency ? (
              <div>
                <input
                  ref={frequencyInputRef}
                  type="number" min="1" max="8" value={tempFrequency}
                  onChange={e => setTempFrequency(e.target.value)}
                  onBlur={() => { const v = parseInt(tempFrequency); if (v > 0) setSessionFrequency(v); setEditingFrequency(false) }}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 40, border: '2px solid #2B6CB0', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#EBF8FF', color: '#2B6CB0', outline: 'none' }}
                />
              </div>
            ) : (
              <div className="stat-value" style={{ fontSize: '1.286rem', color: '#2B6CB0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                {sessionFrequency}/M
                <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <div className="stat-label" style={{ fontSize: '0.643rem' }}>Fréquence</div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)' }}>
            <FileText size={24} style={{ color: 'var(--info)', marginBottom: 4 }} />
            <div className="stat-value" style={{ fontSize: '1.286rem' }}>{reportsCount}</div>
            <div className="stat-label" style={{ fontSize: '0.643rem' }}>CR</div>
          </div>
        </div>
      </div>

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
              <button
                className="btn btn-accent"
                onClick={async () => {
                  // Default date = today, time = current hour
                  const now = new Date()
                  const h = now.getHours()
                  const dateStr = now.toISOString().split('T')[0]
                  const timeStr = `${String(h).padStart(2, '0')}:00`
                  // Inherit phase
                  const recentSessions = sessions.filter(s => s.coupleId === id && s.status !== 'cancelled').sort((a, b) => b.date.localeCompare(a.date))
                  const lastSessionPhase = recentSessions[0]?.phase
                  const couplePhase = couple?.phase !== 'prospect' ? couple?.phase : null
                  const inheritedPhase = lastSessionPhase || couplePhase || (therapyPhasesData[0]?.key || 'debut')
                  // Create session and immediately open the SessionDetailModal
                  const newSession = await createSession({
                    coupleId: id,
                    date: `${dateStr}T${timeStr}:00`,
                    duration: 60,
                    phase: inheritedPhase,
                    status: 'scheduled',
                  })
                  if (newSession?.id) {
                    setExpandedSessionId(newSession.id)
                  }
                }}
              >
                <Plus size={18} style={{ color: 'white' }} /> Séance
              </button>
            </div>
          </div>

          {/* Add Contact Form */}
          {showContactForm && !editingContactId && (
            <div style={{
              padding: 'var(--space-sm)',
              background: '#FAFAFA',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-sm)',
              border: '1px solid var(--border-light)'
            }}>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                {['phone', 'email', 'sms', 'social', 'web'].map(t => {
                  const Icon = contactIcons[t]
                  const cc = contactColors[t]
                  return (
                    <button
                      key={t}
                      onClick={() => setContactType(t)}
                      style={{
                        padding: '4px 10px', borderRadius: 'var(--radius-md)',
                        border: '2px solid transparent',
                        background: contactType === t ? cc.bg : 'white',
                        color: cc.color, fontSize: '0.714rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                      }}
                    >
                      <Icon size={12} /> {contactLabels[t]}
                    </button>
                  )
                })}
              </div>
              <input
                type="datetime-local"
                className="input"
                value={contactDate}
                onChange={e => setContactDate(e.target.value)}
                style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)', width: '100%' }}
              />
              <textarea
                className="input"
                placeholder="Note sur le contact…"
                value={contactNote}
                onChange={e => setContactNote(e.target.value)}
                rows={6}
                style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)', width: '100%', resize: 'vertical', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" style={{ fontSize: '0.714rem', padding: '4px 8px' }} onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactNote('') }}>Annuler</button>
                <button className="btn btn-primary" style={{ fontSize: '0.714rem', padding: '4px 10px' }} onClick={editingContactId ? handleUpdateContact : handleAddContact}>
                  {editingContactId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          {/* Merged Timeline — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {timelineItems.filter(item => !phaseFilter || item.itemType !== 'session' || item.phase === phaseFilter).map(item => {
              if (item.itemType === 'cycleSeparator') {
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    margin: 'var(--space-xs) 0'
                  }}>
                    <div style={{ flex: 1, height: 2, background: 'var(--primary-200)' }} />
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: '0.714rem', fontWeight: 700, color: 'var(--primary-700)',
                      whiteSpace: 'nowrap',
                      padding: '4px 12px', background: 'transparent', borderRadius: 'var(--radius-full)',
                      border: 'none'
                    }}>
                      <RefreshCw size={11} />
                      Thérapie #{item.cycleIndex} démarrée le
                      <input
                        type="date"
                        key={item.cycleId + '-' + item.startDate}
                        defaultValue={item.startDate}
                        min={couple?.startDate || '2020-01-01'}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={e => {
                          const newDate = e.target.value
                          if (!newDate) return
                          // Reject dates before dossier creation or in the future
                          const minDate = couple?.startDate || '2020-01-01'
                          const today = new Date().toISOString().slice(0, 10)
                          if (newDate < minDate || newDate > today) {
                            e.target.value = item.startDate
                            return
                          }
                          setTherapyCycles(prev => prev.map(c => c.id === item.cycleId ? { ...c, startDate: newDate } : c))
                        }}
                        style={{
                          border: 'none', background: 'transparent', fontWeight: 700,
                          color: 'var(--primary-700)', fontSize: '0.714rem',
                          cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, height: 2, background: 'var(--primary-200)' }} />
                  </div>
                )
              }
              if (item.itemType === 'contact') {
                const ContactIcon = contactIcons[item.type] || Phone
                const cc = contactColors[item.type] || contactColors.phone
                    const isContactFuture = new Date(item.date) > new Date()
                    return (
                  <>
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm)',
                    background: 'white',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${cc.color}`,
                    width: '70%',
                    marginLeft: 'auto',
                    opacity: isContactFuture && !item.done ? 0.7 : 1
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-full)',
                      background: 'white', color: cc.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, border: `1px solid ${cc.color}20`
                    }}>
                      <ContactIcon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.714rem', fontWeight: 600, color: cc.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {contactLabels[item.type]} · {formatDate(item.date)} · {formatTime(item.date)}
                        {item.type !== 'parrainage' && isContactFuture && !item.done && (
                          <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <Clock size={10} /> Planifié
                          </span>
                        )}
                        {item.type !== 'parrainage' && item.done && (
                          <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle size={10} /> Effectué
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {item.type === 'parrainage' && item.linkedClientId ? (
                          <>
                            {item.note.replace(item.linkedClientName, '').trim()}{' '}
                            <span
                              onClick={(e) => { e.stopPropagation(); navigate(`/couples/${item.linkedClientId}`) }}
                              style={{ color: '#8B5CF6', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                            >
                              {item.linkedClientName}
                            </span>
                          </>
                        ) : item.note}
                      </div>
                    </div>
                    {item.type !== 'parrainage' && (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                      {(isContactFuture || item.done) && (
                        <button onClick={() => {
                          if (item.done) {
                            setContacts(prev => prev.map(c => c.id === item.id ? { ...c, done: false } : c))
                          } else {
                            setConfirmingContactId(confirmingContactId === item.id ? null : item.id)
                            setConfirmContactDate(new Date().toISOString().slice(0, 16))
                          }
                        }} style={{
                          width: 26, height: 26, borderRadius: 'var(--radius-full)',
                          background: item.done ? 'var(--success)' : 'transparent',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: item.done ? 'white' : 'var(--success)',
                          transition: 'all 0.2s',
                          border: item.done ? '2px solid var(--success)' : '1.5px solid var(--success)'
                        }}
                          onMouseEnter={e => { if (!item.done) { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white' } }}
                          onMouseLeave={e => { if (!item.done) { e.currentTarget.style.background = item.done ? 'var(--success)' : 'transparent'; e.currentTarget.style.color = item.done ? 'white' : 'var(--success)' } }}
                          title={item.done ? 'Marquer comme non effectué' : 'Confirmer comme effectué'}
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => handleEditContact(item)} style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                        transition: 'all 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary-600)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                        title="Modifier">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDeleteContact(item.id)} style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                        transition: 'all 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--error)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)' }}
                        title="Supprimer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    )}
                  </div>
                  {/* Inline date confirmation */}
                  {confirmingContactId === item.id && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', marginTop: 4,
                      background: 'white', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      width: '70%', marginLeft: 'auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      animation: 'fadeIn 0.15s ease-out'
                    }}>
                      <span style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Date de réalisation :</span>
                      <input
                        type="datetime-local"
                        value={confirmContactDate}
                        onChange={e => setConfirmContactDate(e.target.value)}
                        max={new Date().toISOString().slice(0, 16)}
                        style={{ fontSize: '0.714rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontFamily: 'inherit', flex: 1 }}
                      />
                      <button
                        onClick={() => {
                          setContacts(prev => prev.map(c => c.id === item.id ? { ...c, done: true, date: confirmContactDate } : c))
                          setConfirmingContactId(null)
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--success)', color: 'white', border: 'none',
                          fontSize: '0.714rem', fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'inherit', whiteSpace: 'nowrap'
                        }}
                      >
                        <CheckCircle size={12} /> Confirmer
                      </button>
                      <button
                        onClick={() => setConfirmingContactId(null)}
                        style={{
                          padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                          background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-light)',
                          fontSize: '0.714rem', cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                  {/* Inline edit form for this contact */}
                  {editingContactId === item.id && showContactForm && (
                    <div style={{
                      padding: 'var(--space-sm)', marginTop: 4,
                      background: '#FAFAFA', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-light)',
                      width: '70%', marginLeft: 'auto',
                      animation: 'fadeIn 0.15s ease-out'
                    }}>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
                        {['phone', 'email', 'sms', 'social', 'web'].map(t => {
                          const Icon = contactIcons[t]
                          const ctc = contactColors[t]
                          return (
                            <button key={t} onClick={() => setContactType(t)} style={{
                              padding: '4px 8px', borderRadius: 'var(--radius-md)',
                              border: '2px solid transparent',
                              background: contactType === t ? ctc.bg : 'white',
                              color: ctc.color, fontSize: '0.643rem', fontWeight: 600,
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                            }}>
                              <Icon size={11} /> {contactLabels[t]}
                            </button>
                          )
                        })}
                      </div>
                      <input type="datetime-local" className="input" value={contactDate}
                        onChange={e => setContactDate(e.target.value)}
                        style={{ fontSize: '0.714rem', marginBottom: 'var(--space-xs)', width: '100%' }}
                      />
                      <textarea className="input" placeholder="Note sur le contact…" value={contactNote}
                        onChange={e => setContactNote(e.target.value)} rows={3}
                        onKeyDown={e => e.stopPropagation()}
                        style={{ fontSize: '0.714rem', marginBottom: 'var(--space-xs)', width: '100%', resize: 'vertical', lineHeight: 1.5 }}
                      />
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" style={{ fontSize: '0.643rem', padding: '3px 6px' }} onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactNote('') }}>Annuler</button>
                        <button className="btn btn-primary" style={{ fontSize: '0.643rem', padding: '3px 8px' }} onClick={handleUpdateContact}>Modifier</button>
                      </div>
                    </div>
                  )}
                  </>
                )
              }

              // Session card
              const session = item
              const effectivePhase = (session.phase === 'prospect' ? defaultPhaseKey : session.phase) || couple?.phase || defaultPhaseKey
              const sessionNum = sessionNumbers[session.id]
              const update = sessionUpdates[session.id]
              const hasReport = session.hasReport || update?.hasReport
              const summary = update?.summary || session.summary
              const isRecording = recordingSessionId === session.id
              const isPast = new Date(session.date) <= new Date()
              const sessionRate = getRate(session.id)
              // Compute invoice info (includes sessions covered by another invoice)
              const hasSelfInv = session.needsInvoice
              const covBy = sessions.find(other => other.needsInvoice && other.id !== session.id && (other.invoiceCoveredSessionIds || []).includes(session.id))
              const needsF = hasSelfInv || !!covBy
              const fSent = hasSelfInv ? session.invoiceSent : covBy?.invoiceSent
              return (
                <div key={session.id}>
                  <SessionCard
                    session={session}
                    sessionNumber={sessionNum}
                    phaseColor={getPhaseColor(effectivePhase)}
                    PhaseIcon={getPhaseIcon(effectivePhase)}
                    phaseLabel={getPhaseLabel(effectivePhase)}
                    showClientName={false}
                    sessionRate={sessionRate}
                    isExpanded={expandedSessionId === session.id}
                    showExpandedStyle={true}
                    hasReport={hasReport}
                    reportSummary={summary}
                    invoiceInfo={needsF ? { needsInvoice: true, invoiceSent: fSent } : null}
                    formatDate={formatDate}
                    formatTime={formatTime}
                    onClick={() => setExpandedSessionId(session.id)}
                    dimmed={therapyCycles.length > 1 && getSessionCycle(session)?.id !== activeCycle.id}
                    onDelete={session.status === 'cancelled' ? async (sid) => {
                      const ok = await confirm('Supprimer définitivement cette séance annulée ?\nElle disparaîtra du timeline et du calendrier.', { variant: 'destructive' })
                      if (!ok) return
                      await deleteSession(sid)
                    } : undefined}
                  />
                </div>
              )
            })}
          </div>

          {/* Creation date marker — always visible at bottom */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 'var(--space-sm)',
            padding: 'var(--space-xs) var(--space-sm)',
            borderTop: '1px dashed var(--border-light)',
            marginTop: 'var(--space-xs)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <UserPlus size={16} style={{ color: '#E67E22', flexShrink: 0 }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                Création du dossier · {formatDate(couple.startDate)}
              </span>
            </div>
            {completedCount > 0 && (
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.643rem', padding: '3px 8px' }}
                onClick={async () => {
                  if (!await confirm('Démarrer une nouvelle thérapie ? Les séances actuelles seront archivées.')) return
                  const newCycle = {
                    id: `tc${Date.now()}`,
                    startDate: new Date().toISOString().slice(0, 10),
                    rate: sessionRate,
                    totalSessions: 20,
                    phase: therapyPhasesData[0]?.key || 'debut'
                  }
                  setTherapyCycles(prev => [...prev, newCycle])
                  setTotalSessions(20)
                  setSessionRate(newCycle.rate)
                  setTempRate(newCycle.rate)
                  couple.phase = therapyPhasesData[0]?.key || 'debut'
                  updateClient(couple.id, { phase: therapyPhasesData[0]?.key || 'debut' })
                  setPhase(therapyPhasesData[0]?.key || 'debut')
                }}
              >
                <RefreshCw size={12} /> Nouvelle thérapie
              </button>
            )}
          </div>
        </div>

        <div>

          {/* AI Synthesis */}
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #764ba230', boxShadow: '0 2px 12px rgba(118,75,162,0.1)' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: 'var(--space-md) var(--space-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: 'white' }} />
                <h3 style={{ color: 'white', fontSize: '0.929rem', margin: 0 }}>Synthèse IA du dossier</h3>
              </div>
              <button
                onClick={() => {
                  setAiGenerating(true)
                  setTimeout(() => {
                    setAiSynthesis({
                      text: `Après ${completedCount} séances, le couple montre une progression significative dans sa capacité à communiquer de manière constructive. Les principaux axes de travail identifiés :\n\n• **Communication** : Nette amélioration de l'écoute active. Le couple utilise désormais régulièrement la reformulation.\n• **Gestion des conflits** : Les mécanismes de désamorçage mis en place sont efficaces. Réduction de 60% des escalades conflictuelles rapportées.\n• **Attachement** : Travail en cours sur les schémas relationnels hérités. Prise de conscience des patterns répétitifs.\n• **Rituels** : Le rituel de communication hebdomadaire est bien ancré et apprécié par les deux partenaires.${globalNote ? '\n\n**Notes du thérapeute intégrées** : Les observations personnelles du praticien ont été prises en compte dans cette synthèse.' : ''}\n\n**Recommandation** : Poursuivre le travail sur l'expression des besoins individuels et consolider les acquis en gestion de conflits.`,
                      date: new Date().toLocaleString('fr-FR'),
                      sessions: completedCount,
                      sources: `${reportsCount} compte${reportsCount > 1 ? 's' : ''} rendu${reportsCount > 1 ? 's' : ''}${globalNote ? ' + notes du dossier' : ''}`
                    })
                    setAiGenerating(false)
                  }, 2500)
                }}
                disabled={aiGenerating}
                style={{
                  background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white', borderRadius: 'var(--radius-md)',
                  padding: '4px 10px', fontSize: '0.714rem', fontWeight: 600,
                  cursor: aiGenerating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  backdropFilter: 'blur(4px)'
                }}
              >
                {aiGenerating ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyse…</> : <><Sparkles size={12} /> {aiSynthesis ? 'Régénérer' : 'Générer'}</>}
              </button>
            </div>
            <div style={{ padding: 'var(--space-md)' }}>
              {aiSynthesis ? (
                <>
                  <div style={{ fontSize: '0.857rem', color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                    {aiSynthesis.text.split('\n').map((line, i) => {
                      const boldMatch = line.match(/\*\*(.*?)\*\*/g)
                      if (boldMatch) {
                        const parts = line.split(/\*\*(.*?)\*\*/)
                        return <p key={i} style={{ margin: '2px 0' }}>{parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}</p>
                      }
                      if (line.startsWith('•')) return <p key={i} style={{ margin: '2px 0', paddingLeft: 8 }}>{line}</p>
                      return <p key={i} style={{ margin: line ? '4px 0' : '2px 0' }}>{line}</p>
                    })}
                  </div>
                  <div style={{
                    marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.643rem', color: 'var(--text-tertiary)'
                  }}>
                    <Sparkles size={10} style={{ color: '#764ba2' }} />
                    Généré par IA · {aiSynthesis.date} · Basé sur {aiSynthesis.sources || `${aiSynthesis.sessions} comptes rendus`}
                  </div>
                </>
              ) : (
                <div style={{
                  textAlign: 'center', padding: 'var(--space-lg) var(--space-md)',
                  color: 'var(--text-tertiary)'
                }}>
                  <Sparkles size={32} style={{ color: '#764ba230', marginBottom: 8 }} />
                  <p style={{ fontSize: '0.857rem', marginBottom: 4 }}>Aucune synthèse générée</p>
                  <p style={{ fontSize: '0.714rem' }}>Cliquez sur « Générer » pour créer une synthèse IA à partir des {reportsCount} comptes rendus{globalNote ? ' et de vos notes du dossier' : ''} disponibles.</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes du dossier — compact preview */}
          <div
            className="card"
            onClick={() => setShowNotesModal(true)}
            style={{
              marginTop: 'var(--space-md)', cursor: 'pointer',
              transition: 'box-shadow 0.15s, transform 0.15s',
              padding: 'var(--space-sm) var(--space-md)'
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <BookOpen size={16} style={{ color: 'var(--primary-500)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Mes notes du dossier</div>
                <div style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {globalNote || 'Aucune note — cliquez pour rédiger'}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, alignSelf: 'center' }} />
            </div>
          </div>

          {/* Mini Financial Dashboard */}
          <div className="card" style={{ marginTop: 'var(--space-md)' }}>
            <div className="card-header">
              <Euro size={18} />
              <h3 style={{ fontSize: '0.929rem' }}>Suivi financier</h3>
            </div>

            {(() => {
              const completedSessions = sessions.filter(s => s.status === 'completed')
              const scheduledSessions = sessions.filter(s => s.status === 'scheduled')
              const cancelledWithPayment = sessions.filter(s => s.status === 'cancelled' && s.paymentAmount && s.paymentAmount > 0)
              const allBillableSessions = [...completedSessions, ...scheduledSessions, ...cancelledWithPayment]
              const pAmountOf = s => s.paymentAmount ?? getRate(s.id)
              const totalBilled = completedSessions.reduce((sum, s) => sum + getRate(s.id), 0) + cancelledWithPayment.reduce((sum, s) => sum + pAmountOf(s), 0)
              const totalPlanned = scheduledSessions.reduce((sum, s) => sum + getRate(s.id), 0)
              const totalForecast = totalBilled + totalPlanned
              const paidSessions = allBillableSessions.filter(s => s.paymentReceived)
              const totalCollected = paidSessions.reduce((sum, s) => sum + pAmountOf(s), 0)
              const deferredSessions = allBillableSessions.filter(s => s.paymentMethod && !s.paymentReceived && pAmountOf(s) > 0 && s.status !== 'scheduled')
              const unpaid = allBillableSessions.filter(s => !s.paymentMethod)
              const pendingInvoices = allBillableSessions.filter(s => {
                if (s.needsInvoice && !s.invoiceSent) return true
                const coveredBy = sessions.find(other => other.needsInvoice && !other.invoiceSent && other.id !== s.id && (other.invoiceCoveredSessionIds || []).includes(s.id))
                return !!coveredBy
              })
              const remaining = totalForecast - totalCollected

              return (
                <>
                  {/* KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
                    <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: 'var(--primary-100)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--primary-700)' }}>{totalBilled}€</div>
                      <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Honoraires dûs</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--primary-700)' }}>{totalPlanned}€</div>
                      <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Honoraires planifiés</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: '#F0FFF4', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '1.143rem', fontWeight: 700, color: '#276749' }}>{totalCollected}€</div>
                      <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Encaissé</div>
                    </div>
                    {(() => {
                      const resteDu = totalBilled - totalCollected
                      return (
                        <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: resteDu > 0 ? '#FFF5F5' : '#F0FFF4', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: '1.143rem', fontWeight: 700, color: resteDu > 0 ? 'var(--error)' : '#276749' }}>{resteDu}€</div>
                          <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Restant dû</div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>
                      <span>Taux d'encaissement</span>
                      {(() => { const pct = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0; return <span style={{ fontWeight: 700, color: pct >= 100 ? '#276749' : 'var(--error)' }}>{pct}%</span> })()}
                    </div>
                    <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3 }}>
                      <div style={{
                        height: '100%', borderRadius: 3,
                        background: 'var(--primary-700)',
                        width: `${totalBilled > 0 ? Math.min((totalCollected / totalBilled) * 100, 100) : 0}%`,
                        transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>

                  {/* Alerts */}
                  {(() => {
                    const unpaidCompleted = unpaid.filter(s => s.status === 'completed')
                    return unpaidCompleted.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', background: '#FFFBEB',
                      borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
                      border: '1px solid #FEF3C7'
                    }}>
                      <HelpCircle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.714rem', color: '#D97706', fontWeight: 600 }}>
                        Séances à confirmer : {unpaidCompleted.length} séance{unpaidCompleted.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )})()}
                  {deferredSessions.length > 0 && (() => {
                    const totalDue = totalBilled - totalCollected
                    return (
                    <div
                      onClick={() => {
                        const lines = deferredSessions.map(ds => {
                          const dsNum = sessionNumbers[ds.id]
                          const dsRate = getRate(ds.id)
                          const pmLabel = { cheque: 'chèque', virement: 'virement' }[ds.paymentMethod] || ''
                          return `• Séance ${dsNum} du ${formatDate(ds.date)} – ${dsRate}€ (${pmLabel})`
                        }).join('\n')
                        const reminder = `Relance paiement – ${deferredSessions.length} séance${deferredSessions.length > 1 ? 's' : ''} en attente d'encaissement.\nBonjour,\nJe me permets de vous contacter concernant les règlements suivants :\n${lines}\nMerci de procéder au règlement à votre convenance.\nBien cordialement`
                        setContactNote(reminder)
                        setShowContactForm(true)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', background: '#FFF5F5',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
                        border: '1px solid #FED7D7', cursor: 'pointer', transition: 'background 0.1s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FED7D7'}
                      onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
                      title="Cliquer pour relancer les paiements"
                    >
                      <Hourglass size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.714rem', color: 'var(--error)', fontWeight: 600 }}>
                        Paiements en attente d'encaissement : {totalDue}€
                      </span>
                    </div>
                  )})()}
                  {pendingInvoices.length > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', background: '#EBF8FF',
                      borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
                      border: '1px solid #BEE3F8'
                    }}>
                      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A365D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <text x="12" y="17" textAnchor="middle" fill="#1A365D" stroke="none" fontSize="10" fontWeight="800">€</text>
                        </svg>
                      </span>
                      <span style={{ fontSize: '0.714rem', color: '#1A365D', fontWeight: 600 }}>
                        Factures à émettre : {pendingInvoices.length} séance{pendingInvoices.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Per-session breakdown */}
                  <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 'var(--space-xs)', marginBottom: 4 }}>Détail par séance</div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {(() => {
                      const sortedBillable = [...allBillableSessions].sort((a, b) => b.date.localeCompare(a.date))
                      let lastFinCycleId = null
                      return sortedBillable.map((s, idx) => {
                      const sCycle = getSessionCycle(s)
                      const sNum = sessionNumbers[s.id]
                      const isPaid = s.paymentReceived
                      const noPayment = !s.paymentMethod
                      const rate = getRate(s.id)
                      const isScheduled = s.status === 'scheduled'
                      const isCancelled = s.status === 'cancelled'
                      const showSep = therapyCycles.length > 1 && sCycle && lastFinCycleId !== null && sCycle.id !== lastFinCycleId
                      lastFinCycleId = sCycle?.id
                      return (
                        <React.Fragment key={s.id}>
                        {showSep && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--primary-200)' }} />
                            <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--primary-400)', whiteSpace: 'nowrap' }}>
                              Thérapie #{therapyCycles.indexOf(sCycle) + 1}
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'var(--primary-200)' }} />
                          </div>
                        )}
                        <div key={s.id}
                          onClick={() => setExpandedSessionId(s.id)}
                          style={{
                            display: 'flex', alignItems: 'center',
                            padding: '3px 0', borderBottom: '1px solid var(--border-light)',
                            gap: 6, cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)', transition: 'background 0.1s',
                            opacity: isScheduled && !isPaid ? 0.6 : 1
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          title="Ouvrir le détail de la séance"
                        >
                          <span style={{ fontSize: '0.714rem', color: isCancelled ? 'var(--error)' : isScheduled ? 'var(--text-tertiary)' : 'var(--text-secondary)', flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isCancelled ? `Annulée · ${formatDate(s.date)}` : (() => {
                              if (isScheduled && !isCancelled) {
                                const spc = getPhaseColor(s.phase)
                                return <>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: spc.bg, color: spc.color, fontWeight: 700, fontSize: '0.643rem', padding: '1px 5px', borderRadius: 'var(--radius-sm)', minWidth: 20 }}>S{sNum}</span>
                                  <span>· {formatDate(s.date)}</span>
                                  <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Planifiée</span>
                                </>
                              }
                              return `S${sNum} · ${formatDate(s.date)}`
                            })()}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isScheduled && !isPaid ? null : pAmountOf(s) === 0 ? (
                              <span style={{ fontSize: '0.643rem', fontWeight: 700, color: 'var(--error)' }}>Séance offerte</span>
                            ) : noPayment ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.571rem', fontWeight: 700, color: '#D97706', letterSpacing: '0.02em' }}>
                                <HelpCircle size={9} /> CONFIRMER
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.643rem', fontWeight: isPaid ? 700 : 400, color: isPaid ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                {{ cheque: 'Chèque', virement: 'Virement', especes: 'Espèces' }[s.paymentMethod]}
                                {isPaid ? ' ✓' : ''}
                              </span>
                            )}
                            {(() => {
                              const hasSelfInvoice = s.needsInvoice
                              const coveredBy = sessions.find(other => other.needsInvoice && other.id !== s.id && (other.invoiceCoveredSessionIds || []).includes(s.id))
                              const needsFact = hasSelfInvoice || !!coveredBy
                              const factSent = hasSelfInvoice ? s.invoiceSent : coveredBy?.invoiceSent
                              return needsFact ? (
                                <span style={{ fontSize: '0.571rem', fontWeight: 700, color: factSent ? 'var(--success)' : '#1A365D', letterSpacing: '0.02em' }}>
                                  FACTURE{factSent ? ' ✓' : ''}
                                </span>
                              ) : null
                            })()}
                          </div>
                          <span style={{
                            fontSize: '0.714rem', fontWeight: 700, minWidth: 40, textAlign: 'right',
                            color: isScheduled && !isPaid ? 'var(--text-tertiary)' : (isPaid ? 'var(--success)' : 'var(--error)')
                          }}>
                            {isCancelled ? pAmountOf(s) : getRate(s.id)}€
                          </span>
                        </div>
                        </React.Fragment>
                      )
                    })
                    })()}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Mes notes du dossier */}
      {showNotesModal && (
        <NotesModal
          coupleName={getCoupleName(couple)}
          noteCategories={noteCategories}
          setNoteCategories={setNoteCategories}
          globalNote={globalNote}
          setGlobalNote={setGlobalNote}
          onClose={() => setShowNotesModal(false)}
        />
      )}

      {/* Session Detail Modal */}
      {expandedSessionId && (() => {
        const session = allSessions.filter(s => s.coupleId === id).find(s => s.id === expandedSessionId)
        if (!session) return null
        const sessionNum = sessionNumbers[session.id]
        return (
          <SessionDetailModal
            session={session}
            couple={couple}
            sessions={allSessions.filter(s => s.coupleId === id)}
            sessionNum={sessionNum}
            sessionModal={sessionModalState}
            sessionActions={sessionModalActions}
            therapy={{ phasesData: therapyPhasesData, defaultPhaseKey, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, sessionNumbers }}
            utils={{ updateSession, formatDate, getCoupleName }}
          />
        )
      })()}

      {/* Edit Identity Panel */}
      {showEditModal && (
        <EditIdentityModal
          couple={couple}
          editState={editIdentityState}
          editActions={editIdentityActions}
          therapy={{ phasesData: therapyPhasesData, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, phase, setPhase, status }}
          data={{ clients, professionals, recruitmentSources }}
          utils={{ updateClient, updatePro, createPro, navigate, getCoupleName, getClientType, getCoupleInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert, formatDate, getPhaseLabel }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          couple={couple}
          coupleName={getCoupleName(couple)}
          onConfirm={async () => {
            const now = new Date().toISOString()
            couple.deleted = true
            couple.deletedAt = now
            if (updateClient) {
              await updateClient(couple.id, { deleted: true, deletedAt: now })
            }
            setShowDeleteConfirm(false)
            setShowEditModal(false)
            navigate(couple.phase === 'prospect' ? '/couples?tab=prospects' : '/couples')
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

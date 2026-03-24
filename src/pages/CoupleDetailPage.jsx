import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, PenTool, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Calendar, Mic, MicOff, Loader, CreditCard, Landmark, Banknote, Phone, Mail, MessageSquare, Plus, Share2, Edit3, Sparkles, RefreshCw, Globe, Hourglass, Euro, X, Trash2, BookOpen, ChevronRight, Heart, AlertCircle, Crosshair, Check, HelpCircle, Link2, Users, User, Star, Baby, Briefcase, Sprout } from 'lucide-react'
// mockProfessionals removed — now from DataContext
import { useData } from '../context/DataContext'
import { findDuplicateClients, findDuplicatePros } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'



const sampleTranscriptions = [
  "Le couple a abordé les difficultés de communication récurrentes. Travail sur l'écoute active et la reformulation. Progrès notables dans l'expression des émotions.",
  "Séance centrée sur la gestion des conflits. Exercices pratiques de médiation. Le couple montre une meilleure capacité à désamorcer les tensions.",
  "Discussion approfondie sur les attentes mutuelles. Identification des besoins non exprimés. Mise en place d'un rituel de communication hebdomadaire.",
  "Bilan de mi-parcours positif. Les exercices à domicile sont réalisés régulièrement. La dynamique relationnelle s'améliore sensiblement.",
  "Travail sur la confiance et l'attachement. Exploration des schémas relationnels hérités. Le couple prend conscience des patterns répétitifs."
]

export default function CoupleDetailPage({ coupleIdProp, onClose } = {}) {
  const params = useParams()
  const id = coupleIdProp || params.id
  const navigate = useNavigate()
  const { clients: mockCouples, sessions: mockSessions, reports: mockReports, recruitmentSources, sessionRates, therapyPhases: therapyPhasesData, phaseIcons, phaseColors, defaultPhaseKey, getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel, getClientType, formatDate, formatTime, updateSession, updateClient, professionals: mockProfessionals, createProfessional: createPro, updateProfessional: updatePro } = useData()
  const couple = mockCouples.find(c => c.id === id)
  // Sanitize: remove self-referencing clientLinks
  if (couple?.clientLinks) {
    couple.clientLinks = couple.clientLinks.filter(l => l.clientId !== couple.id)
  }
  const [status, setStatus] = useState(couple?.status || 'active')
  const [phase, setPhase] = useState(couple?.phase || 'prospect')
  const [totalSessions, setTotalSessions] = useState(couple?.totalSessions || 20)
  const [editingTotal, setEditingTotal] = useState(false)
  const [tempTotal, setTempTotal] = useState(totalSessions)
  const [recordingSessionId, setRecordingSessionId] = useState(null)
  const [recordingStep, setRecordingStep] = useState('idle')
  const [sessionUpdates, setSessionUpdates] = useState({})
  const [expandedSessionId, setExpandedSessionId] = useState(null)
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
  const [rateOverrides, setRateOverrides] = useState({}) // per-session rate overrides
  const [editingSessionRate, setEditingSessionRate] = useState(null)
  const [tempSessionRate, setTempSessionRate] = useState('')
  const [originalRate] = useState(activeCycle.rate) // rate at initialization, for past sessions
  const todayStr = new Date().toISOString().split('T')[0]
  const getRate = (sessionId) => {
    if (rateOverrides[sessionId] !== undefined) return rateOverrides[sessionId]
    // For past sessions, use the original rate; for future sessions, use the current sessionRate
    const s = sessions.find(s => s.id === sessionId)
    if (s && s.date && s.date.split('T')[0] < todayStr) return originalRate
    return sessionRate
  }
  const [editingCoveredSessions, setEditingCoveredSessions] = useState(false)
  const [phaseDropdownOpen, setPhaseDropdownOpen] = useState(false)
  const [editingInvoiceSessions, setEditingInvoiceSessions] = useState(false)
  const [sessionFrequency, setSessionFrequency] = useState(couple?.sessionFrequency || 2)
  const [editingFrequency, setEditingFrequency] = useState(false)
  const [tempFrequency, setTempFrequency] = useState(2)
  const frequencyInputRef = useRef(null)
  // Edit identity modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editPartnerA, setEditPartnerA] = useState({ ...(couple?.partnerA || {}) })
  const [editPartnerB, setEditPartnerB] = useState({ ...(couple?.partnerB || {}) })
  const [editChildren, setEditChildren] = useState(couple?.children || [])
  const [editType, setEditType] = useState(couple ? getClientType(couple) : 'individual')
  const [editReferents, setEditReferents] = useState(['A'])
  const [editSource, setEditSource] = useState(couple?.source || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)
  const [addLinkType, setAddLinkType] = useState('dossier')
  const [addLinkSearch, setAddLinkSearch] = useState('')
  const [modalShowAddLink, setModalShowAddLink] = useState(false)
  const [modalAddLinkSearch, setModalAddLinkSearch] = useState('')
  const [modalReferrerSearch, setModalReferrerSearch] = useState('')
  const [modalSelectedReferrer, setModalSelectedReferrer] = useState(null)
  const [modalShowReferrerDropdown, setModalShowReferrerDropdown] = useState(false)
  const [modalExternalReferrer, setModalExternalReferrer] = useState(couple?.externalReferrer || null)

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

  const sessions = mockSessions.filter(s => s.coupleId === id).sort((a, b) => b.date.localeCompare(a.date))
  const reports = mockReports.filter(r => r.coupleId === id)
  const PhaseIcon = phaseIcons[phase] || Sprout

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

  const handleStartRecording = (sessionId) => {
    setRecordingSessionId(sessionId)
    setRecordingStep('recording')
    setTimeout(() => {
      setRecordingStep('processing')
      setTimeout(() => {
        const transcription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
        const existing = sessionUpdates[sessionId]?.summary || sessions.find(s => s.id === sessionId)?.summary || ''
        const newSummary = existing ? `${existing}\n\n${transcription}` : transcription
        const session = sessions.find(s => s.id === sessionId)
        if (session) { session.hasReport = true; session.summary = newSummary.slice(0, 50) }
        setSessionUpdates(prev => ({ ...prev, [sessionId]: { hasReport: true, summary: newSummary } }))
        updateSession(sessionId, { hasReport: true, summary: newSummary.slice(0, 50) })
        setRecordingStep('done')
        setTimeout(() => { setRecordingSessionId(null); setRecordingStep('idle') }, 1500)
      }, 2000)
    }, 3000)
  }

  const handleSaveCR = (sessionId, text) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) { session.hasReport = !!text.trim(); session.summary = text.slice(0, 50) }
    setSessionUpdates(prev => ({ ...prev, [sessionId]: { hasReport: !!text.trim(), summary: text } }))
    updateSession(sessionId, { hasReport: !!text.trim(), summary: text.slice(0, 50) })
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
    const linkedName = isPro ? link.proName : (() => { const c = mockCouples.find(c => c.id === link.clientId); return c ? getCoupleName(c) : link.clientId })() 
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
        <div className="couple-avatar" onClick={() => { setEditPartnerA({ ...couple.partnerA }); setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {}); setEditChildren(couple.children || []); setEditType(getClientType(couple)); setShowEditModal(true) }} style={{ background: status === 'inactive' ? 'var(--primary-200)' : couple.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', color: status === 'inactive' ? 'var(--text-tertiary)' : couple.phase === 'prospect' ? '#6B46C1' : 'white', cursor: 'pointer' }} title="Modifier l'identité">{getCoupleInitials(couple)}</div>
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
              // For parrainage-pro, the linked entity is a professional (not in mockCouples)
              const isPro = link.type === 'parrainage-pro'
              const linked = isPro ? null : mockCouples.find(c => c.id === link.clientId)
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
                    {mockCouples
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
            const currentPhaseIcon = phaseIcons[phase] || Sprout
            const CurrentPhaseIcon = currentPhaseIcon
            // Derive display phase from nearest future session (or most recent past)
            const nowTs = new Date().toISOString()
            const activeSess = sessions.filter(s => s.status !== 'cancelled' && getSessionCycle(s)?.id === activeCycle.id)
            const futureFirst = activeSess.filter(s => s.date > nowTs).sort((a, b) => a.date.localeCompare(b.date))[0]
            const pastFirst = activeSess.filter(s => s.date <= nowTs).sort((a, b) => b.date.localeCompare(a.date))[0]
            const displayPhase = futureFirst?.phase || pastFirst?.phase || phase
            const DisplayIcon = phaseIcons[displayPhase] || Sprout
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
                          const PhIcon = phaseIcons[p] || Sprout
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
              <span style={{ fontSize: '0.714rem', color: '#92400E', fontWeight: 600 }}>
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
                onClick={() => {
                  const now = new Date()
                  now.setDate(now.getDate() + 7)
                  const newId = `s_new_${Date.now()}`
                  // Inherit phase from most recent session, default to first therapy phase if none
                  const recentSessions = sessions.filter(s => s.coupleId === id && s.status !== 'cancelled').sort((a, b) => b.date.localeCompare(a.date))
                  const inheritedPhase = recentSessions[0]?.phase || couple?.phase || (therapyPhasesData[0]?.key || 'debut')
                  const newSession = {
                    id: newId, coupleId: id,
                    date: now.toISOString().slice(0, 16),
                    duration: 60, phase: inheritedPhase,
                    status: 'scheduled', audioFile: null, hasReport: false,
                    title: '', paymentMethod: null
                  }
                  mockSessions.unshift(newSession)
                  setExpandedSessionId(newId)
                  setSessionUpdates(prev => ({ ...prev, [newId]: { _new: true } }))
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
                        border: contactType === t ? `2px solid ${cc.color}` : '2px solid transparent',
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
                              border: contactType === t ? `2px solid ${ctc.color}` : '2px solid transparent',
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
              const SessionPhaseIcon = phaseIcons[session.phase] || Sprout
              const pc = phaseColors[session.phase] || phaseColors.debut
              const sessionNum = sessionNumbers[session.id]
              const update = sessionUpdates[session.id]
              const hasReport = session.hasReport || update?.hasReport
              const summary = update?.summary || session.summary
              const isRecording = recordingSessionId === session.id
              const isPast = new Date(session.date) <= new Date()
              return (
                <div key={session.id}>
                  <div
                    onClick={() => setExpandedSessionId(session.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                      padding: 'var(--space-sm)',
                      background: expandedSessionId === session.id ? 'rgba(218, 165, 32, 0.12)'
                        : session.status === 'cancelled' ? 'var(--error-bg)'
                        : new Date(session.date) <= new Date() ? 'var(--primary-50)' : 'white',
                      border: expandedSessionId === session.id ? '1px solid var(--accent-main)'
                        : session.status === 'cancelled' ? 'none'
                        : new Date(session.date) <= new Date() ? 'none' : '1px dashed var(--border-light)',
                      borderLeft: expandedSessionId === session.id ? '3px solid var(--accent-main)' : undefined,
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 2,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: expandedSessionId === session.id ? '0 1px 4px rgba(196, 167, 103, 0.25)' : undefined,
                      opacity: therapyCycles.length > 1 && getSessionCycle(session)?.id !== activeCycle.id ? 0.5 : 1
                    }}
                  >
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-full)',
                        background: pc.bg, color: pc.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <SessionPhaseIcon size={18} />
                      </div>

                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.786rem', fontWeight: 600, color: session.status === 'cancelled' ? 'var(--error)' : undefined }}>
                        {formatDate(session.date)} · {formatTime(session.date)}
                      </div>
                      <div style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {(() => {
                          const effectivePhase = session.phase || couple?.phase || defaultPhaseKey
                          if (effectivePhase === 'prospect') return null
                          const ppc = phaseColors[effectivePhase]
                          const isPlanned = session.status === 'scheduled'
                          if (isPlanned) {
                            return (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {sessionNum && <span style={{
                                  minWidth: 18, height: 18, borderRadius: '50%',
                                  background: ppc?.bg || '#EBF8FF', color: ppc?.color || '#2B6CB0',
                                  fontSize: '0.643rem', fontWeight: 800,
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                  lineHeight: 1, padding: '0 3px'
                                }}>{sessionNum}</span>}
                                <span style={{ fontSize: '0.571rem', fontWeight: 600, color: ppc?.color || '#2B6CB0' }}>
                                  {getPhaseLabel(effectivePhase)}
                                </span>
                              </span>
                            )
                          }
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: '0.571rem', fontWeight: 600,
                              padding: '1px 5px', borderRadius: 'var(--radius-sm)',
                              background: ppc?.bg || '#EBF8FF',
                              color: ppc?.color || '#2B6CB0'
                            }}>
                              {sessionNum && <span style={{
                                minWidth: 14, height: 14, borderRadius: '50%',
                                background: ppc?.color || '#2B6CB0', color: 'white',
                                fontSize: '0.5rem', fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                lineHeight: 1
                              }}>{sessionNum}</span>}
                              {getPhaseLabel(effectivePhase)}
                            </span>
                          )
                        })()}
                        {session.status === 'scheduled' && !isPast && <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 2 }}><Clock size={10} /> Planifiée</span>}
                        {session.status === 'cancelled' && <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 2 }}><XCircle size={10} /> Annulée</span>}
                        {session.paymentMethod && (() => {
                          const pmBase = {
                            cheque: { label: 'Chèque', dot: 'var(--error)' },
                            virement: { label: 'Virement', dot: 'var(--error)' },
                            especes: { label: 'Espèces', dot: 'var(--success)' }
                          }[session.paymentMethod]
                          if (!pmBase) return null
                          const isReceived = session.paymentReceived
                          const displayColor = isReceived ? 'var(--success)' : 'var(--error)'
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: '0.643rem', fontWeight: 500, letterSpacing: '0.02em',
                              color: displayColor, opacity: 0.85
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: displayColor, flexShrink: 0 }} />
                              {!isReceived && session.paymentDate && (
                                <span style={{ fontStyle: 'italic', opacity: 0.9 }}>{formatDate(session.paymentDate)}</span>
                              )}
                              {pmBase.label}
                              {isReceived && <CheckCircle size={9} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                            </span>
                          )
                        })()}
                        {session.status === 'completed' && !session.paymentMethod && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            fontSize: '0.643rem', fontWeight: 600,
                            color: '#92400E',
                            letterSpacing: '0.02em'
                          }} title="Mode de paiement non renseigné">
                            <HelpCircle size={9} /> CONFIRMER
                          </span>
                        )}
                        {(() => {
                          const hasSelfInv = session.needsInvoice
                          const covBy = sessions.find(other => other.needsInvoice && other.id !== session.id && (other.invoiceCoveredSessionIds || []).includes(session.id))
                          const needsF = hasSelfInv || !!covBy
                          const fSent = hasSelfInv ? session.invoiceSent : covBy?.invoiceSent
                          return needsF ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: '0.643rem', fontWeight: 600,
                              color: fSent ? 'var(--success)' : '#1A365D',
                              letterSpacing: '0.02em'
                            }} title={fSent ? 'Facture envoyée' : 'Facture à envoyer'}>
                              FACTURE {fSent && <CheckCircle size={9} />}
                            </span>
                          ) : null
                        })()}
                      </div>
                      {/* Payment confirmation alert — inside the card */}
                      {session.status === 'completed' && !session.paymentMethod && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <AlertTriangle size={10} style={{ color: '#D97706', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.643rem', color: '#92400E', fontWeight: 600 }}>
                            Paiement à confirmer
                          </span>
                          <span style={{ fontSize: '0.643rem', color: '#92400E', fontWeight: 400 }}>
                            — Veuillez renseigner le mode de paiement.
                          </span>
                        </div>
                      )}

                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasReport ? (
                        <>
                          {summary && expandedSessionId !== session.id && (
                            <span style={{ fontSize: '0.643rem', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {summary.length > 30 ? summary.slice(0, 30) + '…' : summary}
                            </span>
                          )}
                          <FileText size={18} style={{ color: '#2B6CB0' }} title="Compte-rendu disponible" />
                        </>
                      ) : session.status === 'cancelled' ? (
                        <XCircle size={18} style={{ color: 'var(--error)' }} />
                      ) : isPast && session.status === 'completed' ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          background: '#FFF3E0', color: '#E67E22',
                          borderRadius: 12, padding: '3px 8px',
                          fontSize: '0.643rem', fontWeight: 600,
                          border: '1px solid #E67E2240'
                        }}>
                          <Mic size={11} /> Rédiger CR
                        </span>
                      ) : (
                        isPast && session.status === 'scheduled' ? (
                          <AlertTriangle size={18} style={{ color: '#C05621' }} />
                        ) : (
                          <Clock size={18} style={{ color: 'var(--text-tertiary)' }} />
                        )
                      )}
                    </div>
                  </div>

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
                onClick={() => {
                  if (!confirm('Démarrer une nouvelle thérapie ? Les séances actuelles seront archivées.')) return
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
                      <span style={{ fontSize: '0.714rem', color: '#92400E', fontWeight: 600 }}>
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
                                const spc = phaseColors[s.phase] || phaseColors.debut
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
                            {isScheduled && !isPaid ? null : noPayment ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.571rem', fontWeight: 700, color: '#92400E', letterSpacing: '0.02em' }}>
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

      {/* Mes notes du dossier — rich modal */}
      {showNotesModal && (
        <>
          <div onClick={() => setShowNotesModal(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 999, animation: 'fadeIn 0.2s'
          }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '50%', minWidth: 420, maxWidth: 640,
            background: 'white', zIndex: 1000,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.25s ease-out'
          }}>
            {/* Header */}
            <div style={{
              padding: 'var(--space-md) var(--space-lg)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={18} style={{ color: 'var(--primary-500)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mes notes du dossier</div>
                  <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>{getCoupleName(couple)}</span>
                </div>
              </div>
              <button onClick={() => setShowNotesModal(false)} style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: 'var(--bg-main)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>

              {/* Structured categories */}
              {[
                { key: 'dynamique', icon: Heart, color: '#E53E3E', bg: '#FFF5F5', label: 'Dynamique relationnelle', placeholder: 'Qualité de la communication, patterns d\'attachement, dynamique de pouvoir…' },
                { key: 'axes', icon: Crosshair, color: '#2B6CB0', bg: '#EBF8FF', label: 'Axes de travail', placeholder: 'Thèmes récurrents, compétences à développer, exercices en cours…' },
                { key: 'vigilance', icon: AlertCircle, color: '#DD6B20', bg: '#FFFAF0', label: 'Points de vigilance', placeholder: 'Risques identifiés, fragilités, contre-transfert, signaux d\'alerte…' },
                { key: 'objectifs', icon: Target, color: '#38A169', bg: '#F0FFF4', label: 'Objectifs thérapeutiques', placeholder: 'Objectifs à court/moyen terme, critères de réussite…' }
              ].map(cat => {
                const CatIcon = cat.icon
                const hasContent = noteCategories[cat.key]?.trim()
                return (
                  <div key={cat.key} style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CatIcon size={13} style={{ color: cat.color }} />
                      </div>
                      <span style={{ fontSize: '0.786rem', fontWeight: 600, color: cat.color }}>{cat.label}</span>
                      {hasContent && <CheckCircle size={12} style={{ color: 'var(--success)', marginLeft: 'auto' }} />}
                    </div>
                    <textarea
                      value={noteCategories[cat.key]}
                      onChange={e => setNoteCategories(prev => ({ ...prev, [cat.key]: e.target.value }))}
                      onKeyDown={e => e.stopPropagation()}
                      placeholder={cat.placeholder}
                      rows={3}
                      style={{
                        width: '100%', fontSize: '0.786rem', lineHeight: 1.6,
                        border: `1px solid ${hasContent ? cat.color + '30' : 'var(--border-light)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm)', resize: 'vertical',
                        background: hasContent ? cat.bg + '80' : 'var(--bg-main)',
                        fontFamily: 'inherit', color: 'var(--text-primary)',
                        transition: 'border-color 0.2s, background 0.2s'
                      }}
                    />
                  </div>
                )
              })}

              {/* Separator */}
              <div style={{ borderTop: '1px solid var(--border-light)', margin: 'var(--space-md) 0', paddingTop: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notes libres</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                    <button
                      onClick={() => {
                        if (!globalNote.trim()) return
                        const btn = document.getElementById('modal-note-ai-btn')
                        if (btn) { btn.textContent = '✨ Amélioration…'; btn.disabled = true }
                        setTimeout(() => {
                          setGlobalNote(prev => prev.trim() + '\n\n[✨ Texte amélioré par l\'IA]')
                          if (btn) { btn.textContent = '✨ Améliorer'; btn.disabled = false }
                        }, 2000)
                      }}
                      id="modal-note-ai-btn"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none', color: 'white', borderRadius: 20,
                        padding: '4px 12px', fontSize: '0.643rem', fontWeight: 600,
                        cursor: globalNote.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: 4,
                        opacity: globalNote.trim() ? 1 : 0.5,
                        boxShadow: '0 2px 6px rgba(118,75,162,0.2)',
                        transition: 'transform 0.15s'
                      }}
                    >
                      <Sparkles size={11} /> Améliorer
                    </button>
                    <button
                      onClick={() => {
                        const isRec = document.getElementById('modal-note-mic')?.dataset.recording === 'true'
                        const btn = document.getElementById('modal-note-mic')
                        if (isRec) {
                          btn.dataset.recording = 'false'
                          btn.style.background = 'var(--bg-main)'
                          btn.style.color = 'var(--text-secondary)'
                          setTimeout(() => {
                            setGlobalNote(prev => (prev ? prev + ' ' : '') + 'Notes dictées par le thérapeute.')
                          }, 500)
                        } else {
                          btn.dataset.recording = 'true'
                          btn.style.background = 'var(--error)'
                          btn.style.color = 'white'
                        }
                      }}
                      id="modal-note-mic"
                      data-recording="false"
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-main)', color: 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                      title="Dicter une note"
                    >
                      <Mic size={14} />
                    </button>
                  </div>
                </div>
                <textarea
                  value={globalNote}
                  onChange={e => setGlobalNote(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder="Rédigez vos notes libres pour ce dossier…"
                  rows={6}
                  style={{
                    width: '100%', fontSize: '0.786rem', lineHeight: 1.7,
                    border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-sm)', resize: 'vertical',
                    background: 'var(--bg-main)', fontFamily: 'inherit',
                    color: 'var(--text-primary)'
                  }}
                />
                <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mic size={10} /> Vous pouvez dicter ou améliorer vos notes avec l'IA
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Session Detail Modal */}
      {expandedSessionId && (() => {
        const session = sessions.find(s => s.id === expandedSessionId)
        if (!session) return null
        const sessionNum = sessionNumbers[session.id]
        const update = sessionUpdates[session.id]
        const hasReport = session.hasReport || update?.hasReport
        const summary = update?.summary || session.summary
        const isRecording = recordingSessionId === session.id
        const rate = getRate(session.id)
        const isPast = new Date(session.date) <= new Date()
        const pc = phaseColors[session.phase] || phaseColors.debut
        const SessionPhaseIcon = phaseIcons[session.phase] || Sprout
        return (
          <>
            {/* Overlay */}
            <div onClick={() => setExpandedSessionId(null)} style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              zIndex: 999, animation: 'fadeIn 0.2s'
            }} />
            {/* Panel */}
            <div style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '50%', minWidth: 420, maxWidth: 640,
              background: 'white', zIndex: 1000,
              boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideIn 0.25s ease-out'
            }}>
              {/* Header */}
              <div style={{
                padding: 'var(--space-md) var(--space-lg)',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: pc.bg, display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <SessionPhaseIcon size={18} style={{ color: pc.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.857rem', fontWeight: 700, color: session.status === 'cancelled' ? 'var(--error)' : 'var(--text-primary)', marginBottom: 2 }}>{getCoupleName(couple)}</div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: session.status === 'cancelled' ? 'var(--error)' : undefined }}>Séance {sessionNum}</h3>
                    {session.theme && <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>{session.theme}</span>}
                  </div>
                </div>
                <button onClick={() => setExpandedSessionId(null)} style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: 'var(--bg-main)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <X size={18} style={{ color: 'var(--text-secondary)' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>

                {/* Phase selectors */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
                  {/* Session phase */}
                  {/* Phase stepper - onboarding wizard style */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>Phase de la thérapie</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0 }}>
                      {therapyPhasesData.map((tp, i) => {
                        const currentPhaseIdx = therapyPhasesData.findIndex(t => t.key === (session.phase || defaultPhaseKey))
                        const isActive = tp.key === (session.phase || defaultPhaseKey)
                        const isCompleted = i < currentPhaseIdx
                        const Icon = phaseIcons[tp.key] || Sprout
                        const pc = phaseColors[tp.key] || phaseColors.debut
                        return (
                          <div key={tp.key} style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                              onClick={() => {
                                session.phase = tp.key
                                updateSession(session.id, { phase: tp.key })
                                setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _phase: Date.now() } }))
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 8px',
                                borderBottom: isActive ? `2px solid ${pc.color}` : '2px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s',
                                borderRadius: '4px 4px 0 0'
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--primary-50)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: 'var(--radius-sm)',
                                background: isCompleted ? pc.color : isActive ? pc.bg : 'var(--primary-50)',
                                color: isCompleted ? 'white' : isActive ? pc.color : 'var(--text-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}>
                                {isCompleted ? <Check size={10} strokeWidth={3} /> : <Icon size={10} />}
                              </div>
                              <span style={{
                                fontSize: '0.643rem', fontWeight: 600,
                                color: isActive ? pc.color : isCompleted ? pc.color : 'var(--text-tertiary)',
                                transition: 'color 0.2s', whiteSpace: 'nowrap'
                              }}>{tp.label}</span>
                            </div>
                            {i < therapyPhasesData.length - 1 && (
                              <div style={{
                                width: 12, height: 1,
                                background: isCompleted ? pc.color : 'var(--border-light)',
                                transition: 'background 0.3s'
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>

                {/* Date + Cancel */}
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 4 }}>Date et heure</label>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                    <input
                      type="datetime-local"
                      className="input"
                      value={session.date.slice(0, 16)}
                      onChange={e => {
                        session.date = e.target.value
                        updateSession(session.id, { date: e.target.value })
                        setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _date: Date.now() } }))
                      }}
                      style={{ fontSize: '0.786rem', flex: '2 1 0' }}
                    />
                    {session.status === 'cancelled' ? (
                      <div
                        onClick={() => {
                          session.status = 'scheduled'
                          session.cancellationReason = ''
                          updateSession(session.id, { status: 'scheduled', cancellationReason: '' })
                          setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _status: Date.now() } }))
                        }}
                        style={{
                          flex: '1 1 0', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                          padding: '6px 10px', background: '#F0FFF4',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #C6F6D5', cursor: 'pointer', transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#C6F6D5'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F0FFF4'}
                      >
                        <RefreshCw size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.714rem', color: '#276749', fontWeight: 600 }}>Rétablir</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          if (!confirm('Annuler cette séance ?')) return
                          session.status = 'cancelled'
                          updateSession(session.id, { status: 'cancelled' })
                          setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _status: Date.now() } }))
                        }}
                        style={{
                          flex: '1 1 0', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                          padding: '6px 10px', background: '#FFF5F5',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid #FED7D7', cursor: 'pointer', transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FED7D7'}
                        onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
                      >
                        <XCircle size={13} style={{ color: 'var(--error)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.714rem', color: '#9B2C2C', fontWeight: 600 }}>Annuler la séance</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancellation reason */}
                {session.status === 'cancelled' && (
                  <div style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    background: 'var(--error-bg)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-md)',
                    border: '1px solid #FED7D7'
                  }}>
                    <label style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <XCircle size={12} /> Raison de l'annulation
                    </label>
                    <textarea
                      value={session.cancellationReason || ''}
                      onChange={e => {
                        session.cancellationReason = e.target.value
                        updateSession(session.id, { cancellationReason: e.target.value })
                        setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _reason: Date.now() } }))
                      }}
                      placeholder="Indiquez la raison de l'annulation…"
                      rows={2}
                      style={{
                        width: '100%', fontSize: '0.714rem', lineHeight: 1.5,
                        border: '1px solid #FEB2B2', borderRadius: 'var(--radius-sm)',
                        padding: '6px 8px', resize: 'vertical',
                        background: 'white', fontFamily: 'inherit', color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                )}

                {/* Compte-rendu — hidden for cancelled sessions */}
                {session.status !== 'cancelled' && (
                  <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                      <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={14} /> {isPast ? 'Compte-rendu' : 'Note de préparation'}
                      </label>
                    </div>
                    <textarea
                      value={summary || ''}
                      onChange={e => handleSaveCR(session.id, e.target.value)}
                      onKeyDown={e => e.stopPropagation()}
                      onKeyUp={e => e.stopPropagation()}
                      onKeyPress={e => e.stopPropagation()}
                      placeholder={isPast ? 'Tapez votre compte-rendu ou dictez-le avec le micro…' : 'Notes de préparation pour cette séance…'}
                      rows={8}
                      style={{
                        width: '100%', fontSize: '0.857rem', lineHeight: 1.7,
                        border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-sm)', resize: 'vertical',
                        background: 'var(--bg-main)', fontFamily: 'inherit',
                        color: 'var(--text-primary)', outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary-300)'; e.target.style.boxShadow = '0 0 0 3px rgba(95,126,179,0.12)' }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.boxShadow = 'none' }}
                    />
                    {/* Dicter + AI improve */}
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {isRecording ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.714rem', color: recordingStep === 'recording' ? 'var(--error)' : recordingStep === 'processing' ? 'var(--primary-600)' : 'var(--success)', fontWeight: 600 }}>
                          {recordingStep === 'recording' && <><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--error)', animation: 'pulse 1s infinite', display: 'inline-block' }} /> Enregistrement…</>}
                          {recordingStep === 'processing' && <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Transcription…</>}
                          {recordingStep === 'done' && <><CheckCircle size={14} /> Ajouté !</>}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartRecording(session.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', borderRadius: 20,
                            background: 'var(--accent-main)', border: 'none',
                            color: 'white', fontSize: '0.714rem', fontWeight: 600,
                            cursor: 'pointer', transition: 'transform 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <Mic size={14} /> Dicter
                        </button>
                      )}
                      {summary && summary.trim() && (
                        <button
                          onClick={() => {
                            const btn = document.getElementById('ai-improve-btn')
                            if (btn) { btn.textContent = '✨ Amélioration en cours…'; btn.disabled = true }
                            setTimeout(() => {
                              const improved = summary
                                .replace(/\b(a)\b/g, 'a')
                                .replace(/\s+/g, ' ')
                                .trim()
                              handleSaveCR(session.id, improved + '\n\n[✨ Texte amélioré par l\'IA]')
                              if (btn) { btn.textContent = '✨ Améliorer avec l\'IA'; btn.disabled = false }
                            }, 2000)
                          }}
                          id="ai-improve-btn"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none', color: 'white', borderRadius: 20,
                            padding: '5px 14px', fontSize: '0.714rem', fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 2px 8px rgba(118,75,162,0.25)',
                            transition: 'transform 0.15s, box-shadow 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(118,75,162,0.35)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(118,75,162,0.25)' }}
                        >
                          <Sparkles size={13} /> Améliorer avec l'IA
                        </button>
                      )}
                    </div>

                    <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mic size={10} /> Vous pouvez dicter plusieurs fois pour compléter le texte
                    </div>
                  </div>
                )}

                {/* Données comptables */}
                <div style={{
                  padding: 'var(--space-md)',
                  background: '#F7F8FA',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-light)',
                  marginBottom: 'var(--space-lg)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
                    <Euro size={16} style={{ color: '#E67E22' }} />
                    <span style={{ fontSize: '0.786rem', fontWeight: 700, color: '#E67E22' }}>Données comptables</span>
                  </div>

                  {/* Montant de la séance (editable) */}
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Montant de la séance</label>
                    <div style={{ position: 'relative', width: 120 }}>
                      <input
                        type="number" min="0" step="5"
                        className="input"
                        value={rate || ''}
                        onChange={e => {
                          const raw = e.target.value
                          const v = raw === '' ? 0 : parseFloat(raw)
                          setRateOverrides(prev => ({ ...prev, [session.id]: v }))
                          // Sync paymentAmount if not explicitly set differently
                          if (session.paymentAmount === undefined || session.paymentAmount === rate) {
                            session.paymentAmount = v
                            updateSession(session.id, { paymentAmount: v })
                          }
                          setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _rate: Date.now() } }))
                        }}
                        style={{ fontSize: '0.857rem', fontWeight: 700, textAlign: 'center', color: '#E67E22', width: '100%', paddingRight: 24 }}
                      />
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.786rem', fontWeight: 600, color: '#E67E22', pointerEvents: 'none' }}>€</span>
                    </div>
                  </div>


                  {/* Paiement */}
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                      Mode de paiement
                    </label>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                      {[
                        { key: 'especes', label: 'Espèces', icon: Banknote },
                        { key: 'cheque', label: 'Chèque', icon: CreditCard },
                        { key: 'virement', label: 'Virement', icon: Landmark }
                      ].map(pm => {
                        const isActive = session.paymentMethod === pm.key
                        const PmIcon = pm.icon
                        return (
                          <button key={pm.key}
                            onClick={() => {
                              session.paymentMethod = isActive ? null : pm.key
                              updateSession(session.id, { paymentMethod: isActive ? null : pm.key })
                              setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _pay: Date.now() } }))
                            }}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              padding: '10px 14px', borderRadius: 'var(--radius-md)',
                              fontSize: '0.786rem', fontWeight: 600,
                              border: isActive ? '2px solid var(--primary-400)' : '1px solid var(--border-light)',
                              background: isActive ? 'var(--primary-50)' : 'white',
                              color: isActive ? 'var(--primary-700)' : 'var(--text-secondary)',
                              cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            <PmIcon size={16} /> {pm.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Warning: past session without payment method */}
                    {isPast && !session.paymentMethod && session.status !== 'cancelled' && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', background: '#FFFBEB',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)',
                        border: '1px solid #FEF3C7'
                      }}>
                        <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.714rem', color: '#92400E', fontWeight: 600 }}>
                          Paiement à confirmer — Veuillez renseigner le mode de paiement.
                        </span>
                      </div>
                    )}

                    {/* Montant du paiement (calculated, read-only) */}
                    {(() => {
                      const pAmount = session.paymentAmount ?? rate
                      return (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                          <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>Montant du paiement <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(calculé)</span></label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
                            <div style={{ flex: '0 0 calc(33.33% - 6px)', position: 'relative' }}>
                              <input
                                type="number"
                                className="input"
                                value={pAmount || ''}
                                readOnly
                                style={{ fontSize: '0.857rem', fontWeight: 700, textAlign: 'center', color: '#E67E22', width: '100%', paddingRight: 24, opacity: 0.7, cursor: 'default', background: 'white' }}
                              />
                              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.786rem', fontWeight: 600, color: '#E67E22', pointerEvents: 'none' }}>€</span>
                            </div>
                            <input
                              type="date"
                              className="input"
                              value={session.paymentDate || session.date.slice(0, 10)}
                              onChange={e => {
                                session.paymentDate = e.target.value
                                updateSession(session.id, { paymentDate: e.target.value })
                                setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _pd: Date.now() } }))
                              }}
                              style={{ fontSize: '0.714rem', flex: '0 0 calc(33.33% - 6px)' }}
                            />
                            {pAmount > 0 && (
                              <button
                                onClick={() => {
                                  const newStatus = !session.paymentReceived
                                  session.paymentReceived = newStatus
                                  // Propagate to all covered sessions
                                  const coveredIds = session.coveredSessionIds || [session.id]
                                  coveredIds.forEach(sid => {
                                    const coveredSession = sessions.find(s => s.id === sid)
                                    if (coveredSession && coveredSession.id !== session.id) {
                                      coveredSession.paymentReceived = newStatus
                                      if (newStatus) {
                                        coveredSession.paymentMethod = coveredSession.paymentMethod || session.paymentMethod
                                      }
                                    }
                                  })
                                  // Persist all changes
                                  updateSession(session.id, { paymentReceived: newStatus })
                                  coveredIds.forEach(sid => {
                                    if (sid !== session.id) {
                                      updateSession(sid, { paymentReceived: newStatus, ...(newStatus ? { paymentMethod: session.paymentMethod } : {}) })
                                    }
                                  })
                                  setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _pay: Date.now() } }))
                                }}
                                style={{
                                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                  padding: '8px', borderRadius: 'var(--radius-md)',
                                  fontSize: '0.786rem', fontWeight: 600,
                                  border: session.paymentReceived ? '1px solid #27674930' : '1px solid #FED7D7',
                                  background: session.paymentReceived ? '#F0FFF4' : '#FFF5F5',
                                  color: session.paymentReceived ? '#276749' : 'var(--error)',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {session.paymentReceived ? <CheckCircle size={14} /> : <Hourglass size={14} />}
                                {session.paymentReceived ? 'Encaissé' : 'Paiement en attente'}
                              </button>
                            )}
                          </div>
                          <div style={{ marginTop: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <label style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Séances concernées par ce paiement :</label>
                              {session.paymentReceived && !editingCoveredSessions && (
                                <button
                                  onClick={() => setEditingCoveredSessions(true)}
                                  style={{ fontSize: '0.643rem', color: 'var(--primary-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                                >
                                  Modifier
                                </button>
                              )}
                            </div>
                            {session.paymentReceived && !editingCoveredSessions ? (
                              /* Simple display mode */
                              <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                {(session.coveredSessionIds || [session.id]).map(sid => {
                                  const s = sessions.find(x => x.id === sid)
                                  if (!s) return null
                                  const sNum = sessionNumbers[s.id]
                                  return (
                                    <div key={sid} style={{ padding: '3px 6px', fontSize: '0.714rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                                      S{sNum} · {formatDate(s.date)} ({getRate(s.id)}€)
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              /* Interactive edit mode */
                              <>
                                <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                  {sessions.filter(s => {
                                    if (s.status !== 'completed' && s.status !== 'scheduled') return false
                                    const currentCovered = session.coveredSessionIds || [session.id]
                                    if (currentCovered.includes(s.id)) return true
                                    if (s.id === session.id) return true
                                    return !sessions.some(other => other.id !== session.id && other.paymentReceived && (other.coveredSessionIds || [other.id]).includes(s.id))
                                  }).sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                                    const sNum = sessionNumbers[s.id]
                                    const coveredSessions = session.coveredSessionIds || [session.id]
                                    const isChecked = coveredSessions.includes(s.id)
                                    const isCurrentSession = s.id === session.id
                                    return (
                                      <label key={s.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                                        borderRadius: 'var(--radius-sm)', cursor: isCurrentSession ? 'default' : 'pointer', fontSize: '0.714rem',
                                        color: isChecked ? 'var(--primary-700)' : 'var(--text-secondary)',
                                        background: isChecked ? 'var(--primary-50)' : 'transparent',
                                        transition: 'background 0.1s'
                                      }}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={isCurrentSession}
                                          onChange={() => {
                                            const current = session.coveredSessionIds || [session.id]
                                            const updated = isChecked
                                              ? current.filter(id => id !== s.id)
                                              : [...current, s.id]
                                            session.coveredSessionIds = updated
                                            session.paymentAmount = updated.reduce((sum, sid) => sum + getRate(sid), 0)
                                            // Sync paymentReceived on the toggled session
                                            if (isChecked) {
                                              // Unchecking: remove payment status from the removed session
                                              s.paymentReceived = false
                                              s.paymentMethod = null
                                            } else if (session.paymentReceived) {
                                              // Checking: propagate payment status to the added session
                                              s.paymentReceived = true
                                              s.paymentMethod = session.paymentMethod
                                            }
                                            setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _cs: Date.now() } }))
                                          }}
                                          style={{ accentColor: 'var(--primary-500)' }}
                                        />
                                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>S{sNum} · {formatDate(s.date)} ({getRate(s.id)}€)</span>
                                      </label>
                                    )
                                  })}
                                </div>
                                {editingCoveredSessions && (
                                  <button
                                    onClick={() => setEditingCoveredSessions(false)}
                                    style={{ marginTop: 4, fontSize: '0.643rem', color: 'var(--primary-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Terminé
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Facture */}
                    {(() => {
                      // Detect if this session is covered by another session's invoice
                      const parentInvoiceSession = sessions.find(other => other.needsInvoice && other.id !== session.id && (other.invoiceCoveredSessionIds || []).includes(session.id))
                      const isOwnInvoice = session.needsInvoice
                      const hasCoverage = isOwnInvoice || !!parentInvoiceSession
                      const invoiceIsSent = isOwnInvoice ? session.invoiceSent : parentInvoiceSession?.invoiceSent
                      return (
                    <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>{hasCoverage ? <>Montant facturé <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(calculé)</span></> : 'Facturation'}</label>
                        {hasCoverage && !invoiceIsSent && (
                          <button
                            onClick={() => {
                              if (isOwnInvoice) {
                                session.needsInvoice = false
                                session.invoiceSent = false
                                session.invoiceCoveredSessionIds = undefined
                                updateSession(session.id, { needsInvoice: false, invoiceSent: false, invoiceCoveredSessionIds: null })
                              } else if (parentInvoiceSession) {
                                // Remove this session from parent's coverage
                                const updated = (parentInvoiceSession.invoiceCoveredSessionIds || []).filter(id => id !== session.id)
                                if (updated.length === 0) {
                                  parentInvoiceSession.needsInvoice = false
                                  parentInvoiceSession.invoiceSent = false
                                  parentInvoiceSession.invoiceCoveredSessionIds = undefined
                                  updateSession(parentInvoiceSession.id, { needsInvoice: false, invoiceSent: false, invoiceCoveredSessionIds: null })
                                } else {
                                  parentInvoiceSession.invoiceCoveredSessionIds = updated
                                  parentInvoiceSession.paymentAmount = updated.reduce((sum, sid) => sum + getRate(sid), 0)
                                  updateSession(parentInvoiceSession.id, { invoiceCoveredSessionIds: updated, paymentAmount: parentInvoiceSession.paymentAmount })
                                }
                              }
                              setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                            }}
                            title="Annuler le besoin de facture"
                            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.643rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, transition: 'color 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--error)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                          >
                            <XCircle size={12} /> Annuler
                          </button>
                        )}
                        {invoiceIsSent && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.643rem', color: 'var(--success)', fontWeight: 600 }}>
                            <CheckCircle size={12} /> Facture émise
                          </span>
                        )}
                      </div>
                      {!hasCoverage ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                          <button
                            onClick={() => {
                              session.needsInvoice = true
                              updateSession(session.id, { needsInvoice: true })
                              setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                            }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              flex: 1,
                              padding: '8px 12px', borderRadius: 'var(--radius-md)',
                              fontSize: '0.714rem', fontWeight: 600,
                              border: '1px solid var(--border-light)',
                              background: 'white',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, flexShrink: 0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><text x="12" y="17" textAnchor="middle" fill="currentColor" stroke="none" fontSize="10" fontWeight="800">€</text></svg></span>
                            Besoin de facture ?
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ flex: '0 0 calc(33.33% - 6px)', position: 'relative' }}>
                              <input
                                type="number" min="0" step="5"
                                className="input"
                                value={(() => { const invSessions = session.invoiceCoveredSessionIds || [session.id]; return invSessions.reduce((sum, sid) => sum + getRate(sid), 0) })()}
                                readOnly
                                style={{ fontSize: '0.857rem', fontWeight: 700, textAlign: 'center', color: '#E67E22', width: '100%', paddingRight: 24 }}
                              />
                              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.786rem', fontWeight: 600, color: '#E67E22', pointerEvents: 'none' }}>€</span>
                            </div>
                            <input
                              type="date"
                              className="input"
                              value={session.invoiceDate || session.date.slice(0, 10)}
                              onChange={e => {
                                session.invoiceDate = e.target.value
                                updateSession(session.id, { invoiceDate: e.target.value })
                                setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _invd: Date.now() } }))
                              }}
                              style={{ fontSize: '0.714rem', flex: 1 }}
                            />
                            {hasCoverage && !invoiceIsSent && (
                              <button
                                onClick={() => {
                                  if (isOwnInvoice) {
                                    session.invoiceSent = true
                                    updateSession(session.id, { invoiceSent: true })
                                    const covered = session.invoiceCoveredSessionIds || [session.id]
                                    covered.forEach(sid => {
                                      const covS = sessions.find(x => x.id === sid)
                                      if (covS && covS.id !== session.id) { covS.invoiceSent = true; updateSession(sid, { invoiceSent: true }) }
                                    })
                                  } else if (parentInvoiceSession) {
                                    parentInvoiceSession.invoiceSent = true
                                    updateSession(parentInvoiceSession.id, { invoiceSent: true })
                                    const covered = parentInvoiceSession.invoiceCoveredSessionIds || [parentInvoiceSession.id]
                                    covered.forEach(sid => {
                                      const covS = sessions.find(x => x.id === sid)
                                      if (covS) { covS.invoiceSent = true; updateSession(sid, { invoiceSent: true }) }
                                    })
                                  }
                                  setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                                }}
                                style={{
                                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                  padding: '8px', borderRadius: 'var(--radius-md)',
                                  fontSize: '0.786rem', fontWeight: 600,
                                  border: '1px solid #FED7D7',
                                  background: '#FFF5F5',
                                  color: 'var(--error)',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                <Hourglass size={14} />
                                Émettre la facture
                              </button>
                            )}
                            {invoiceIsSent && (
                              <button
                                onClick={() => {
                                  // Toggle back: un-emit
                                  const owner = isOwnInvoice ? session : parentInvoiceSession
                                  if (owner) {
                                    owner.invoiceSent = false
                                    const covered = owner.invoiceCoveredSessionIds || [owner.id]
                                    covered.forEach(sid => {
                                      const covS = sessions.find(x => x.id === sid)
                                      if (covS) { covS.invoiceSent = false }
                                    })
                                  }
                                  setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                                }}
                                style={{
                                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                  padding: '8px', borderRadius: 'var(--radius-md)',
                                  fontSize: '0.786rem', fontWeight: 600,
                                  border: '1px solid #27674930',
                                  background: '#F0FFF4',
                                  color: '#276749',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                <CheckCircle size={14} />
                                Facture émise
                              </button>
                            )}
                          </div>
                          {(() => {
                            const invoiceSessions = session.invoiceCoveredSessionIds || [session.id]
                            return (
                              <div style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <label style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Séances concernées par cette facture :</label>
                                  {session.invoiceSent && !editingInvoiceSessions && (
                                    <button
                                      onClick={() => {
                                        // Reset invoiceSent when editing
                                        const owner = isOwnInvoice ? session : parentInvoiceSession
                                        if (owner) {
                                          owner.invoiceSent = false
                                          const covered = owner.invoiceCoveredSessionIds || [owner.id]
                                          covered.forEach(sid => {
                                            const covS = sessions.find(x => x.id === sid)
                                            if (covS) { covS.invoiceSent = false }
                                          })
                                        }
                                        setEditingInvoiceSessions(true)
                                        setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                                      }}
                                      style={{ fontSize: '0.643rem', color: 'var(--primary-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                                    >
                                      Modifier
                                    </button>
                                  )}
                                </div>
                                {session.invoiceSent && !editingInvoiceSessions ? (
                                  <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                    {invoiceSessions.map(sid => {
                                      const s = sessions.find(x => x.id === sid)
                                      if (!s) return null
                                      const sNum = sessionNumbers[s.id]
                                      return (
                                        <div key={sid} style={{ padding: '3px 6px', fontSize: '0.714rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                                          S{sNum} · {formatDate(s.date)} ({getRate(s.id)}€)
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ maxHeight: 100, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 4 }}>
                                      {sessions.filter(s => {
                                        if (s.status !== 'completed' && s.status !== 'scheduled') return false
                                        // Always show sessions already in this invoice
                                        if (invoiceSessions.includes(s.id)) return true
                                        // Future sessions: only allow if payment is received
                                        if (s.status === 'scheduled' && !s.paymentReceived) return false
                                        // Only exclude sessions whose invoice has been EMITTED (sent)
                                        if (s.needsInvoice && s.invoiceSent && s.id !== session.id) return false
                                        // Only exclude sessions covered by another EMITTED invoice
                                        if (sessions.some(other => other.id !== session.id && other.needsInvoice && other.invoiceSent && (other.invoiceCoveredSessionIds || []).includes(s.id))) return false
                                        // Don't show cancelled sessions
                                        if (s.status === 'cancelled') return false
                                        return true
                                      }).sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                                        const sNum = sessionNumbers[s.id]
                                        const isChecked = invoiceSessions.includes(s.id)
                                        return (
                                          <label key={s.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px',
                                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.714rem',
                                            color: isChecked ? 'var(--primary-700)' : 'var(--text-secondary)',
                                            background: isChecked ? 'var(--primary-50)' : 'transparent',
                                            transition: 'background 0.1s'
                                          }}>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const updated = isChecked
                                                  ? invoiceSessions.filter(id => id !== s.id)
                                                  : [...invoiceSessions, s.id]
                                                if (updated.length === 0) {
                                                  session.needsInvoice = false
                                                  session.invoiceSent = false
                                                  session.invoiceDate = undefined
                                                  session.invoiceCoveredSessionIds = undefined
                                                  updateSession(session.id, { needsInvoice: false, invoiceSent: false, invoiceDate: null, invoiceCoveredSessionIds: null })
                                                } else if (!updated.includes(session.id)) {
                                                  // Migrate invoice to the first session in the covered list
                                                  const targetSession = sessions.find(ts => ts.id === updated[0])
                                                  if (targetSession) {
                                                    targetSession.needsInvoice = true
                                                    targetSession.invoiceSent = session.invoiceSent
                                                    targetSession.invoiceDate = session.invoiceDate
                                                    targetSession.invoiceCoveredSessionIds = updated
                                                    updateSession(targetSession.id, { needsInvoice: true, invoiceSent: session.invoiceSent, invoiceDate: session.invoiceDate, invoiceCoveredSessionIds: updated })
                                                  }
                                                  // Clear from current session
                                                  session.needsInvoice = false
                                                  session.invoiceSent = false
                                                  session.invoiceDate = undefined
                                                  session.invoiceCoveredSessionIds = undefined
                                                  updateSession(session.id, { needsInvoice: false, invoiceSent: false, invoiceDate: null, invoiceCoveredSessionIds: null })
                                                } else {
                                                  session.invoiceCoveredSessionIds = updated
                                                  updateSession(session.id, { invoiceCoveredSessionIds: updated })
                                                }
                                                setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _inv: Date.now() } }))
                                              }}
                                              style={{ accentColor: 'var(--primary-500)' }}
                                            />
                                            <span style={{ fontWeight: isChecked ? 600 : 400 }}>S{sNum} · {formatDate(s.date)} ({getRate(s.id)}€)</span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                    {editingInvoiceSessions && (
                                      <button
                                        onClick={() => setEditingInvoiceSessions(false)}
                                        style={{ fontSize: '0.643rem', color: 'var(--primary-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 4, textDecoration: 'underline' }}
                                      >
                                        Terminé
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </>
                      )}
                    </div>
                      )
                    })()}
                  </div>
                </div>
              </div >
            </div>
          </>
        )
      })()}

      {/* Edit Identity Panel */}
      {showEditModal && (() => {
        const hasChanges = () => {
          const a = couple.partnerA, ea = editPartnerA
          if ((ea.firstName || '') !== (a.firstName || '') || (ea.lastName || '') !== (a.lastName || '') || (ea.email || '') !== (a.email || '') || (ea.phone || '') !== (a.phone || '')) return true
          if (couple.partnerB) {
            const b = couple.partnerB, eb = editPartnerB
            if ((eb.firstName || '') !== (b.firstName || '') || (eb.lastName || '') !== (b.lastName || '') || (eb.email || '') !== (b.email || '') || (eb.phone || '') !== (b.phone || '')) return true
          }
          if ((editSource || '') !== (couple.source || '')) return true
          if ((editPartnerA.billingAddress || '') !== (couple.partnerA?.billingAddress || '')) return true
          if (couple.partnerB && (editPartnerB.billingAddress || '') !== (couple.partnerB?.billingAddress || '')) return true
          return false
        }
        const handleClose = () => {
          if (hasChanges()) {
            if (!window.confirm('Des modifications non enregistrées seront perdues. Voulez-vous vraiment quitter ?')) return
          }
          // Reset all edit fields to original values
          setEditPartnerA({ ...couple.partnerA })
          setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {})
          setEditChildren(couple.children || [])
          setEditType(couple ? getClientType(couple) : 'individual')
          setEditSource(couple?.source || '')
          setShowEditModal(false); setShowDeleteConfirm(false)
        }
        return (
        <div className="modal-overlay" onClick={handleClose}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: '100%', maxWidth: 520,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.3s ease-out'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: '20px 28px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
              <div className="couple-avatar" style={{ width: 40, height: 40, fontSize: '0.857rem', background: status === 'inactive' ? 'var(--primary-200)' : couple.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', color: status === 'inactive' ? 'var(--text-tertiary)' : couple.phase === 'prospect' ? '#6B46C1' : 'white', flexShrink: 0 }}>{getCoupleInitials(couple)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{getCoupleName(couple)}</div>
                <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  {getClientType(couple) === 'individual' && <><User size={14} /> Individuel</>}
                  {getClientType(couple) === 'couple' && <><Users size={14} /> Couple</>}
                  {getClientType(couple) === 'family' && (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="9" r="2"/>
                        <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                        <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                      </svg>
                      Famille
                    </>
                  )}
                </div>
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Content — scrollable */}
            <div style={{ padding: '20px 28px', flex: 1, overflowY: 'auto' }}>
              {/* Phase stepper in modal */}
              {(() => {
                const currentPhaseIdx = therapyPhasesData.findIndex(t => t.key === phase)
                return (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>Phase de la thérapie</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 0 }}>
                      {therapyPhasesData.map((tp, i) => {
                        const isActive = tp.key === phase
                        const isCompleted = i < currentPhaseIdx
                        const Icon = phaseIcons[tp.key] || Sprout
                        const pc = phaseColors[tp.key] || phaseColors.debut
                        return (
                          <div key={tp.key} style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                              onClick={() => { setPhase(tp.key); couple.phase = tp.key; updateClient(couple.id, { phase: tp.key }) }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '4px 8px',
                                borderBottom: isActive ? `2px solid ${pc.color}` : '2px solid transparent',
                                cursor: 'pointer', transition: 'all 0.2s',
                                borderRadius: '4px 4px 0 0'
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--primary-50)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                            >
                              <div style={{
                                width: 18, height: 18, borderRadius: 'var(--radius-sm)',
                                background: isCompleted ? pc.color : isActive ? pc.bg : 'var(--primary-50)',
                                color: isCompleted ? 'white' : isActive ? pc.color : 'var(--text-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}>
                                {isCompleted ? <Check size={10} strokeWidth={3} /> : <Icon size={10} />}
                              </div>
                              <span style={{
                                fontSize: '0.643rem', fontWeight: 600,
                                color: isActive ? pc.color : isCompleted ? pc.color : 'var(--text-tertiary)',
                                transition: 'color 0.2s', whiteSpace: 'nowrap'
                              }}>{tp.label}</span>
                            </div>
                            {i < therapyPhasesData.length - 1 && (
                              <div style={{
                                width: 12, height: 1,
                                background: isCompleted ? pc.color : 'var(--border-light)',
                                transition: 'background 0.3s'
                              }} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
              {/* Section title */}
              <div style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>Modifier l'identité</div>
              {editType !== 'individual' && (
                <p style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={9} color="var(--text-tertiary)" /> Référent = interlocuteur principal pour la communication et le suivi financier
                </p>
              )}
              {/* Partner A */}
              <div style={{
                padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-50)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                  <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> {editType === 'individual' ? 'Client' : editType === 'couple' ? 'Partenaire A' : 'Parent 1'}
                  </h4>
                  {editType !== 'individual' && (() => {
                    const isRef = editReferents.includes('A')
                    return (
                      <button type="button" onClick={() => {
                        if (isRef) {
                          if (editReferents.length > 1) setEditReferents(editReferents.filter(r => r !== 'A'))
                        } else {
                          setEditReferents([...editReferents, 'A'])
                        }
                      }}
                        title="Référent principal (communication et suivi financier)"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: '0.643rem', fontWeight: 600,
                          padding: 0, background: 'none', border: 'none',
                          color: isRef ? '#D97706' : 'var(--text-tertiary)',
                          cursor: 'pointer', transition: 'color 0.2s'
                        }}
                      >
                        <Star size={12} fill={isRef ? '#F59E0B' : 'none'} color={isRef ? '#F59E0B' : 'var(--text-tertiary)'} /> Référent
                      </button>
                    )
                  })()}
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Prénom</label>
                    <input className="input" placeholder="Prénom" value={editPartnerA.firstName || ''} onChange={e => setEditPartnerA({ ...editPartnerA, firstName: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input className="input" placeholder="Nom" value={editPartnerA.lastName || ''} onChange={e => setEditPartnerA({ ...editPartnerA, lastName: e.target.value })}
                      style={!(editPartnerA.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Email</label>
                    <input className="input" type="email" placeholder="email@exemple.com" value={editPartnerA.email || ''} onChange={e => setEditPartnerA({ ...editPartnerA, email: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Téléphone</label>
                    <input className="input" type="tel" placeholder="06 12 34 56 78" value={editPartnerA.phone || ''} onChange={e => setEditPartnerA({ ...editPartnerA, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Date de naissance
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <input className="input" type="date" style={{ colorScheme: 'light' }} value={editPartnerA.birthDate || ''} onChange={e => setEditPartnerA({ ...editPartnerA, birthDate: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      ou Année
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <input className="input" type="number" min="1920" max={new Date().getFullYear()} placeholder={`ex. ${new Date().getFullYear() - 35}`}
                      value={editPartnerA.birthYear || ''} onChange={e => setEditPartnerA({ ...editPartnerA, birthYear: e.target.value })} />
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Adresse de facturation
                    <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                  </label>
                  <textarea className="input" rows={2} placeholder="Adresse complète pour la facturation…" value={editPartnerA.billingAddress || ''} onChange={e => setEditPartnerA({ ...editPartnerA, billingAddress: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
              </div>

              {/* Partner B (couple & family) */}
              {(editType === 'couple' || editType === 'family') && (
                <div style={{
                  padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-50)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                  <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> {editType === 'couple' ? 'Partenaire B' : 'Parent 2'}
                  </h4>
                  {(() => {
                    const isRef = editReferents.includes('B')
                    return (
                      <button type="button" onClick={() => {
                        if (isRef) {
                          if (editReferents.length > 1) setEditReferents(editReferents.filter(r => r !== 'B'))
                        } else {
                          setEditReferents([...editReferents, 'B'])
                        }
                      }}
                        title="Référent principal (communication et suivi financier)"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: '0.643rem', fontWeight: 600,
                          padding: 0, background: 'none', border: 'none',
                          color: isRef ? '#D97706' : 'var(--text-tertiary)',
                          cursor: 'pointer', transition: 'color 0.2s'
                        }}
                      >
                        <Star size={12} fill={isRef ? '#F59E0B' : 'none'} color={isRef ? '#F59E0B' : 'var(--text-tertiary)'} /> Référent
                      </button>
                    )
                  })()}
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Prénom</label>
                      <input className="input" placeholder="Prénom" value={editPartnerB.firstName || ''} onChange={e => setEditPartnerB({ ...editPartnerB, firstName: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input className="input" placeholder="Nom" value={editPartnerB.lastName || ''} onChange={e => setEditPartnerB({ ...editPartnerB, lastName: e.target.value })}
                        style={!(editPartnerB.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Email</label>
                      <input className="input" type="email" placeholder="email@exemple.com" value={editPartnerB.email || ''} onChange={e => setEditPartnerB({ ...editPartnerB, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label>Téléphone</label>
                      <input className="input" type="tel" placeholder="06 12 34 56 78" value={editPartnerB.phone || ''} onChange={e => setEditPartnerB({ ...editPartnerB, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Date de naissance
                        <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                      </label>
                      <input className="input" type="date" style={{ colorScheme: 'light' }} value={editPartnerB.birthDate || ''} onChange={e => setEditPartnerB({ ...editPartnerB, birthDate: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        ou Année
                        <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                      </label>
                      <input className="input" type="number" min="1920" max={new Date().getFullYear()} placeholder={`ex. ${new Date().getFullYear() - 35}`}
                        value={editPartnerB.birthYear || ''} onChange={e => setEditPartnerB({ ...editPartnerB, birthYear: e.target.value })} />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Adresse de facturation
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <textarea className="input" rows={2} placeholder="Adresse complète pour la facturation…" value={editPartnerB.billingAddress || ''} onChange={e => setEditPartnerB({ ...editPartnerB, billingAddress: e.target.value })} style={{ resize: 'vertical' }} />
                  </div>
                </div>
              )}

              {/* Children (family) */}
              {editType === 'family' && (
                <div style={{
                  padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  background: '#FFFBEB', border: '1px solid #FDE68A', marginBottom: 'var(--space-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                    <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Baby size={14} /> Enfants
                    </h4>
                    <button className="btn btn-ghost" style={{ fontSize: '0.714rem', padding: '3px 8px' }}
                      onClick={() => setEditChildren([...editChildren, { name: '', birthYear: '' }])}
                    >
                      <Plus size={13} /> Ajouter
                    </button>
                  </div>
                  {editChildren.length === 0 && (
                    <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-sm) 0' }}>
                      Cliquez "Ajouter" pour ajouter un enfant
                    </p>
                  )}
                  {editChildren.map((child, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                      <input className="input" placeholder="Prénom" style={{ flex: 2 }} value={child.name || child.firstName || ''}
                        onChange={e => { const c = [...editChildren]; c[idx] = { ...c[idx], name: e.target.value }; setEditChildren(c) }}
                      />
                      <input className="input" placeholder="Année" type="number" min="1990" max={new Date().getFullYear()}
                        style={{ flex: 1, maxWidth: 80 }} value={child.birthYear || ''}
                        onChange={e => { const c = [...editChildren]; c[idx] = { ...c[idx], birthYear: e.target.value }; setEditChildren(c) }}
                      />
                      {child.birthYear && !isNaN(child.birthYear) && (
                        <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 30 }}>
                          {new Date().getFullYear() - parseInt(child.birthYear)} ans
                        </span>
                      )}
                      <button onClick={() => setEditChildren(editChildren.filter((_, i) => i !== idx))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Source */}
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-sm)' }}>Source du prospect</div>
                {couple.referrerType === 'particulier' ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: '#F5F0FF', border: '1px solid #E8D8FE',
                    fontSize: '0.857rem', fontWeight: 600, color: '#8B5CF6'
                  }}>
                    <Award size={16} />
                    Parrain externe
                    <span style={{ fontSize: '0.643rem', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>source non modifiable</span>
                  </div>
                ) : (
                <div className="input-group" style={{ marginBottom: (editSource === 'referral' || editSource === 'parrainage') ? 'var(--space-xs)' : 0 }}>
                  <select className="input" style={{ cursor: 'pointer', ...(!(editSource || '').trim() ? { background: '#FFF5F5', borderColor: '#FECACA' } : {}) }} value={editSource} onChange={e => { setEditSource(e.target.value); setModalSelectedReferrer(null) }}>
                    <option value="">— Non renseignée —</option>
                    {recruitmentSources.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
                )}
                {(editSource === 'referral' || editSource === 'parrainage') && (
                  <div className="input-group">
                    <label>Orienté par <span style={{ color: 'var(--error)' }}>*</span></label>
                    {/* External referrer form */}
                    {modalExternalReferrer ? (
                      <div style={{
                        padding: '10px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)',
                        border: '1px solid #C4B5FD'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.714rem', fontWeight: 600, color: '#8B5CF6' }}>Personne externe (non client)</span>
                          <button onClick={() => {
                            setModalExternalReferrer(null)
                            couple.externalReferrer = null
                            // Also remove parrainage-pro links
                            if (couple.clientLinks) {
                              couple.clientLinks = couple.clientLinks.filter(l => l.type !== 'parrainage-pro')
                            }
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                            <X size={14} />
                          </button>
                        </div>
                        {/* Particulier / Professionnel toggle */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                          {[
                            { key: 'particulier', label: 'Particulier', Icon: User, color: '#3B82F6', bg: '#EFF6FF' },
                            { key: 'professionnel', label: 'Professionnel', Icon: Briefcase, color: '#8B5CF6', bg: '#F5F3FF' }
                          ].map(opt => {
                            const active = (modalExternalReferrer.referrerType || 'particulier') === opt.key
                            return (
                              <button key={opt.key} type="button"
                                onClick={() => setModalExternalReferrer({ ...modalExternalReferrer, referrerType: opt.key })}
                                style={{
                                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                  padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.714rem', fontWeight: 600, cursor: 'pointer',
                                  border: active ? `2px solid ${opt.color}` : '1px solid var(--border-light)',
                                  background: active ? opt.bg : 'white',
                                  color: active ? opt.color : 'var(--text-tertiary)',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <opt.Icon size={13} /> {opt.label}
                              </button>
                            )
                          })}
                        </div>
                        <div className="grid-2" style={{ marginBottom: 6 }}>
                          <input className="input" placeholder="Prénom" value={modalExternalReferrer.firstName || ''}
                            onChange={e => setModalExternalReferrer({ ...modalExternalReferrer, firstName: e.target.value })} style={{ fontSize: '0.786rem' }} />
                          <input className="input" placeholder="Nom *" value={modalExternalReferrer.lastName || ''}
                            onChange={e => setModalExternalReferrer({ ...modalExternalReferrer, lastName: e.target.value })}
                            style={{ fontSize: '0.786rem', ...( !(modalExternalReferrer.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}) }} />
                        </div>
                        {(() => {
                          const refType = modalExternalReferrer.referrerType || 'particulier'
                          const matches = refType === 'professionnel'
                            ? findDuplicatePros({ firstName: modalExternalReferrer.firstName, lastName: modalExternalReferrer.lastName }, mockProfessionals)
                            : findDuplicateClients({ firstName: modalExternalReferrer.firstName, lastName: modalExternalReferrer.lastName }, mockCouples, getCoupleName, couple.id)
                          if (matches.length === 0) return null
                          return (
                            <DuplicateAlert
                              matches={matches}
                              type={refType === 'professionnel' ? 'pro' : 'client'}
                              onView={(id) => navigate(`/couples/${id}`)}
                              onLink={(item) => {
                                if (refType === 'professionnel') {
                                  // Link to existing pro
                                  if (!couple.clientLinks) couple.clientLinks = []
                                  if (!couple.clientLinks.some(l => l.type === 'parrainage-pro' && l.proId === item.id)) {
                                    couple.clientLinks.push({ type: 'parrainage-pro', proId: item.id, proName: `${item.firstName || ''} ${item.lastName || ''}`.trim(), role: 'filleul' })
                                  }
                                  setModalExternalReferrer(null)
                                } else {
                                  // Link to existing client as parrain
                                  setModalSelectedReferrer(item)
                                  setModalExternalReferrer(null)
                                }
                              }}
                              onDismiss={() => {}}
                            />
                          )
                        })()}
                        <div className="grid-2" style={{ marginBottom: 6 }}>
                          <input className="input" type="email" placeholder="Email" value={modalExternalReferrer.email || ''}
                            onChange={e => setModalExternalReferrer({ ...modalExternalReferrer, email: e.target.value })} style={{ fontSize: '0.786rem' }} />
                          <input className="input" type="tel" placeholder="Téléphone" value={modalExternalReferrer.phone || ''}
                            onChange={e => setModalExternalReferrer({ ...modalExternalReferrer, phone: e.target.value })} style={{ fontSize: '0.786rem' }} />
                        </div>
                        <input className="input" placeholder="Note (ex: confrère, ami, médecin…)" value={modalExternalReferrer.role || ''}
                          onChange={e => setModalExternalReferrer({ ...modalExternalReferrer, role: e.target.value })} style={{ fontSize: '0.786rem', width: '100%' }} />
                      </div>
                    ) : (modalSelectedReferrer || (() => { const link = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul'); return link ? mockCouples.find(c => c.id === link.clientId) : null })()) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                      }}>
                        <span style={{ fontWeight: 500, color: '#8B5CF6' }}>
                          <Award size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                          {getCoupleName(modalSelectedReferrer || (() => { const link = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul'); return link ? mockCouples.find(c => c.id === link.clientId) : null })())} <span style={{ fontSize: '0.643rem', fontWeight: 400, opacity: 0.7 }}>· Parrain</span>
                        </span>
                        <button onClick={() => {
                          // Clear modal state
                          setModalSelectedReferrer(null)
                          setModalReferrerSearch('')
                          setModalExternalReferrer(null)
                          // Also remove the parrainage link from clientLinks
                          if (couple.clientLinks) {
                            const parrainageLinks = couple.clientLinks.filter(l => l.type === 'parrainage' && l.role === 'filleul')
                            parrainageLinks.forEach(link => {
                              const other = mockCouples.find(c => c.id === link.clientId)
                              if (other?.clientLinks) {
                                other.clientLinks = other.clientLinks.filter(l => !(l.type === 'parrainage' && l.clientId === couple.id))
                              }
                            })
                            couple.clientLinks = couple.clientLinks.filter(l => !(l.type === 'parrainage' && l.role === 'filleul'))
                          }
                          couple.externalReferrer = null
                          // Force re-render
                          setModalShowAddLink(prev => !prev)
                          setTimeout(() => setModalShowAddLink(false), 0)
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input" type="text" placeholder="Rechercher un client…"
                          value={modalReferrerSearch}
                          onChange={e => { setModalReferrerSearch(e.target.value); setModalShowReferrerDropdown(true) }}
                          onFocus={() => setModalShowReferrerDropdown(true)}
                          onBlur={() => setTimeout(() => setModalShowReferrerDropdown(false), 200)}
                          style={{ fontSize: '0.857rem', width: '100%' }}
                        />
                        {modalShowReferrerDropdown && (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            maxHeight: 220, overflowY: 'auto', marginTop: 4
                          }}>
                            {/* External person option */}
                            <div
                              onMouseDown={e => {
                                e.preventDefault()
                                setModalExternalReferrer({ firstName: '', lastName: '', role: '' })
                                setModalShowReferrerDropdown(false); setModalReferrerSearch('')
                              }}
                              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-light)' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <UserPlus size={14} color="#D97706" />
                              <span style={{ fontWeight: 500, color: '#D97706' }}>Personne externe (non client)</span>
                            </div>
                            {mockCouples
                              .filter(c => !c.deleted && c.id !== couple.id)
                              .filter(c => !modalReferrerSearch || getCoupleName(c).toLowerCase().includes(modalReferrerSearch.toLowerCase()))
                              .slice(0, 8)
                              .map(c => (
                                <div
                                  key={c.id}
                                  onMouseDown={e => {
                                    e.preventDefault()
                                    setModalSelectedReferrer(c); setModalShowReferrerDropdown(false); setModalReferrerSearch('')
                                  }}
                                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span>{getCoupleName(c)}</span>
                                  <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                                    {getClientType(c) === 'individual' ? 'Individuel' : getClientType(c) === 'couple' ? 'Couple' : 'Famille'}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Client Links */}
              <div style={{
                padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-50)', border: '1px solid var(--border-light)'
              }}>
                <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={14} /> Lier un dossier
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {(couple.clientLinks || []).map((link, idx) => {
                    const isPro = link.type === 'parrainage-pro'
                    const linked = isPro ? null : mockCouples.find(c => c.id === link.clientId)
                    if (!isPro && !linked) return null
                    const isDossier = link.type === 'dossier'
                    const color = isPro ? '#7C3AED' : isDossier ? '#6366F1' : '#8B5CF6'
                    const bg = isDossier ? '#EEF2FF' : '#F5F0FF'
                    const LinkIcon = isPro ? Briefcase : isDossier ? Link2 : Award
                    const displayName = isPro ? link.proName : getCoupleName(linked)
                    const roleLabel = link.type === 'parrainage' && link.role
                      ? (link.role === 'filleul' ? '· Parrain' : '· Filleul')
                      : isPro ? '· Parrain Pro' : `· ${getClientType(linked) === 'individual' ? 'Individuel' : getClientType(linked) === 'couple' ? 'Couple' : 'Famille'}`
                    return (
                      <div key={idx} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                        background: bg, border: `1px solid ${color}20`,
                        fontSize: '0.714rem', fontWeight: 600, color,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                        onClick={() => {
                          if (hasChanges()) {
                            if (!window.confirm('Des modifications non enregistrées seront perdues. Voulez-vous vraiment quitter ?')) return
                          }
                          setShowEditModal(false)
                          isPro ? navigate('/admin/reseau-pro') : navigate(`/couples/${linked.id}`)
                        }}
                        title={`${isPro ? 'Parrain Pro' : isDossier ? 'Dossier lié' : 'Parrainage'} — cliquer pour ouvrir`}
                      >
                        <LinkIcon size={11} />
                        {displayName}
                        <span style={{ fontSize: '0.571rem', fontWeight: 400, opacity: 0.7 }}>
                          {roleLabel}
                        </span>
                        <button onClick={e => {
                          e.stopPropagation()
                          e.preventDefault()
                          couple.clientLinks = couple.clientLinks.filter((_, i) => i !== idx)
                          if (linked && linked.clientLinks) linked.clientLinks = linked.clientLinks.filter(l => l.clientId !== couple.id)
                          // If deleting a parrain link, also clear external referrer
                          if ((link.type === 'parrainage' && link.role === 'filleul') || link.type === 'parrainage-pro') {
                            setModalExternalReferrer(null)
                            couple.externalReferrer = null
                          }
                          setModalShowAddLink(prev => !prev)
                          setTimeout(() => setModalShowAddLink(false), 0)
                        }} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', padding: '0 0 0 4px', display: 'flex', alignItems: 'center',
                          opacity: 0.6, transition: 'opacity 0.15s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                          title="Retirer ce lien">
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                  {/* Add link inline */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setModalShowAddLink(!modalShowAddLink)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '3px 7px', borderRadius: 'var(--radius-sm)',
                        background: 'none', border: '1px dashed var(--border-light)',
                        color: 'var(--text-tertiary)', cursor: 'pointer',
                        fontSize: '0.643rem', fontWeight: 500, transition: 'all 0.2s'
                      }}
                    >
                      <Plus size={10} /> Lier un dossier client
                    </button>
                    {modalShowAddLink && (
                      <div style={{
                        position: 'absolute', bottom: '100%', left: 0, zIndex: 30,
                        marginBottom: 6, width: 260,
                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        padding: 'var(--space-sm)'
                      }}>
                        <input className="input" placeholder="Rechercher..." value={modalAddLinkSearch}
                          onChange={e => setModalAddLinkSearch(e.target.value)} autoFocus
                          style={{ fontSize: '0.714rem', marginBottom: 'var(--space-xs)' }}
                        />
                        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                          {mockCouples
                            .filter(c => c.id !== couple.id && !c.deleted)
                            .filter(c => !(couple.clientLinks || []).some(l => l.clientId === c.id))
                            .filter(c => !modalAddLinkSearch || getCoupleName(c).toLowerCase().includes(modalAddLinkSearch.toLowerCase()))
                            .slice(0, 6)
                            .map(c => (
                              <div key={c.id} onClick={() => {
                                if (!couple.clientLinks) couple.clientLinks = []
                                couple.clientLinks.push({ clientId: c.id, type: 'dossier' })
                                if (!c.clientLinks) c.clientLinks = []
                                c.clientLinks.push({ clientId: couple.id, type: 'dossier' })
                                setModalShowAddLink(false); setModalAddLinkSearch('')
                              }} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 6px', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: '0.714rem', transition: 'background 0.15s'
                              }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getCoupleName(c)}</span>
                                <span style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                                  {getClientType(c) === 'individual' ? 'Individuel' : getClientType(c) === 'couple' ? 'Couple' : 'Famille'}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 32px 18px', borderTop: '1px solid var(--border-light)'
            }}>
              <button onClick={() => setShowDeleteConfirm(true)} className="btn"
                style={{ fontSize: '0.786rem', padding: '6px 14px', background: 'none', border: '1px solid var(--error)', color: 'var(--error)', cursor: 'pointer', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button className="btn btn-ghost" onClick={() => {
                  // Reset all edit fields to original values
                  setEditPartnerA({ ...couple.partnerA })
                  setEditPartnerB(couple.partnerB ? { ...couple.partnerB } : {})
                  setEditChildren(couple.children || [])
                  setEditType(couple ? getClientType(couple) : 'individual')
                  setEditSource(couple?.source || '')
                  setShowEditModal(false)
                  setShowDeleteConfirm(false)
                }}
                  style={{ fontSize: '0.857rem' }}
                >Annuler</button>
                <button className="btn btn-accent" style={{ fontSize: '0.857rem', padding: '8px 20px',
                    opacity: (!(editPartnerA.lastName || '').trim() || ((editType === 'couple' || editType === 'family') && !(editPartnerB.lastName || '').trim()) || ((editSource === 'referral' || editSource === 'parrainage') && modalExternalReferrer && !(modalExternalReferrer.lastName || '').trim())) ? 0.4 : 1
                  }}
                  disabled={!(editPartnerA.lastName || '').trim() || ((editType === 'couple' || editType === 'family') && !(editPartnerB.lastName || '').trim()) || ((editSource === 'referral' || editSource === 'parrainage') && modalExternalReferrer && !(modalExternalReferrer.lastName || '').trim())}
                  onClick={async () => {
                    // Build updated values without mutating couple directly
                    const updatedPartnerA = { ...editPartnerA, lastName: (editPartnerA.lastName || '').toUpperCase() }
                    const updatedPartnerB = (editType === 'couple' || editType === 'family') ? { ...editPartnerB, lastName: (editPartnerB.lastName || '').toUpperCase() } : couple.partnerB
                    // Handle family → couple transition
                    let finalType = editType
                    if (editType === 'family' && editChildren.length === 0) {
                      finalType = 'couple'
                    }
                    const updatedChildren = editType === 'family' ? [...editChildren] : undefined

                    // Auto-force source to 'parrainage' if a referrer is configured
                    if (modalSelectedReferrer || (modalExternalReferrer && modalExternalReferrer.lastName?.trim())) {
                      couple.source = 'parrainage'
                    } else {
                      couple.source = editSource || null
                    }
                    // If source changed AWAY from parrainage, break all parrainage links
                    if (editSource !== 'parrainage' && editSource !== 'referral') {
                      couple.externalReferrer = null
                      setModalExternalReferrer(null)
                      setModalSelectedReferrer(null)
                      // Remove parrainage links from this couple and reverse links from parrains
                      if (couple.clientLinks) {
                        const parrainageLinks = couple.clientLinks.filter(l => l.type === 'parrainage')
                        parrainageLinks.forEach(link => {
                          const other = mockCouples.find(c => c.id === link.clientId)
                          if (other?.clientLinks) {
                            other.clientLinks = other.clientLinks.filter(l => !(l.type === 'parrainage' && l.clientId === couple.id))
                          }
                        })
                        couple.clientLinks = couple.clientLinks.filter(l => l.type !== 'parrainage')
                      }
                    } else {
                      couple.externalReferrer = modalExternalReferrer || null
                    }
                    // Auto-create link for internal referrer (existing client)
                    if (modalSelectedReferrer && modalSelectedReferrer.id !== couple.id && (editSource === 'referral' || editSource === 'parrainage')) {
                      if (!couple.clientLinks) couple.clientLinks = []
                      if (!couple.clientLinks.some(l => l.type === 'parrainage' && l.clientId === modalSelectedReferrer.id)) {
                        couple.clientLinks.push({ clientId: modalSelectedReferrer.id, type: 'parrainage', role: 'filleul' })
                      }
                      if (!modalSelectedReferrer.clientLinks) modalSelectedReferrer.clientLinks = []
                      if (!modalSelectedReferrer.clientLinks.some(l => l.type === 'parrainage' && l.clientId === couple.id)) {
                        modalSelectedReferrer.clientLinks.push({ clientId: couple.id, type: 'parrainage', role: 'parrain' })
                      }
                    }
                    if (modalExternalReferrer && modalExternalReferrer.lastName && modalExternalReferrer.lastName.trim()) {
                      const refType = modalExternalReferrer.referrerType || 'particulier'
                      const refName = `${modalExternalReferrer.firstName || ''} ${modalExternalReferrer.lastName}`.trim()
                      const today = new Date().toISOString().split('T')[0]
                      const todayFull = new Date().toISOString().replace(/\.\d+Z$/, '')

                      if (refType === 'professionnel') {
                        // --- PROFESSIONNEL → Supabase professionals ---
                        // Try to find by proId from existing link first, then by name
                        const existingProLink = (couple.clientLinks || []).find(l => l.type === 'parrainage-pro')
                        let existingPro = existingProLink ? mockProfessionals.find(p => p.id === existingProLink.proId) : null
                        if (!existingPro) {
                          existingPro = mockProfessionals.find(p =>
                            p.lastName === modalExternalReferrer.lastName.trim() &&
                            (p.firstName || '') === (modalExternalReferrer.firstName || '')
                          )
                        }
                        let proId
                        if (existingPro) {
                          const updatedReferrals = [...(existingPro.referrals || [])]
                          if (!updatedReferrals.some(r => r.clientId === couple.id)) {
                            updatedReferrals.push({ clientId: couple.id, date: today, clientName: getCoupleName(couple) })
                          }
                          updatePro(existingPro.id, {
                            firstName: modalExternalReferrer.firstName || existingPro.firstName,
                            lastName: modalExternalReferrer.lastName.trim(),
                            email: modalExternalReferrer.email || existingPro.email,
                            phone: modalExternalReferrer.phone || existingPro.phone,
                            note: modalExternalReferrer.role || existingPro.note,
                            referrals: updatedReferrals
                          })
                          proId = existingPro.id
                        } else {
                          const newPro = await createPro({
                            firstName: modalExternalReferrer.firstName || '',
                            lastName: modalExternalReferrer.lastName.trim(),
                            email: modalExternalReferrer.email || '',
                            phone: modalExternalReferrer.phone || '',
                            note: modalExternalReferrer.role || '',
                            createdAt: today,
                            referrals: [{ clientId: couple.id, date: today, clientName: getCoupleName(couple) }]
                          })
                          proId = newPro?.id || ('pro-' + Date.now())
                        }
                        // Create a parrainage-pro link on the filleul so it shows in "Lier un dossier"
                        const proName = refName
                        if (!couple.clientLinks) couple.clientLinks = []
                        if (!couple.clientLinks.some(l => l.type === 'parrainage-pro' && l.proId === proId)) {
                          couple.clientLinks.push({ type: 'parrainage-pro', proId, proName, role: 'filleul' })
                        }
                      } else {
                        // --- PARTICULIER → prospect in mockCouples ---
                        const existingLink = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul')
                        const existingProspect = existingLink ? mockCouples.find(c => c.id === existingLink.clientId) : null
                        if (existingProspect) {
                          existingProspect.partnerA.firstName = modalExternalReferrer.firstName || ''
                          existingProspect.partnerA.lastName = modalExternalReferrer.lastName.trim()
                          existingProspect.partnerA.email = modalExternalReferrer.email || ''
                          existingProspect.partnerA.phone = modalExternalReferrer.phone || ''
                          existingProspect.referrerType = 'particulier'
                          existingProspect.note = modalExternalReferrer.role || ''
                        } else {
                          const newProspect = {
                            id: 'ext-ref-' + Date.now(),
                            partnerA: {
                              firstName: modalExternalReferrer.firstName || '',
                              lastName: modalExternalReferrer.lastName.trim(),
                              email: modalExternalReferrer.email || '', phone: modalExternalReferrer.phone || ''
                            },
                            type: 'individual',
                            status: 'active',
                            phase: 'prospect',
                            source: 'parrainage',
                            referrerType: 'particulier',
                            note: modalExternalReferrer.role || '',
                            startDate: today,
                            createdAt: today,
                            sessions: [],
                            clientLinks: [{ clientId: couple.id, type: 'parrainage', role: 'parrain' }]
                          }
                          mockCouples.push(newProspect)
                          if (!couple.clientLinks) couple.clientLinks = []
                          couple.clientLinks.push({ clientId: newProspect.id, type: 'parrainage', role: 'filleul' })
                        }
                      }
                    }
                    setEditType(finalType)
                    // Apply to in-memory couple for immediate UI update
                    couple.partnerA = updatedPartnerA
                    couple.partnerB = updatedPartnerB
                    couple.type = finalType
                    couple.children = updatedChildren
                    // Persist all identity changes to Supabase
                    updateClient(couple.id, {
                      partnerA: updatedPartnerA,
                      partnerB: updatedPartnerB,
                      type: finalType,
                      children: updatedChildren || null,
                      source: couple.source,
                      externalReferrer: couple.externalReferrer || null,
                      clientLinks: couple.clientLinks || []
                    })
                    setShowEditModal(false)
                  }}
                >
                  ✓ Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )})()}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={() => setShowDeleteConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 400,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            padding: '32px',
            textAlign: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-full)',
              background: '#FEE2E2', color: 'var(--error)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-md)'
            }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Supprimer ce client ?
            </h3>
            <p style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              La fiche de <strong>{getCoupleName(couple)}</strong> sera déplacée dans les clients archivés. Vous pourrez la restaurer depuis la section Administration.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}
                style={{ fontSize: '0.857rem', padding: '8px 20px' }}
              >Annuler</button>
              <button className="btn" style={{
                fontSize: '0.857rem', padding: '8px 20px',
                background: 'var(--error)', color: 'white', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
                fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 4
              }}
                onClick={async () => {
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
              >
                <Trash2 size={15} /> Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
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

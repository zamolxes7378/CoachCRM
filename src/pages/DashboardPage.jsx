import { useState, useMemo } from 'react'
import { Calendar, Heart, Clock, PenTool, FileText, ArrowRight, Mic, CheckCircle, XCircle, ChevronDown, CreditCard, Landmark, Banknote, Plus, AlertTriangle, X, Hourglass, Receipt, Award, Search, Sprout, UserPlus, HelpCircle, Trash2, CheckSquare, Square, AlertCircle, ChevronRight } from 'lucide-react'
import SessionCard from '../components/session/SessionCard'
import NewClientButton from '../components/NewClientButton'
import AddSessionButton from '../components/AddSessionButton'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'


export default function DashboardPage({ user }) {
  const navigate = useNavigate()
  const { clients, sessions, reports, phaseIcons, phaseColors, isProspect, getCoupleName, formatTime, formatDate, formatRelativeDate, formatDashboardDate, getPhaseLabel, getComputedStatus, createSession, deleteSession, deleteSessions, sessionRates, defaultPhaseKey, getPhaseColor, getPhaseIcon } = useData()
  const confirm = useConfirm()
  const [visibleCount, setVisibleCount] = useState(10)
  const [sessionView, setSessionView] = useState('future') // 'past' | 'future'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)
  const [newSessionClient, setNewSessionClient] = useState('')
  const [newSessionDate, setNewSessionDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newSessionTime, setNewSessionTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:00`
  })
  const [newSessionNote, setNewSessionNote] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filterInvoice, setFilterInvoice] = useState(false)
  const [filterPayment, setFilterPayment] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedSessions, setSelectedSessions] = useState(new Set())

  const toggleSelect = (id) => {
    setSelectedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const exitSelectMode = () => { setSelectMode(false); setSelectedSessions(new Set()) }


  // All sessions with couple info
  const allSessionsWithCouple = sessions
    .map(s => ({ ...s, couple: clients.find(c => c.id === s.coupleId) }))

  const todayStr = new Date().toISOString().split('T')[0]
  const pastSessions = allSessionsWithCouple.filter(s => (s.date?.split('T')[0] || '') < todayStr).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const upcomingSessions = allSessionsWithCouple.filter(s => (s.date?.split('T')[0] || '') >= todayStr).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const allSessions = [...pastSessions, ...upcomingSessions]

  const activeSessions = sessionView === 'past' ? pastSessions : upcomingSessions

  // Apply search filters — when date is set, search all sessions
  const searchPool = (searchDate || filterInvoice || filterPayment) ? allSessionsWithCouple : activeSessions
  const filteredSessions = searchPool.filter(s => {
    const matchesName = !searchQuery || (s.couple && getCoupleName(s.couple).toLowerCase().includes(searchQuery.toLowerCase()))
    let matchesDate = true
    if (searchDate) {
      const target = new Date(searchDate)
      const datePart = s.date?.split('T')[0] || ''
      if (!datePart) { matchesDate = false }
      else {
        const sessionDay = new Date(datePart)
        const diffDays = Math.abs((sessionDay - target) / 86400000)
        matchesDate = diffDays <= 3
      }
    }
    const matchesInvoice = !filterInvoice || (s.needsInvoice && !s.invoiceSent)
    const matchesPayment = !filterPayment || (s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived)))
    return matchesName && matchesDate && matchesInvoice && matchesPayment
  }).sort((a, b) => {
    const dateA = a.date || ''
    const dateB = b.date || ''
    return sessionView === 'past'
      ? dateB.localeCompare(dateA)
      : dateA.localeCompare(dateB)
  })

  const lastSessions = filteredSessions.slice(0, visibleCount)
  const hasMore = visibleCount < filteredSessions.length

  // Group by date
  const groupedSessions = lastSessions.reduce((groups, session) => {
    const dateKey = session.date?.split('T')[0] || 'Sans date'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(session)
    return groups
  }, {})

  const activeCouples = clients.filter(c => c.phase !== 'prospect' && getComputedStatus(c) === 'active').length
  const activeProspects = clients.filter(c => isProspect(c) && getComputedStatus(c) === 'active').length
  const pendingReports = sessions.filter(s => s.status === 'completed' && !s.hasReport).length
  const pendingInvoices = sessions.filter(s => s.needsInvoice && !s.invoiceSent).length
  const pendingPayments = sessions.filter(s => s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived))).length
  const parrains = clients.filter(c => clients.some(r => r.referredBy === c.id)).length
  const pendingExercises = clients.reduce((acc, c) => acc + (c.exercises || []).filter(e => e.status === 'pending' || e.status === 'in-progress').length, 0)



  // Compute session number per couple (chronological order)
  const sessionNumbers = {}
  sessions
    .filter(s => s.status !== 'cancelled')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach(s => {
      if (!sessionNumbers[s.coupleId]) sessionNumbers[s.coupleId] = 0
      sessionNumbers[s.coupleId]++
      sessionNumbers[s.id] = sessionNumbers[s.coupleId]
    })

  // --- SMART STEERING LOGIC ---
  
  // 1. Relances (Clients without upcoming session and last session > 14 days)
  const clientsToReactivate = useMemo(() => {
    const today = new Date()
    return clients
      .filter(c => getComputedStatus(c) === 'active' && !c.deletedAt && isProspect(c))
      .filter(c => {
        const hasUpcoming = upcomingSessions.some(s => s.coupleId === c.id)
        if (hasUpcoming) return false
        
        const clientSessions = pastSessions
          .filter(s => s.coupleId === c.id && s.status !== 'cancelled')
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        
        const lastSess = clientSessions[0]
        if (!lastSess) return true // New prospect/client with no sessions at all
        
        const lastDate = new Date(lastSess.date)
        const daysSince = (today - lastDate) / (1000 * 60 * 60 * 24)
        return daysSince > 14
      })
      .map(c => ({
        ...c,
        lastSessionDate: pastSessions.find(s => s.coupleId === c.id && s.status !== 'cancelled')?.date
      }))
      .sort((a, b) => (b.lastSessionDate || '').localeCompare(a.lastSessionDate || ''))
  }, [clients, upcomingSessions, pastSessions])

  // 2. Technical Urgencies (CR, Bills, Payments)
  const urgencies = useMemo(() => {
    const tasks = []
    
    // CRs en attente
    const pendingCRs = sessions.filter(s => s.status === 'completed' && !s.hasReport)
    if (pendingCRs.length > 0) {
      tasks.push({
        id: 'urg-cr',
        type: 'content',
        label: `${pendingCRs.length} CR à rédiger`,
        count: pendingCRs.length,
        icon: Mic,
        color: '#E67E22',
        bg: '#FFF3E0',
        onClick: () => navigate('/reports')
      })
    }

    // Paiements à confirmer
    if (pendingPayments > 0) {
      tasks.push({
        id: 'urg-pay',
        type: 'finance',
        label: `${pendingPayments} paiement${pendingPayments > 1 ? 's' : ''} à confirmer`,
        count: pendingPayments,
        icon: Banknote,
        color: '#D97706',
        bg: '#FFFBEB',
        onClick: () => { setFilterPayment(true); setSessionView('past') }
      })
    }

    // Factures à envoyer
    if (pendingInvoices > 0) {
      tasks.push({
        id: 'urg-inv',
        type: 'finance',
        label: `${pendingInvoices} facture${pendingInvoices > 1 ? 's' : ''} à envoyer`,
        count: pendingInvoices,
        icon: Receipt,
        color: '#3182CE',
        bg: '#EBF8FF',
        onClick: () => { setFilterInvoice(true); setSessionView('past') }
      })
    }

    return tasks
  }, [sessions, pendingReports, pendingInvoices, pendingPayments, navigate])

  return (
    <div style={{ paddingBottom: 'var(--space-xl)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '66fr 34fr', gap: 'var(--space-lg)', minHeight: 'calc(100vh - var(--header-height) - 4 * var(--space-xl))' }}>
        {/* Left Column — Agenda & Préparation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Calendar size={22} color="var(--primary-700)" />
              <h3 style={{ margin: 0 }}>Mon agenda</h3>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)' }}>
              <AddSessionButton onClick={() => {
                  const now = new Date()
                  setShowNewSession(true)
                  setNewSessionClient('')
                  setNewSessionDate(now.toISOString().split('T')[0])
                  setNewSessionTime(`${String(now.getHours()).padStart(2, '0')}:00`)
                }} />
              <NewClientButton onClick={() => navigate('/couples?newClient=1')} />
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', flex: 1 }}>
            <div className="tabs" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <button className={`tab ${sessionView === 'future' ? 'active' : ''}`} onClick={() => { setSessionView('future'); setVisibleCount(10); exitSelectMode() }}>
                En cours ({upcomingSessions.length})
              </button>
              <button className={`tab ${sessionView === 'past' ? 'active' : ''}`} onClick={() => { setSessionView('past'); setVisibleCount(10); exitSelectMode() }}>
                Historique récent ({pastSessions.length})
              </button>
              {sessionView === 'future' && (
                <button
                  className={`btn btn-ghost`}
                  style={{
                    marginLeft: 'auto', fontSize: '0.714rem', padding: '4px 10px',
                    color: selectMode ? 'var(--error)' : 'var(--text-secondary)',
                    border: selectMode ? '1px solid var(--error)' : '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                >
                  {selectMode ? <><X size={12} /> Annuler</> : <><CheckSquare size={12} /> Sélectionner</>}
                </button>
              )}
            </div>

            {Object.keys(groupedSessions).length > 0 ? (
              <div style={{ maxHeight: 600, overflowY: 'auto', paddingRight: 4 }}>
                {Object.entries(groupedSessions).map(([dateKey, sessions], groupIdx) => (
                  <div key={dateKey} style={{ marginBottom: 'var(--space-md)' }}>
                    <div style={{
                      fontSize: '0.714rem',
                      fontWeight: 700,
                      color: 'var(--primary-400)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      padding: 'var(--space-xs) 0',
                      borderBottom: '1px solid var(--primary-50)',
                      marginBottom: 'var(--space-sm)'
                    }}>
                      {formatDashboardDate(dateKey)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                      {sessions
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map(session => {
                          const couple = session.couple
                          const effectivePhase = session.phase || couple?.phase || defaultPhaseKey
                          const type = couple?.type || 'couple'
                          const rate = sessionRates[type] ?? sessionRates.couple ?? 60
                          const isSelected = selectedSessions.has(session.id)
                          const isP = isProspect(couple)
                          return (
                            <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                              {selectMode && (
                                <div
                                  onClick={e => { e.stopPropagation(); toggleSelect(session.id) }}
                                  style={{
                                    flexShrink: 0, cursor: 'pointer', padding: '0 8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isSelected ? 'var(--error)' : 'var(--text-tertiary)',
                                  }}
                                >
                                  {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <SessionCard
                                  session={session}
                                  sessionNumber={sessionNumbers[session.id]}
                                  phaseColor={getPhaseColor(effectivePhase)}
                                  PhaseIcon={getPhaseIcon(effectivePhase)}
                                  phaseLabel={getPhaseLabel(effectivePhase)}
                                  showClientName={true}
                                  clientName={couple ? getCoupleName(couple) : null}
                                  sessionRate={rate}
                                  hasReport={session.hasReport}
                                  isProspect={isP}
                    reportSummary={session.summary}
                                  invoiceInfo={session.needsInvoice ? { needsInvoice: true, invoiceSent: session.invoiceSent } : null}
                                  formatDate={formatDate}
                                  formatTime={formatTime}
                                  onClick={selectMode ? () => toggleSelect(session.id) : () => navigate(`/couples/${session.coupleId}?sessionId=${session.id}`, { state: { from: '/' } })}
                                onDelete={session.status === 'cancelled' ? async (sid) => {
                                  const ok = await confirm('Supprimer définitivement cette séance annulée ?', { variant: 'destructive' })
                                  if (!ok) return
                                  await deleteSession(sid)
                                } : undefined}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <button
                    className="btn btn-ghost"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-md)', color: 'var(--primary-500)', fontSize: '0.857rem' }}
                  >
                    <ChevronDown size={16} /> Charger plus RDV
                  </button>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-tertiary)' }}>
                <Hourglass size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-sm)' }} />
                <p>Aucune séance trouvée pour cette période.</p>
              </div>
            )}
          </div>

          {/* Floating action bar for batch delete */}
          {selectMode && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: 'var(--space-sm) var(--space-md)',
              background: 'white', borderTop: '1px solid var(--border-light)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)'
            }}>
              <span style={{ flex: 1, fontSize: '0.786rem', fontWeight: 600, color: selectedSessions.size > 0 ? 'var(--error)' : 'var(--text-secondary)' }}>
                {selectedSessions.size} sélectionné{selectedSessions.size > 1 ? 's' : ''}
              </span>
              <button
                className="btn btn-danger"
                disabled={selectedSessions.size === 0}
                style={{ padding: '6px 14px', fontSize: '0.786rem' }}
                onClick={async () => {
                  const count = selectedSessions.size
                  if (!await confirm(`Supprimer définitivement ${count} séance${count > 1 ? 's' : ''} ?`)) return
                  await deleteSessions([...selectedSessions])
                  exitSelectMode()
                }}
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          )}
        </div>

        {/* Right Column — Pilotage Clients & Recherche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Bloc Pilotage : Action requise */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-sm)' }}>
              <AlertCircle size={20} color="var(--error)" />
              <h3>Action requise</h3>
            </div>
            <div style={{ padding: 'var(--space-md)' }}>
              {/* Technical Urgencies (CR, Pay, Inv) */}
              {urgencies.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: clientsToReactivate.length > 0 ? 'var(--space-md)' : 0 }}>
                  {urgencies.map(task => (
                    <div 
                      key={task.id} 
                      onClick={task.onClick}
                      style={{ 
                        padding: '12px', borderRadius: 'var(--radius-md)', background: task.bg,
                        cursor: 'pointer', border: `1px solid ${task.color}30`,
                        display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border = `1px solid ${task.color}`
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border = `1px solid ${task.color}30`
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <div style={{ color: task.color, flexShrink: 0 }}><task.icon size={18} /></div>
                      <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{task.label}</span>
                      <ChevronRight size={14} style={{ opacity: 0.3 }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Pilotage : Relances & Sommeil */}
              {clientsToReactivate.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Relance prospects ({clientsToReactivate.length})
                  </div>
                  {clientsToReactivate.slice(0, 4).map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => navigate(`/couples/${c.id}`, { state: { from: '/' } })}
                      style={{ 
                        padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--primary-50)',
                        cursor: 'pointer', border: '1px solid transparent'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.border = '1px solid var(--border-medium)'
                        e.currentTarget.style.background = 'white'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.border = '1px solid transparent'
                        e.currentTarget.style.background = 'var(--primary-50)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.857rem' }}>{getCoupleName(c)}</span>
                        <div className="badge badge-prospect" style={{ fontSize: '0.643rem', border: '1px solid var(--border-light)' }}>
                          PROSPECT
                        </div>
                      </div>
                      <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Dernier : {c.lastSessionDate ? formatDate(c.lastSessionDate) : 'Aucun'}
                      </div>
                    </div>
                  ))}
                  {clientsToReactivate.length > 4 && (
                    <button className="btn btn-ghost" onClick={() => navigate('/couples?tab=prospects&view=list')} style={{ fontSize: '0.714rem', width: '100%', justifyContent: 'center' }}>
                      Voir tous les prospects
                    </button>
                  )}
                </div>
              ) : urgencies.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                  <CheckCircle size={24} color="#38A169" style={{ opacity: 0.5, marginBottom: 8 }} />
                  <p style={{ fontSize: '0.814rem', color: 'var(--text-secondary)' }}>Tout est à jour !</p>
                </div>
              )}
            </div>
          </div>


          {/* Recherche & Filtres */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-sm)' }}>
              <Search size={20} color="var(--primary-600)" />
              <h3>Recherche Rapide</h3>
            </div>
            <div style={{ padding: 'var(--space-md)' }}>
              <div style={{ position: 'relative', marginBottom: 'var(--space-sm)' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-300)' }} />
                <input
                  className="input"
                  type="text"
                  placeholder="Nom du client…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setVisibleCount(10) }}
                  style={{ fontSize: '0.857rem', paddingLeft: 32, width: '100%', background: 'var(--primary-50)', border: 'none' }}
                />
              </div>
              <input
                className="input"
                type="date"
                value={searchDate}
                onChange={e => { setSearchDate(e.target.value); setVisibleCount(10) }}
                style={{ fontSize: '0.857rem', marginBottom: 'var(--space-md)', width: '100%', background: 'var(--primary-50)', border: 'none' }}
              />
              
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 'var(--space-sm)' }}>
                <div style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>
                  Statistiques Globales
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
                  <div style={{ padding: '10px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-700)' }}>{activeCouples}</div>
                    <div style={{ fontSize: '0.643rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Clients</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-700)' }}>{activeProspects}</div>
                    <div style={{ fontSize: '0.643rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Prospects</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(searchQuery || searchDate || filterInvoice || filterPayment) && (
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          marginTop: 'var(--space-md)', padding: '0 var(--space-md)' 
        }}>
          <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>
            {filteredSessions.length} résultat{filteredSessions.length !== 1 ? 's' : ''}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => { setSearchQuery(''); setSearchDate(''); setFilterInvoice(false); setFilterPayment(false) }}
            style={{ fontSize: '0.714rem', padding: '2px 8px' }}
          >
            <X size={12} /> Effacer les filtres
          </button>
        </div>
      )}

      {/* Modal Nouvelle séance */}
      {showNewSession && (() => {
        const duplicateSameClient = newSessionClient && newSessionDate
          ? sessions.find(s => s.coupleId === newSessionClient && s.date.startsWith(newSessionDate))
          : null
        const otherSessionsSameDay = newSessionDate
          ? sessions.filter(s => s.date.startsWith(newSessionDate) && s.coupleId !== newSessionClient)
          : []
        const duplicate = duplicateSameClient
        return (
          <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div className="modal-header">
                <h2>Ajouter une séance</h2>
                <button className="modal-close" onClick={() => setShowNewSession(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label className="label-required">Client</label>
                  {newSessionClient ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                    }}>
                      <span style={{ fontWeight: 500 }}>{getCoupleName(clients.find(c => c.id === newSessionClient))}</span>
                      <button onClick={() => { setNewSessionClient(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input input-required"
                        type="text"
                        placeholder="Rechercher un client…"
                        value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                        onFocus={() => setShowClientDropdown(true)}
                        style={{ fontSize: '0.857rem', width: '100%' }}
                      />
                      {showClientDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                          background: 'white', border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          maxHeight: 200, overflowY: 'auto', marginTop: 4
                        }}>
                          {(() => {
                            const filtered = clients
                              .filter(c => c.phase !== 'prospect')
                              .filter(c => !clientSearch || getCoupleName(c).toLowerCase().includes(clientSearch.toLowerCase()))
                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '12px 16px', fontSize: '0.786rem', color: 'var(--text-tertiary)', textAlign: 'center', fontStyle: 'italic' }}>
                                  Aucun client trouvé
                                </div>
                              )
                            }
                            return filtered.map(c => (
                              <div
                                key={c.id}
                                onClick={() => { setNewSessionClient(c.id); setShowClientDropdown(false); setClientSearch('') }}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >{getCoupleName(c)}</div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid-2" style={{ marginTop: 'var(--space-sm)' }}>
                  <div className="input-group">
                    <label>Date de la séance</label>
                    <input
                      className="input"
                      type="date"
                      value={newSessionDate}
                      onChange={e => setNewSessionDate(e.target.value)}
                      max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0] })()}
                    />
                  </div>
                  <div className="input-group">
                    <label>Heure</label>
                    <input
                      className="input"
                      type="time"
                      value={newSessionTime}
                      onChange={e => setNewSessionTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: 'var(--space-sm)' }}>
                  <label>Note de préparation <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span></label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Thèmes à aborder…"
                    value={newSessionNote}
                    onChange={e => setNewSessionNote(e.target.value)}
                    style={{ resize: 'vertical', fontSize: '0.857rem' }}
                  />
                </div>

                {duplicate && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: '#FFFAF0', borderRadius: 'var(--radius-md)',
                    border: '1px solid #FEEBC8', marginTop: 'var(--space-md)'
                  }}>
                    <AlertTriangle size={18} style={{ color: '#C05621', flexShrink: 0 }} />
                    <div style={{ fontSize: '0.786rem', color: '#C05621' }}>
                      <strong>Doublon potentiel :</strong> une séance existe déjà.
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', padding: 'var(--space-md) var(--space-lg)', borderTop: 'none' }}>
                <button className="btn btn-ghost" onClick={() => setShowNewSession(false)}>Annuler</button>
                <button
                  className="btn btn-accent"
                  disabled={!newSessionClient || !newSessionDate || !newSessionTime}
                  onClick={async () => {
                    const sessionData = {
                      coupleId: newSessionClient,
                      date: `${newSessionDate}T${newSessionTime}:00`,
                      status: 'scheduled',
                      title: newSessionNote || null,
                    }
                    await createSession(sessionData)
                    setShowNewSession(false)
                    navigate(`/couples/${newSessionClient}`)
                  }}
                >
                  <Plus size={16} /> Créer la séance
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}


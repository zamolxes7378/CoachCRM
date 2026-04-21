import { useState, useMemo, useRef } from 'react'
import {
  Users, UserPlus, Calendar, LayoutList, CheckSquare, X, Trash2, Hourglass, ChevronDown, Heart, PenTool, FileText, ArrowRight, Mic, CheckCircle, XCircle, CreditCard, Landmark, Banknote, Receipt, Plus, AlertTriangle, Award, Search, Sprout, HelpCircle, Square, AlertCircle, ChevronRight, Phone, MessageSquare, Mail, MessageCircle, Globe, Share2
} from 'lucide-react'
import UrgencyCard from '../components/UrgencyCard'
import useUrgencies from '../hooks/useUrgencies'
import ViewSwitcher from '../components/layout/ViewSwitcher'
import SessionCard from '../components/session/SessionCard'
import CalendarView from '../components/dashboard/CalendarView'
import NewClientButton from '../components/NewClientButton'
import AddSessionButton from '../components/AddSessionButton'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'
import ActionDetailPanel from '../components/dashboard/ActionDetailPanel'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { todayIso } from '../lib/date'


export default function DashboardPage({ user }) {
  const navigate = useNavigate()
  const { clients, sessions, reports, contacts, phaseIcons, phaseColors, isProspect, getClientName, getClientInitials, getClientType, formatTime, formatDate, formatRelativeDate, formatDashboardDate, getPhaseLabel, getComputedStatus, createSession, deleteSession, deleteSessions, sessionRates, defaultPhaseKey, getPhaseColor, getPhaseIcon, getInvoiceForSession } = useData()
  const { urgencies, clientsToReactivate, pendingCRs, pendingPaymentSessions, pendingInvoiceSessions } = useUrgencies()
  const confirm = useConfirm()
  const [visibleCount, setVisibleCount] = useState(10)
  const [sessionView, setSessionView] = useState('future') // 'past' | 'future'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)
  const [newSessionClient, setNewSessionClient] = useState('')
  const [newSessionDate, setNewSessionDate] = useState(() => todayIso())
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
  const [dashboardView, setDashboardView] = useState('list') // 'list' | 'calendar'
  const [activeUrgency, setActiveUrgency] = useState(null)
  const newSessionModalRef = useRef(null)
  useFocusTrap(newSessionModalRef, showNewSession)
  useEscapeKey(() => setShowNewSession(false), showNewSession)

  const toggleSelect = (id) => {
    setSelectedSessions(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const exitSelectMode = () => { setSelectMode(false); setSelectedSessions(new Set()) }


  // All sessions with client info
  const allSessionsWithClient = sessions
    .map(s => ({ ...s, client: clients.find(c => c.id === s.clientId) }))

  const todayStr = todayIso()
  const pastSessions = allSessionsWithClient.filter(s => (s.date?.split('T')[0] || '') < todayStr).sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const upcomingSessions = allSessionsWithClient.filter(s => (s.date?.split('T')[0] || '') >= todayStr).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const allSessions = [...pastSessions, ...upcomingSessions]

  const activeSessions = sessionView === 'past' ? pastSessions : upcomingSessions

  // Apply search filters — when any search is active, search across all sessions (cross-tabs)
  const isSearchActive = !!(searchQuery || searchDate || filterInvoice || filterPayment)
  const searchPool = isSearchActive ? allSessionsWithClient : activeSessions
  const filteredSessions = searchPool.filter(s => {
    const matchesName = !searchQuery || (s.client && getClientName(s.client).toLowerCase().includes(searchQuery.toLowerCase()))
    let matchesDate = true
    if (searchDate) {
      // Forward-looking: show sessions from chosen date onward
      const datePart = s.date?.split('T')[0] || ''
      matchesDate = datePart >= searchDate
    }
    const matchesInvoice = !filterInvoice || ((() => { const inv = getInvoiceForSession(s.id); return inv && !inv.sent })())
    const matchesPayment = !filterPayment || (s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived)))
    return matchesName && matchesDate && matchesInvoice && matchesPayment
  }).sort((a, b) => sessionView === 'past' && !isSearchActive
    ? (b.date || '').localeCompare(a.date || '')
    : (a.date || '').localeCompare(b.date || ''))

  // Date search display rules
  const hasSessionsOnDate = searchDate && filteredSessions.some(s => (s.date?.split('T')[0] || '') === searchDate)
  const dateSearchInitialCount = searchDate ? (hasSessionsOnDate ? 10 : 5) : null
  const noSessionsOnDateMessage = searchDate && !hasSessionsOnDate
    ? `Pas de séances le ${new Date(searchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
    : null

  const effectiveVisibleCount = searchDate ? Math.max(visibleCount, dateSearchInitialCount) : visibleCount
  const lastSessions = filteredSessions.slice(0, effectiveVisibleCount)
  const hasMore = effectiveVisibleCount < filteredSessions.length

  // Group by date
  const groupedSessions = lastSessions.reduce((groups, session) => {
    const dateKey = session.date?.split('T')[0] || 'Sans date'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(session)
    return groups
  }, {})

  const activeClients = clients.filter(c => c.phase !== 'prospect' && getComputedStatus(c) === 'active').length
  const activeProspects = clients.filter(c => isProspect(c) && getComputedStatus(c) === 'active').length
  const pendingReports = pendingCRs.length
  const pendingInvoiceCount = pendingInvoiceSessions.length
  const pendingPaymentCount = pendingPaymentSessions.length
  const parrains = clients.filter(c => clients.some(r => r.referredBy === c.id)).length
  const pendingExercises = clients.reduce((acc, c) => acc + (c.exercises || []).filter(e => e.status === 'pending' || e.status === 'in-progress').length, 0)



  // Compute session number per client (chronological order)
  const sessionNumbers = {}
  sessions
    .filter(s => s.status !== 'cancelled')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .forEach(s => {
      if (!sessionNumbers[s.clientId]) sessionNumbers[s.clientId] = 0
      sessionNumbers[s.clientId]++
      sessionNumbers[s.id] = sessionNumbers[s.clientId]
    })



  return (
    <div style={{ paddingBottom: 'var(--space-xl)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '65% 35%', gap: 'var(--space-lg)', minHeight: 'calc(100vh - var(--header-height) - 4 * var(--space-xl))' }}>
        {/* Left Column — Agenda & Préparation */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ paddingBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <Calendar size={22} color="var(--primary-700)" />
              <h3 style={{ margin: 0 }}>Mon agenda</h3>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <AddSessionButton onClick={() => {
                const now = new Date()
                setShowNewSession(true)
                setNewSessionClient('')
                setNewSessionDate(todayIso())
                setNewSessionTime(`${String(now.getHours()).padStart(2, '0')}:00`)
              }} />
              <NewClientButton onClick={() => navigate('/clients?newClient=1')} />
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {dashboardView === 'list' ? (
              <>
                <div style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {isSearchActive ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                      <Search size={14} style={{ color: 'var(--primary-400)' }} />
                      <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--primary-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Recherche — {filteredSessions.length} séance{filteredSessions.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => { setSearchQuery(''); setSearchDate(''); setFilterInvoice(false); setFilterPayment(false) }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          fontSize: '0.643rem', fontWeight: 600, padding: '2px 8px',
                          background: 'var(--primary-50)', color: 'var(--primary-500)',
                          border: '1px solid var(--primary-100)', borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer', marginLeft: 4
                        }}
                      >
                        <X size={10} /> Effacer
                      </button>
                    </div>
                  ) : (
                    <div className="tabs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 0 }}>
                      <button className={`tab ${sessionView === 'future' ? 'active' : ''}`} onClick={() => { setSessionView('future'); setVisibleCount(10); exitSelectMode() }}>
                        En cours ({upcomingSessions.length})
                      </button>
                      <button className={`tab ${sessionView === 'past' ? 'active' : ''}`} onClick={() => { setSessionView('past'); setVisibleCount(10); exitSelectMode() }}>
                        Historique récent ({pastSessions.length})
                      </button>
                    </div>
                  )}

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    {sessionView === 'future' && (
                      <button
                        className={`btn btn-ghost`}
                        style={{
                          fontSize: '0.714rem', padding: '4px 10px',
                          color: selectMode ? 'var(--error)' : 'var(--text-secondary)',
                          border: selectMode ? '1px solid var(--error)' : '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)'
                        }}
                        onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
                      >
                        {selectMode ? <><X size={12} /> Annuler</> : <><CheckSquare size={12} /> Sélectionner</>}
                      </button>
                    )}

                    <ViewSwitcher
                      currentView={dashboardView}
                      onViewChange={setDashboardView}
                      options={[
                        { id: 'list', icon: LayoutList, title: 'Vue liste' },
                        { id: 'calendar', icon: Calendar, title: 'Vue calendrier' }
                      ]}
                    />
                  </div>
                </div>

                {noSessionsOnDateMessage && (
                  <div style={{
                    padding: '10px 14px', marginBottom: 'var(--space-sm)',
                    background: 'var(--primary-50)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--primary-100)',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <Calendar size={14} style={{ color: 'var(--primary-400)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.786rem', color: 'var(--primary-500)', fontWeight: 500 }}>
                      {noSessionsOnDateMessage}
                    </span>
                  </div>
                )}

                {Object.keys(groupedSessions).length > 0 ? (
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, minHeight: 0 }}>
                    {Object.entries(groupedSessions).map(([dateKey, sessions], groupIdx) => (
                      <div key={dateKey} style={{ marginBottom: 'var(--space-md)' }}>
                        {(() => {
                          const today = todayIso()
                          const isToday = dateKey === today
                          return (
                            <div style={{
                              fontSize: '0.714rem',
                              fontWeight: 700,
                              color: isToday ? 'var(--accent-main)' : 'var(--primary-400)',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              padding: 'var(--space-xs) 0',
                              marginBottom: 'var(--space-sm)',
                              display: 'flex', alignItems: 'center', gap: 6
                            }}>
                              {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-main)', flexShrink: 0 }} />}
                              {formatDashboardDate(dateKey)}
                            </div>
                          )
                        })()}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                          {sessions
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map(session => {
                              const client = session.client
                              const effectivePhase = session.phase || client?.phase || defaultPhaseKey
                              const type = client?.type || 'client'
                              const rate = sessionRates[type] ?? sessionRates.client ?? 60
                              const isSelected = selectedSessions.has(session.id)
                              const isP = isProspect(client)
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
                                      clientName={client ? getClientName(client) : null}
                                      clientType={client ? getClientType(client) : 'client'}
                                      sessionRate={rate}
                                      hasReport={session.hasReport}
                                      isProspect={isP}
                                      reportSummary={session.summary}

                                      formatDate={formatDate}
                                      formatTime={formatTime}
                                      onClick={selectMode ? () => toggleSelect(session.id) : () => session.clientId && navigate(`/clients/${session.clientId}?sessionId=${session.id}`, { state: { from: '/' } })}
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
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <ViewSwitcher
                    currentView={dashboardView}
                    onViewChange={setDashboardView}
                    options={[
                      { id: 'list', icon: LayoutList, title: 'Vue liste' },
                      { id: 'calendar', icon: Calendar, title: 'Vue calendrier' }
                    ]}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <CalendarView
                    sessions={allSessionsWithClient.map(s => ({
                      ...s,
                      clientName: s.client ? getClientName(s.client) : 'Sans nom'
                    }))}
                    getPhaseColor={getPhaseColor}
                    onSessionClick={(s) => s.clientId && navigate(`/clients/${s.clientId}?sessionId=${s.id}`, { state: { from: '/' } })}
                  />
                </div>
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

        {/* Right Column — Statistiques, Pilotage & Recherche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* Statistiques Globales — top-right corner */}
          {(() => {
            const now = new Date()
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            const sessionsThisMonth = sessions.filter(s => s.date?.startsWith(currentMonth) && s.status !== 'cancelled').length
            const completedThisMonth = sessions.filter(s => s.date?.startsWith(currentMonth) && s.status === 'completed')
            const caThisMonth = completedThisMonth.reduce((sum, s) => sum + (s.paymentAmount ?? (sessionRates[clients.find(c => c.id === s.clientId)?.type || 'client'] ?? sessionRates.client ?? 60)), 0)
            const totalCompletedSessions = sessions.filter(s => s.status === 'completed').length
            const conversionRate = activeClients + activeProspects > 0 ? Math.round((activeClients / (activeClients + activeProspects)) * 100) : 0

            const stats = [
              { label: 'Clients actifs', value: activeClients, color: 'var(--primary-700)', bg: 'var(--primary-50)', icon: Users },
              { label: 'Prospects', value: activeProspects, color: '#7C3AED', bg: '#F5F3FF', icon: Sprout },
              { label: 'Parrains', value: parrains, color: '#D97706', bg: '#FFFBEB', icon: Heart },
            ]

            return (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                padding: 'var(--space-md)',
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                {stats.map((s, i) => {
                  const StatIcon = s.icon
                  return (
                    <div key={i} style={{
                      padding: '10px 8px', background: s.bg,
                      borderRadius: 'var(--radius-md)', textAlign: 'center',
                      transition: 'transform 0.15s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <StatIcon size={14} style={{ color: s.color, marginBottom: 4 }} />
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
                      <div style={{ fontSize: '0.571rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>{s.label}</div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* Bloc Pilotage : Action requise */}
          <div className="card">
            <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 'var(--space-sm)' }}>
              <AlertCircle size={20} color="var(--error)" />
              <h3>Action requise</h3>
            </div>
            <div style={{ padding: 'var(--space-md)' }}>
              {/* Technical Urgencies (CR, Pay, Inv) */}
              {urgencies.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {urgencies.map(task => (
                    <UrgencyCard key={task.id} {...task} onClick={() => setActiveUrgency(task.id)} />
                  ))}
                </div>
              )}

              {urgencies.length === 0 && (
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
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: searchQuery ? '#D97706' : 'var(--primary-300)' }} />
                <input
                  className="input"
                  type="text"
                  placeholder="Nom du client…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setVisibleCount(10) }}
                  style={{ fontSize: '0.857rem', paddingLeft: 32, paddingRight: searchQuery ? 32 : undefined, width: '100%', background: 'var(--primary-50)', border: searchQuery ? '1.5px solid #D97706' : 'none' }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      display: 'flex', alignItems: 'center', color: '#D97706'
                    }}
                    title="Effacer la recherche"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', marginBottom: 'var(--space-md)' }}>
                <input
                  className="input"
                  type="date"
                  value={searchDate}
                  min="2000-01-01"
                  max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d.toISOString().split('T')[0] })()}
                  onChange={e => { setSearchDate(e.target.value); setVisibleCount(10) }}
                  style={{ fontSize: '0.857rem', width: '100%', background: 'var(--primary-50)', border: searchDate ? '1.5px solid #D97706' : 'none', paddingRight: searchDate ? 32 : undefined }}
                />
                {searchDate && (
                  <button
                    onClick={() => setSearchDate('')}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                      display: 'flex', alignItems: 'center', color: '#D97706'
                    }}
                    title="Effacer la date"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>



      {/* Modal Nouvelle séance */}
      {showNewSession && (() => {
        const duplicateSameClient = newSessionClient && newSessionDate
          ? sessions.find(s => s.clientId === newSessionClient && s.date.startsWith(newSessionDate))
          : null
        const otherSessionsSameDay = newSessionDate
          ? sessions.filter(s => s.date.startsWith(newSessionDate) && s.clientId !== newSessionClient)
          : []
        const duplicate = duplicateSameClient
        return (
          <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
            <div
              ref={newSessionModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-session-title"
              tabIndex={-1}
              className="modal"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 440 }}
            >
              <div className="modal-header">
                <h2 id="new-session-title">Ajouter une séance</h2>
                <button className="modal-close" onClick={() => setShowNewSession(false)} aria-label="Fermer">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label htmlFor="new-session-client" className="label-required">Client</label>
                  {newSessionClient ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                    }}>
                      <span style={{ fontWeight: 500 }}>{(() => {
                        const c = clients.find(cl => cl.id === newSessionClient)
                        return c ? getClientName(c) : 'Client en cours...'
                      })()}</span>
                      <button onClick={() => { setNewSessionClient(''); setClientSearch('') }} aria-label="Effacer le client sélectionné" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        id="new-session-client"
                        className="input input-required"
                        type="text"
                        placeholder="Rechercher un client…"
                        value={clientSearch}
                        onChange={e => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                        onFocus={() => setShowClientDropdown(true)}
                        style={{ fontSize: '0.857rem', width: '100%' }}
                        autoComplete="off"
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
                              .filter(c => !c.deleted)
                              .filter(c => !clientSearch || getClientName(c).toLowerCase().includes(clientSearch.toLowerCase()))
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
                              >
                                {getClientName(c)}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid-2" style={{ marginTop: 'var(--space-sm)' }}>
                  <div className="input-group">
                    <label htmlFor="new-session-date">Date de la séance</label>
                    <input
                      id="new-session-date"
                      className="input"
                      type="date"
                      value={newSessionDate}
                      onChange={e => setNewSessionDate(e.target.value)}
                      min="2000-01-01"
                      max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d.toISOString().split('T')[0] })()}
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="new-session-time">Heure</label>
                    <input
                      id="new-session-time"
                      className="input"
                      type="time"
                      value={newSessionTime}
                      onChange={e => setNewSessionTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: 'var(--space-sm)' }}>
                  <label htmlFor="new-session-note">Note de préparation <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optionnel)</span></label>
                  <textarea
                    id="new-session-note"
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
                  disabled={!newSessionClient || !newSessionDate || !newSessionTime || newSessionDate < '2000-01-01' || newSessionDate > (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d.toISOString().split('T')[0] })()}
                  onClick={async () => {
                    const sessionData = {
                      clientId: newSessionClient,
                      date: `${newSessionDate}T${newSessionTime}:00`,
                      status: 'scheduled',
                      title: newSessionNote || null,
                    }
                    const res = await createSession(sessionData)
                    if (res) {
                      setShowNewSession(false)
                      navigate(`/clients/${newSessionClient}`)
                    }
                  }}
                >
                  <Plus size={16} /> Créer la séance
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Action Detail Panel */}
      {activeUrgency && (() => {
        const urg = urgencies.find(u => u.id === activeUrgency)
        if (!urg) return null

        let panelItems = []

        if (activeUrgency === 'urg-cr') {
          panelItems = sessions
            .filter(s => s.status === 'completed' && !s.hasReport)
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map(s => {
              const client = clients.find(c => c.id === s.clientId)
              return {
                id: s.id,
                clientId: s.clientId,
                sessionId: s.id,
                clientName: client ? getClientName(client) : 'Client inconnu',
                clientType: client ? getClientType(client) : 'client',
                clientInitials: client ? getClientInitials(client) : '?',
                isProspect: client ? isProspect(client) : false,
                subtitle: formatDate(s.date),
                badge: { label: `Séance ${sessionNumbers[s.id] || ''}`, bg: '#FFF3E0', color: '#E67E22', borderColor: '#E67E2230' }
              }
            })
        } else if (activeUrgency === 'urg-pay') {
          panelItems = sessions
            .filter(s => s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived)))
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map(s => {
              const client = clients.find(c => c.id === s.clientId)
              const amount = s.paymentAmount ?? (sessionRates[client?.type || 'client'] ?? sessionRates.client ?? 60)
              return {
                id: s.id,
                clientId: s.clientId,
                sessionId: s.id,
                clientName: client ? getClientName(client) : 'Client inconnu',
                clientType: client ? getClientType(client) : 'client',
                clientInitials: client ? getClientInitials(client) : '?',
                isProspect: client ? isProspect(client) : false,
                subtitle: formatDate(s.date),
                badge: { label: `${amount}€`, bg: '#FFFBEB', color: '#D97706', borderColor: '#D9770630' }
              }
            })
        } else if (activeUrgency === 'urg-inv') {
          panelItems = sessions
            .filter(s => { const inv = getInvoiceForSession(s.id); return inv && !inv.sent })
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .map(s => {
              const client = clients.find(c => c.id === s.clientId)
              const amount = s.paymentAmount ?? (sessionRates[client?.type || 'client'] ?? sessionRates.client ?? 60)
              return {
                id: s.id,
                clientId: s.clientId,
                sessionId: s.id,
                clientName: client ? getClientName(client) : 'Client inconnu',
                clientType: client ? getClientType(client) : 'client',
                clientInitials: client ? getClientInitials(client) : '?',
                isProspect: client ? isProspect(client) : false,
                subtitle: formatDate(s.date),
                badge: { label: `${amount}€`, bg: '#EBF8FF', color: '#3182CE', borderColor: '#3182CE30' }
              }
            })
        } else if (activeUrgency === 'urg-relance') {
          panelItems = clientsToReactivate.map(c => {
            const item = {
              id: c.id,
              clientId: c.id,
              clientName: getClientName(c),
              clientType: getClientType(c),
              clientInitials: getClientInitials(c),
              isProspect: true,
              badge: { label: 'PROSPECT', bg: '#F3E8FF', color: '#7C3AED', borderColor: '#7C3AED30' }
            }
            if (c.lastContact) {
              item.contactInfo = { type: c.lastContact.type, date: formatRelativeDate(c.lastContact.date) }
            } else {
              item.inactiveInfo = c.lastSessionDate ? formatRelativeDate(c.lastSessionDate) : 'Création'
            }
            return item
          })
        }

        return (
          <ActionDetailPanel
            urgency={urg}
            items={panelItems}
            onClose={() => setActiveUrgency(null)}
            onItemClick={(item) => {
              setActiveUrgency(null)
              if (item.sessionId) {
                navigate(`/clients/${item.clientId}?sessionId=${item.sessionId}`, { state: { from: '/' } })
              } else {
                navigate(`/clients/${item.clientId}`, { state: { from: '/' } })
              }
            }}
            formatDate={formatDate}
            formatRelativeDate={formatRelativeDate}
            getClientName={getClientName}
          />
        )
      })()}
    </div>
  )
}


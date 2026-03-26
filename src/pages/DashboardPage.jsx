import { useState, useMemo } from 'react'
import { Calendar, Heart, Clock, PenTool, FileText, ArrowRight, Mic, CheckCircle, XCircle, ChevronDown, CreditCard, Landmark, Banknote, Plus, AlertTriangle, X, Hourglass, Receipt, Award, Search, Sprout, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'


export default function DashboardPage({ user }) {
  const navigate = useNavigate()
  const { clients, sessions, reports, phaseIcons, phaseColors, isProspect, getCoupleName, formatTime, formatDate, formatRelativeDate, getPhaseLabel, getComputedStatus, createSession } = useData()
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


  // All sessions with couple info
  const allSessionsWithCouple = sessions
    .map(s => ({ ...s, couple: clients.find(c => c.id === s.coupleId) }))

  const todayStr = new Date().toISOString().split('T')[0]
  const pastSessions = allSessionsWithCouple.filter(s => s.date.split('T')[0] < todayStr).sort((a, b) => b.date.localeCompare(a.date))
  const upcomingSessions = allSessionsWithCouple.filter(s => s.date.split('T')[0] >= todayStr).sort((a, b) => a.date.localeCompare(b.date))
  const allSessions = [...pastSessions, ...upcomingSessions]

  const activeSessions = sessionView === 'past' ? pastSessions : upcomingSessions

  // Apply search filters — when date is set, search all sessions
  const searchPool = (searchDate || filterInvoice || filterPayment) ? allSessionsWithCouple : activeSessions
  const filteredSessions = searchPool.filter(s => {
    const matchesName = !searchQuery || (s.couple && getCoupleName(s.couple).toLowerCase().includes(searchQuery.toLowerCase()))
    let matchesDate = true
    if (searchDate) {
      const target = new Date(searchDate)
      const sessionDay = new Date(s.date.split('T')[0])
      const diffDays = Math.abs((sessionDay - target) / 86400000)
      matchesDate = diffDays <= 3
    }
    const matchesInvoice = !filterInvoice || (s.needsInvoice && !s.invoiceSent)
    const matchesPayment = !filterPayment || (s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived)))
    return matchesName && matchesDate && matchesInvoice && matchesPayment
  }).sort((a, b) => sessionView === 'past'
    ? b.date.localeCompare(a.date)
    : a.date.localeCompare(b.date)
  )

  const lastSessions = filteredSessions.slice(0, visibleCount)
  const hasMore = visibleCount < filteredSessions.length

  // Group by date
  const groupedSessions = lastSessions.reduce((groups, session) => {
    const dateKey = session.date.split('T')[0]
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
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(s => {
      if (!sessionNumbers[s.coupleId]) sessionNumbers[s.coupleId] = 0
      sessionNumbers[s.coupleId]++
      sessionNumbers[s.id] = sessionNumbers[s.coupleId]
    })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)', minHeight: 'calc(100vh - var(--header-height) - 2 * var(--space-xl))' }}>
        {/* Agenda — Derniers RDV */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <Calendar size={22} />
            <h3>Calendrier des séances</h3>
            <span className="caption" style={{ marginLeft: 'auto', color: 'var(--text-tertiary)' }}>
              {lastSessions.length} sur {activeSessions.length}
            </span>
            <button
              className="btn btn-accent"
              onClick={() => {
                const now = new Date()
                setShowNewSession(true)
                setNewSessionClient('')
                setNewSessionDate(now.toISOString().split('T')[0])
                setNewSessionTime(`${String(now.getHours()).padStart(2, '0')}:00`)
              }}
            >
              <Plus size={18} style={{ color: 'white' }} /> Ajouter une séance
            </button>
            <button
              className="btn"
              style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontWeight: 600, border: '1px solid var(--primary-200)' }}
              onClick={() => navigate('/couples?newClient=1')}
            >
              <UserPlus size={18} /> Nouveau client
            </button>
          </div>

          <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
            <button className={`tab ${sessionView === 'future' ? 'active' : ''}`} onClick={() => { setSessionView('future'); setVisibleCount(10) }}>
              <Calendar size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> À venir ({upcomingSessions.length})
            </button>
            <button className={`tab ${sessionView === 'past' ? 'active' : ''}`} onClick={() => { setSessionView('past'); setVisibleCount(10) }}>
              <Clock size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> Passées ({pastSessions.length})
            </button>
          </div>
          {Object.keys(groupedSessions).length > 0 ? (
            <>
              <div style={{
                background: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-sm)',
                flex: 1,
                overflowY: 'auto'
              }}>
                {Object.entries(groupedSessions).map(([dateKey, sessions], groupIdx) => (
                  <div key={dateKey}>
                    <div style={{
                      fontSize: '0.714rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: groupIdx === 0 ? 'var(--space-xs) var(--space-sm)' : 'var(--space-md) var(--space-sm) var(--space-xs)'
                    }}>
                      {formatDate(dateKey)}
                    </div>
                    {sessions
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map(session => {
                        const PhaseIcon = phaseIcons[session.phase] || Sprout
                        const pc = phaseColors[session.phase] || { bg: 'var(--primary-100)', color: 'var(--primary-700)' }
                        const statusLabel = session.status === 'completed' ? 'Séance terminée'
                          : session.status === 'cancelled' ? 'Séance annulée' : 'Séance planifiée'

                        return (
                          <div key={session.id}
                            onClick={() => navigate(`/couples/${session.coupleId}`)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-md)',
                              padding: 'var(--space-sm) var(--space-md)',
                              background: session.status === 'cancelled' ? 'var(--error-bg)'
                                : new Date(session.date) <= new Date() ? 'var(--primary-50)' : 'white',
                              border: session.status === 'cancelled' ? 'none'
                                : new Date(session.date) <= new Date() ? 'none' : '1px dashed var(--border-light)',
                              borderRadius: 'var(--radius-lg)',
                              marginBottom: 'var(--space-xs)',
                              cursor: 'pointer',
                              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                            onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none' }}
                          >
                            {/* Phase icon avatar */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <div style={{
                                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                                background: pc.bg, color: pc.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <PhaseIcon size={20} />
                              </div>
                              {sessionNumbers[session.id] && (
                                <span style={{
                                  position: 'absolute', top: -4, right: -4,
                                  minWidth: 18, height: 18,
                                  borderRadius: 'var(--radius-full)',
                                  background: pc.color, color: 'white',
                                  fontSize: '0.643rem', fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  padding: '0 4px',
                                  border: '2px solid white',
                                  lineHeight: 1
                                }}>{sessionNumbers[session.id]}</span>
                              )}
                            </div>

                            {/* Main info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 600, fontSize: '0.929rem',
                                color: session.status === 'cancelled' ? 'var(--error)' : 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {session.couple ? getCoupleName(session.couple) : 'Client inconnu'}
                              </div>
                              <div style={{
                                fontSize: '0.786rem', color: session.status === 'cancelled' ? 'var(--error)' : session.status === 'completed' ? 'var(--success)' : 'var(--text-secondary)',
                                marginTop: 2,
                                display: 'flex', alignItems: 'center', gap: 6,
                                overflow: 'hidden', whiteSpace: 'nowrap'
                              }}>
                                <span>{formatTime(session.date)}</span>
                                {session.paymentMethod && (() => {
                                  const pmBase = {
                                    cheque: { label: 'Chèque', dot: 'var(--error)' },
                                    virement: { label: 'Virement', dot: 'var(--error)' },
                                    especes: { label: 'Espèces', dot: 'var(--success)' }
                                  }[session.paymentMethod]
                                  const isReceived = session.paymentMethod === 'especes' || session.paymentReceived
                                  const displayColor = isReceived ? 'var(--success)' : pmBase.dot
                                  return (
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      fontSize: '0.643rem', fontWeight: 500, letterSpacing: '0.02em',
                                      color: displayColor, opacity: 0.85
                                    }}>
                                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: displayColor, flexShrink: 0 }} />
                                      {pmBase.label}
                                      {isReceived && <CheckCircle size={9} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                                      {session.paymentStatus === 'deferred' && <Hourglass size={9} style={{ color: pmBase.dot, flexShrink: 0 }} />}
                                    </span>
                                  )
                                })()}
                                {session.status === 'completed' && !session.paymentMethod && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.643rem', fontWeight: 600,
                                    color: 'var(--error)',
                                    letterSpacing: '0.02em'
                                  }} title="Mode de paiement non renseigné">
                                    <AlertTriangle size={9} /> PAIEMENT
                                  </span>
                                )}
                                {session.needsInvoice && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    fontSize: '0.643rem', fontWeight: 600,
                                    color: session.invoiceSent ? 'var(--success)' : 'var(--error)',
                                    letterSpacing: '0.02em'
                                  }} title={session.invoiceSent ? 'Facture envoyée' : 'Facture à envoyer'}>
                                    FACTURE {session.invoiceSent && <CheckCircle size={9} />}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Session content — only when report exists */}
                            {session.hasReport && session.summary ? (
                              <div style={{
                                fontSize: '0.786rem', color: 'var(--text-secondary)',
                                minWidth: 120, maxWidth: 280,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                flexShrink: 0
                              }} title={`Séance ${sessionNumbers[session.id] || '?'} : ${session.summary}`}>
                                {(() => { const full = `S${sessionNumbers[session.id] || '?'} : ${session.summary}`; return full.length > 40 ? full.slice(0, 40) + '…' : full })()}
                              </div>
                            ) : (
                              <div style={{ minWidth: 120, maxWidth: 160, flexShrink: 0 }} />
                            )}

                            {/* Right side indicators */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexShrink: 0 }}>
                              {session.hasReport ? (
                                <FileText size={16} style={{ color: '#2B6CB0' }} title="Compte-rendu disponible" />
                              ) : session.status === 'completed' ? (
                                <span style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: 'var(--accent-main)', display: 'inline-flex',
                                  alignItems: 'center', justifyContent: 'center'
                                }} title="Dicter le CR">
                                  <Mic size={14} style={{ color: 'white' }} />
                                </span>
                              ) : session.status === 'cancelled' ? (
                                <XCircle size={16} style={{ color: 'var(--error)' }} />
                              ) : (
                                <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ))}
              </div>
              {hasMore && (
                <>
                  <div style={{
                    position: 'relative', marginTop: -40,
                    height: 40,
                    background: 'linear-gradient(transparent, var(--primary-50))',
                    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    pointerEvents: 'none'
                  }} />
                  <button
                    className="btn btn-ghost"
                    onClick={() => setVisibleCount(prev => prev + 10)}
                    onMouseOver={e => e.currentTarget.style.background = 'transparent'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    style={{ width: '100%', justifyContent: 'center', padding: 'var(--space-sm)', color: 'var(--primary-600)', fontSize: '0.786rem', display: 'flex', alignItems: 'center', gap: 4, background: 'transparent' }}
                  >
                    <ChevronDown size={16} /> Charger plus ({filteredSessions.length - visibleCount} restantes)
                  </button>
                </>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.929rem' }}>Aucune séance récente</p>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Aperçu rapide */}
          <div className="card">
            <div className="card-header">
              <h3>Aperçu rapide</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="stat-card" onClick={() => navigate('/couples?tab=clients')} style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: '#EBF8FF', color: '#2B6CB0' }}>
                  <Heart size={24} />
                </div>
                <div>
                  <div className="stat-value">{activeCouples}</div>
                  <div className="stat-label">clients actifs</div>
                </div>
              </div>
              <div className="stat-card" onClick={() => navigate('/couples?tab=clients')} style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: '#F5F0FF', color: '#6B46C1' }}>
                  <Award size={24} />
                </div>
                <div>
                  <div className="stat-value">{parrains}</div>
                  <div className="stat-label">clients parrains</div>
                </div>
              </div>
              <div className="stat-card" onClick={() => navigate('/couples?tab=prospects')} style={{ cursor: 'pointer' }}>
                <div className="stat-icon" style={{ background: '#F5F0FF', color: '#6B46C1' }}>
                  <UserPlus size={24} />
                </div>
                <div>
                  <div className="stat-value">{activeProspects}</div>
                  <div className="stat-label">prospects actifs</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#FFF3E0', color: '#E67E22' }}>
                  <Mic size={24} />
                </div>
                <div>
                  <div className="stat-value">{pendingReports}</div>
                  <div className="stat-label">CR en attente</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recherche */}
          <div className="card">
            <div className="card-header">
              <Search size={20} />
              <h3>Rechercher</h3>
            </div>

            <div style={{ position: 'relative', marginBottom: 'var(--space-sm)' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                className="input"
                type="text"
                placeholder="Nom du client…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setVisibleCount(10) }}
                style={{ fontSize: '0.857rem', paddingLeft: 30, width: '100%' }}
              />
            </div>
            <input
              className="input"
              type="date"
              value={searchDate}
              onChange={e => { setSearchDate(e.target.value); setVisibleCount(10) }}
              style={{ fontSize: '0.857rem', marginBottom: 'var(--space-md)', width: '100%' }}
            />
            {pendingInvoices > 0 && (
            <div
              onClick={() => { setFilterInvoice(!filterInvoice); setVisibleCount(10) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', marginBottom: 'var(--space-sm)',
                background: filterInvoice ? '#FED7D7' : '#FFF5F5',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterInvoice ? '1px solid var(--error)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <AlertTriangle size={13} style={{ color: 'var(--error)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--error)', letterSpacing: '0.02em' }}>
                {pendingInvoices} FACTURE{pendingInvoices > 1 ? 'S' : ''} EN ATTENTE
              </span>
            </div>
            )}
            {pendingPayments > 0 && (
            <div
              onClick={() => { setFilterPayment(!filterPayment); setVisibleCount(10) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', marginBottom: 'var(--space-sm)',
                background: filterPayment ? '#FED7D7' : '#FFF5F5',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: filterPayment ? '1px solid var(--error)' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <AlertTriangle size={13} style={{ color: 'var(--error)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--error)', letterSpacing: '0.02em' }}>
                {pendingPayments} PAIEMENT{pendingPayments > 1 ? 'S' : ''} EN ATTENTE
              </span>
            </div>
            )}
            {(searchQuery || searchDate || filterInvoice || filterPayment) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>
                  {filteredSessions.length} résultat{filteredSessions.length !== 1 ? 's' : ''}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setSearchQuery(''); setSearchDate(''); setFilterInvoice(false); setFilterPayment(false) }}
                  style={{ fontSize: '0.714rem', padding: '2px 8px' }}
                >
                  <X size={12} /> Effacer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nouvelle séance */}
      {showNewSession && (() => {
        // Check duplicate for same client on same date
        const duplicateSameClient = newSessionClient && newSessionDate
          ? sessions.find(s => s.coupleId === newSessionClient && s.date.startsWith(newSessionDate))
          : null
        // Check all sessions on the same date (any client)
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
                    placeholder="Thèmes à aborder, objectifs, points d'attention…"
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
                      <strong>Doublon potentiel :</strong> une séance existe déjà pour ce client le {formatDate(duplicate.date)} ({duplicate.title})
                    </div>
                  </div>
                )}
                {otherSessionsSameDay.length > 0 && !duplicate && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: '#EBF8FF', borderRadius: 'var(--radius-md)',
                    border: '1px solid #BEE3F8', marginTop: 'var(--space-md)'
                  }}>
                    <Calendar size={16} style={{ color: '#2B6CB0', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: '0.786rem', color: '#2B6CB0' }}>
                      <strong>{otherSessionsSameDay.length} séance{otherSessionsSameDay.length > 1 ? 's' : ''} déjà prévue{otherSessionsSameDay.length > 1 ? 's' : ''} ce jour :</strong>
                      <div style={{ marginTop: 4 }}>
                        {otherSessionsSameDay.slice(0, 3).map((s, i) => {
                          const c = clients.find(cl => cl.id === s.coupleId)
                          return <div key={i} style={{ fontSize: '0.714rem', opacity: 0.85 }}>• {c ? getCoupleName(c) : 'Client'} à {formatTime(s.date)}</div>
                        })}
                        {otherSessionsSameDay.length > 3 && <div style={{ fontSize: '0.714rem', opacity: 0.7 }}>...et {otherSessionsSameDay.length - 3} autre(s)</div>}
                      </div>
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
                    const selectedDate = new Date(`${newSessionDate}T${newSessionTime}`)
                    if (selectedDate < new Date()) {
                      if (!confirm('La séance est planifiée dans le passé. Souhaitez-vous quand même créer cette séance ?')) return
                    }
                    
                    // Create session in Supabase
                    const sessionData = {
                      coupleId: newSessionClient,
                      date: `${newSessionDate}T${newSessionTime}:00`,
                      status: 'scheduled',
                      title: newSessionNote || null,
                    }
                    await createSession(sessionData)
                    
                    setShowNewSession(false)
                    setNewSessionNote('')
                    navigate(`/couples/${newSessionClient}`)
                  }}
                >
                  <Plus size={16} /> {duplicate ? 'Ajouter quand même' : 'Créer la séance'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}


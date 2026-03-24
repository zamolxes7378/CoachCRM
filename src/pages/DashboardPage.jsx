import { useState, useMemo } from 'react'
import { Calendar, Heart, Clock, PenTool, FileText, ArrowRight, Sprout, Search, Target, UserPlus, Mic, CheckCircle, XCircle, ChevronDown, CreditCard, Landmark, Banknote, Plus, AlertTriangle, X, Hourglass, Receipt, Award, User, Users, Star, Baby } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { findDuplicateClients } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'

export default function DashboardPage({ user }) {
  const navigate = useNavigate()
  const { clients: mockCouples, sessions: mockSessions, reports: mockReports, getCoupleName, formatTime, formatDate, formatRelativeDate, getPhaseLabel, getComputedStatus, createClient, createSession } = useData()
  const [visibleCount, setVisibleCount] = useState(10)
  const [sessionView, setSessionView] = useState('future') // 'past' | 'future'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [showNewSession, setShowNewSession] = useState(false)
  const [newSessionClient, setNewSessionClient] = useState('')
  const [newSessionDate, setNewSessionDate] = useState('')
  const [newSessionTime, setNewSessionTime] = useState('')
  const [newSessionNote, setNewSessionNote] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [filterInvoice, setFilterInvoice] = useState(false)
  const [filterPayment, setFilterPayment] = useState(false)
  // New client wizard states
  const [wizardStep, setWizardStep] = useState(0)
  const [ncType, setNcType] = useState('')
  const [ncLastName, setNcLastName] = useState('')
  const [ncFirstName, setNcFirstName] = useState('')
  const [ncFamilyAdults, setNcFamilyAdults] = useState([{}])
  const [ncChildren, setNcChildren] = useState([])
  const [ncReferents, setNcReferents] = useState([0])
  const [ncDupDismissed, setNcDupDismissed] = useState(false)

  const ncDuplicates = useMemo(() => {
    if (ncDupDismissed || !ncLastName.trim()) return []
    return findDuplicateClients({ firstName: ncFirstName, lastName: ncLastName }, mockCouples, getCoupleName)
  }, [ncFirstName, ncLastName, mockCouples, ncDupDismissed])

  const resetWizard = () => { setWizardStep(0); setNcType(''); setNcLastName(''); setNcFirstName(''); setNcFamilyAdults([{}]); setNcChildren([]); setNcReferents([0]); setNcDupDismissed(false) }

  // All sessions with couple info
  const allSessionsWithCouple = mockSessions
    .map(s => ({ ...s, couple: mockCouples.find(c => c.id === s.coupleId) }))

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

  const activeCouples = mockCouples.filter(c => c.phase !== 'prospect' && getComputedStatus(c) === 'active').length
  const activeProspects = mockCouples.filter(c => c.phase === 'prospect' && getComputedStatus(c) === 'active').length
  const pendingReports = mockSessions.filter(s => s.status === 'completed' && !s.hasReport).length
  const pendingInvoices = mockSessions.filter(s => s.needsInvoice && !s.invoiceSent).length
  const pendingPayments = mockSessions.filter(s => s.status === 'completed' && (!s.paymentMethod || (s.paymentMethod !== 'especes' && !s.paymentReceived))).length
  const parrains = mockCouples.filter(c => mockCouples.some(r => r.referredBy === c.id)).length
  const pendingExercises = mockCouples.reduce((acc, c) => acc + (c.exercises || []).filter(e => e.status === 'pending' || e.status === 'in-progress').length, 0)

  const phaseIcons = { prospect: UserPlus, debut: Sprout, analyse: Search, integration: Target }

  // Compute session number per couple (chronological order)
  const sessionNumbers = {}
  mockSessions
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
                setNewSessionTime(now.toTimeString().slice(0, 5))
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
                        const phaseColors = {
                          prospect: { bg: '#F5F0FF', color: '#6B46C1' },
                          debut: { bg: '#EBF8FF', color: '#2B6CB0' },
                          analyse: { bg: '#FFF3E0', color: '#E67E22' },
                          integration: { bg: '#F0FFF4', color: '#276749' }
                        }
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
        const isNewClient = newSessionClient === 'new'
        // Check duplicate for same client on same date
        const duplicateSameClient = newSessionClient && newSessionClient !== 'new' && newSessionDate
          ? mockSessions.find(s => s.coupleId === newSessionClient && s.date.startsWith(newSessionDate))
          : null
        // Check all sessions on the same date (any client)
        const otherSessionsSameDay = newSessionDate
          ? mockSessions.filter(s => s.date.startsWith(newSessionDate) && s.coupleId !== newSessionClient)
          : []
        const duplicate = duplicateSameClient
        return (
          <div className="modal-overlay" onClick={() => setShowNewSession(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: isNewClient ? 600 : 440 }}>
              <div className="modal-header">
                <h2>Ajouter une séance</h2>
                <button className="modal-close" onClick={() => setShowNewSession(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="input-group">
                  <label>Client</label>
                  {newSessionClient && newSessionClient !== 'new' ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                    }}>
                      <span style={{ fontWeight: 500 }}>{getCoupleName(mockCouples.find(c => c.id === newSessionClient))}</span>
                      <button onClick={() => { setNewSessionClient(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : newSessionClient === 'new' ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                    }}>
                      <span style={{ fontWeight: 500, color: 'var(--accent-main)' }}>＋ Nouveau client</span>
                      <button onClick={() => { setNewSessionClient(''); setClientSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
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
                          <div
                            onClick={() => { setNewSessionClient('new'); setShowClientDropdown(false); setClientSearch(''); resetWizard() }}
                            style={{
                              padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem',
                              color: 'var(--accent-main)', fontWeight: 600,
                              borderBottom: '1px solid var(--border-light)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >＋ Nouveau client</div>
                          {mockCouples
                            .filter(c => c.phase !== 'prospect')
                            .filter(c => !clientSearch || getCoupleName(c).toLowerCase().includes(clientSearch.toLowerCase()))
                            .map(c => (
                              <div
                                key={c.id}
                                onClick={() => { setNewSessionClient(c.id); setShowClientDropdown(false); setClientSearch('') }}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >{getCoupleName(c)}</div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline new client wizard */}
                {isNewClient && (() => {
                  const STEPS = ['Type', 'Identité', 'Suivi']
                  const currentYear = new Date().getFullYear()

                  const renderAdultBlock = (title, idx) => (
                    <div style={{ padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)', background: 'white', marginBottom: 'var(--space-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                        <h4 style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} /> {title}
                        </h4>
                        {ncType !== 'individual' && (() => {
                          const isRef = ncReferents.includes(idx)
                          return (
                            <button type="button" onClick={() => { if (isRef) { if (ncReferents.length > 1) setNcReferents(ncReferents.filter(r => r !== idx)) } else { setNcReferents([...ncReferents, idx]) } }}
                              style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.571rem', fontWeight: 600, padding: 0, background: 'none', border: 'none', color: isRef ? '#D97706' : 'var(--text-tertiary)', cursor: 'pointer' }}>
                              <Star size={10} fill={isRef ? '#F59E0B' : 'none'} color={isRef ? '#F59E0B' : 'var(--text-tertiary)'} /> Réf.
                            </button>
                          )
                        })()}
                      </div>
                      <div className="grid-2">
                        <div className="input-group">
                          <input className="input" placeholder="Prénom" style={{ fontSize: '0.786rem' }}
                            value={idx === 0 ? ncFirstName : undefined}
                            onChange={idx === 0 ? e => { setNcFirstName(e.target.value); setNcDupDismissed(false) } : undefined} />
                        </div>
                        <div className="input-group">
                          {idx === 0 ? (
                            <input className="input" placeholder="Nom *" value={ncLastName}
                              onChange={e => { setNcLastName(e.target.value); setNcDupDismissed(false) }}
                              style={{ fontSize: '0.786rem', ...(!ncLastName.trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}) }} />
                          ) : (
                            <input className="input" placeholder="Nom" style={{ fontSize: '0.786rem' }} />
                          )}
                        </div>
                      </div>
                      {idx === 0 && ncDuplicates.length > 0 && (
                        <DuplicateAlert matches={ncDuplicates}
                          onView={(id) => { setShowNewSession(false); navigate(`/couples/${id}`) }}
                          onDismiss={() => setNcDupDismissed(true)} />
                      )}
                      <div className="grid-2">
                        <input className="input" type="email" placeholder="Email" style={{ fontSize: '0.786rem' }} />
                        <input className="input" type="tel" placeholder="Téléphone" style={{ fontSize: '0.786rem' }} />
                      </div>
                    </div>
                  )

                  return (
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-md)', background: 'var(--primary-50)', borderRadius: 'var(--radius-lg)', animation: 'fadeIn 0.2s ease-out' }}>
                      {/* Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 'var(--space-md)' }}>
                        {STEPS.map((label, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                            <div onClick={() => { if (i < wizardStep || (i === 1 && ncType)) setWizardStep(i) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                borderBottom: i === wizardStep ? '2px solid var(--accent-main)' : '2px solid transparent',
                                cursor: (i < wizardStep || (i === 1 && ncType)) ? 'pointer' : 'default',
                                opacity: (i <= wizardStep || ncType) ? 1 : 0.4, transition: 'all 0.2s' }}>
                              <div style={{ width: 18, height: 18, borderRadius: 'var(--radius-sm)',
                                background: i < wizardStep ? 'var(--accent-main)' : i === wizardStep ? 'var(--accent-bg)' : 'white',
                                color: i < wizardStep ? 'white' : i === wizardStep ? 'var(--accent-main)' : 'var(--text-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.571rem', fontWeight: 700 }}>
                                {i < wizardStep ? '✓' : i + 1}
                              </div>
                              <span style={{ fontSize: '0.714rem', fontWeight: 600,
                                color: i === wizardStep ? 'var(--accent-main)' : i < wizardStep ? 'var(--accent-dark)' : 'var(--text-tertiary)' }}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div style={{ width: 16, height: 1, background: i < wizardStep ? 'var(--accent-main)' : 'var(--border-light)' }} />}
                          </div>
                        ))}
                      </div>

                      {/* Step 0 — Type */}
                      {wizardStep === 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                          {[
                            { key: 'individual', label: 'Individuel', desc: '1 personne', color: '#6366F1', bg: '#EEF2FF', Icon: User },
                            { key: 'couple', label: 'Couple', desc: '2 partenaires', color: '#EC4899', bg: '#FDF2F8', Icon: Users },
                            { key: 'family', label: 'Famille', desc: 'Adultes + enfants', color: '#F59E0B', bg: '#FFFBEB', Icon: Users }
                          ].map(t => (
                            <div key={t.key} onClick={() => { setNcType(t.key); setWizardStep(1) }}
                              style={{ padding: 'var(--space-md) var(--space-sm)', borderRadius: 'var(--radius-lg)',
                                border: `2px solid ${ncType === t.key ? t.color : 'var(--border-light)'}`,
                                background: ncType === t.key ? t.bg : 'white', cursor: 'pointer',
                                textAlign: 'center', transition: 'all 0.2s' }}
                              onMouseEnter={e => { if (ncType !== t.key) { e.currentTarget.style.borderColor = t.color + '60'; e.currentTarget.style.background = t.bg + '80' } }}
                              onMouseLeave={e => { if (ncType !== t.key) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'white' } }}>
                              <t.Icon size={28} color={t.color} style={{ marginBottom: 6 }} />
                              <div style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t.label}</div>
                              <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{t.desc}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Step 1 — Identité */}
                      {wizardStep === 1 && (
                        <div>
                          {ncType === 'individual' && renderAdultBlock('Client', 0)}
                          {ncType === 'couple' && (<>{renderAdultBlock('Partenaire A', 0)}{renderAdultBlock('Partenaire B', 1)}</>)}
                          {ncType === 'family' && (
                            <>
                              {ncFamilyAdults.map((_, idx) => (
                                <div key={`fam-${idx}`} style={{ position: 'relative' }}>
                                  {renderAdultBlock(`Adulte ${idx + 1}`, idx)}
                                  {ncFamilyAdults.length > 1 && (
                                    <button onClick={() => { if (ncReferents.includes(idx) && ncReferents.length <= 1) return; setNcFamilyAdults(ncFamilyAdults.filter((_, i) => i !== idx)); setNcReferents(ncReferents.filter(r => r !== idx).map(r => r > idx ? r - 1 : r)) }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.571rem', fontWeight: 500, padding: '2px 0', marginTop: -4, marginBottom: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', opacity: 0.7 }}>
                                      <X size={10} /> Retirer
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button className="btn btn-ghost" style={{ fontSize: '0.643rem', padding: '3px 8px', marginBottom: 'var(--space-sm)' }}
                                onClick={() => setNcFamilyAdults([...ncFamilyAdults, {}])}>
                                <Plus size={11} /> Ajouter un adulte
                              </button>
                              {/* Children */}
                              <div style={{ padding: 'var(--space-sm)', borderRadius: 'var(--radius-md)', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                  <h4 style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Baby size={12} /> Enfants</h4>
                                  <button className="btn btn-ghost" style={{ fontSize: '0.571rem', padding: '2px 6px' }}
                                    onClick={() => setNcChildren([...ncChildren, { name: '', birthYear: '' }])}><Plus size={10} /> Ajouter</button>
                                </div>
                                {ncChildren.length === 0 && <p style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: '4px 0' }}>Cliquez "Ajouter"</p>}
                                {ncChildren.map((child, idx) => (
                                  <div key={idx} style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3 }}>
                                    <input className="input" placeholder="Prénom" style={{ flex: 2, fontSize: '0.714rem' }} value={child.name}
                                      onChange={e => { const c = [...ncChildren]; c[idx] = { ...c[idx], name: e.target.value }; setNcChildren(c) }} />
                                    <input className="input" placeholder="Année" type="number" min="1990" max={currentYear} style={{ flex: 1, maxWidth: 60, fontSize: '0.714rem' }} value={child.birthYear}
                                      onChange={e => { const c = [...ncChildren]; c[idx] = { ...c[idx], birthYear: e.target.value }; setNcChildren(c) }} />
                                    <button onClick={() => setNcChildren(ncChildren.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 2 }}><X size={12} /></button>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)' }}>
                            <button className="btn btn-ghost" style={{ fontSize: '0.786rem' }} onClick={() => setWizardStep(0)}>← Retour</button>
                            <button className="btn btn-primary" style={{ fontSize: '0.786rem' }} disabled={!ncLastName.trim()} onClick={() => setWizardStep(2)}>Suivant →</button>
                          </div>
                        </div>
                      )}

                      {/* Step 2 — Suivi */}
                      {wizardStep === 2 && (
                        <div>
                          <div className="grid-2">
                            <div className="input-group">
                              <label style={{ fontSize: '0.714rem' }}>Phase de thérapie</label>
                              <select className="input" style={{ cursor: 'pointer', fontSize: '0.786rem' }}>
                                <option value="debut">Début</option>
                                <option value="analyse">Analyse</option>
                                <option value="integration">Intégration</option>
                              </select>
                            </div>
                            <div className="input-group">
                              <label style={{ fontSize: '0.714rem' }}>Source</label>
                              <select className="input" style={{ cursor: 'pointer', fontSize: '0.786rem' }}>
                                <option value="">Sélectionner...</option>
                                <option value="website">Site web</option>
                                <option value="phone">Appel</option>
                                <option value="referral">Recommandation</option>
                                <option value="other">Autre</option>
                              </select>
                            </div>
                          </div>
                          <div className="input-group" style={{ marginTop: 'var(--space-sm)' }}>
                            <label style={{ fontSize: '0.714rem' }}>Notes (optionnel)</label>
                            <textarea className="input" rows={2} placeholder="Contexte initial…" style={{ resize: 'vertical', fontSize: '0.786rem' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 'var(--space-sm)' }}>
                            <button className="btn btn-ghost" style={{ fontSize: '0.786rem' }} onClick={() => setWizardStep(1)}>← Retour</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

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
                          const c = mockCouples.find(cl => cl.id === s.coupleId)
                          return <div key={i} style={{ fontSize: '0.714rem', opacity: 0.85 }}>• {c ? getCoupleName(c) : 'Client'} à {formatTime(s.date)}</div>
                        })}
                        {otherSessionsSameDay.length > 3 && <div style={{ fontSize: '0.714rem', opacity: 0.7 }}>...et {otherSessionsSameDay.length - 3} autre(s)</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', padding: 'var(--space-md) var(--space-lg)', borderTop: '1px solid var(--border-light)' }}>
                <button className="btn btn-ghost" onClick={() => setShowNewSession(false)}>Annuler</button>
                <button
                  className="btn btn-accent"
                  disabled={(!newSessionClient || !newSessionDate || !newSessionTime) || (isNewClient && !ncLastName.trim())}
                  onClick={async () => {
                    const selectedDate = new Date(`${newSessionDate}T${newSessionTime}`)
                    if (selectedDate < new Date()) {
                      if (!confirm('La date choisie est dans le passé. Souhaitez-vous quand même créer cette séance ?')) return
                    }
                    
                    let clientId = newSessionClient
                    
                    if (isNewClient) {
                      // Create client in Supabase
                      const today = new Date().toISOString().split('T')[0]
                      const created = await createClient({
                        type: ncType || 'couple',
                        partnerA: { firstName: ncFirstName || '', lastName: ncLastName.trim() },
                        phase: 'prospect',
                        status: 'active',
                        startDate: today,
                      })
                      if (!created) { alert('Erreur lors de la création du client'); return }
                      clientId = created.id
                    }
                    
                    // Create session in Supabase
                    const sessionData = {
                      coupleId: clientId,
                      date: `${newSessionDate}T${newSessionTime}:00`,
                      status: 'scheduled',
                      title: newSessionNote || null,
                    }
                    await createSession(sessionData)
                    
                    setShowNewSession(false)
                    setNewSessionNote('')
                    resetWizard()
                    navigate(`/couples/${clientId}`)
                  }}
                >
                  <Plus size={16} /> {isNewClient ? 'Créer client + séance' : duplicate ? 'Ajouter quand même' : 'Créer la séance'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

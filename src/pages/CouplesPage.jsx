import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, User, TrendingUp, X, ArrowDownUp, ArrowUpAZ, Calendar, Globe, Phone, UserCheck, CheckCircle, XCircle, HelpCircle, Link2, Award, LayoutGrid, List, Star, Baby, Trash2, Briefcase, Sprout, UserPlus, CheckSquare, Square, Archive } from 'lucide-react'
// professionals removed — now from DataContext
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'
import { findDuplicateClients } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'
import ReferrerSection from '../components/client/ReferrerSection'



const sourceIcons = { website: Globe, phone: Phone, referral: UserCheck }

export default function CouplesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { clients, sessions, professionals, recruitmentSources, therapyPhases: therapyPhasesData, phaseIcons, phaseColors: centralPhaseColors, defaultPhaseKey, getPhaseColor, getPhaseIcon, isProspect, getCoupleName, getCoupleInitials, getPhaseLabel, getStatusLabel, getComputedStatus, getProspectStageInfo, formatDate, getClientType, createClient, updateClient, createProfessional: createPro } = useData()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('none')
  const [showModal, setShowModal] = useState(false)
  const [newSource, setNewSource] = useState('')
  const [newPhase, setNewPhase] = useState(therapyPhasesData[0]?.key || 'debut')

  const [referrerSearch, setReferrerSearch] = useState('')
  const [selectedReferrer, setSelectedReferrer] = useState(null)
  const [externalReferrer, setExternalReferrer] = useState(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'clients')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState('cards')
  const [selected, setSelected] = useState(new Set())
  const [archiving, setArchiving] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [newClientType, setNewClientType] = useState('')
  const [newChildren, setNewChildren] = useState([])
  const [newFamilyAdults, setNewFamilyAdults] = useState([{}])
  const [newLastName, setNewLastName] = useState('')
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastNameB, setNewLastNameB] = useState('')
  const [newFirstNameB, setNewFirstNameB] = useState('')
  const [newReferents, setNewReferents] = useState([0])
  const [duplicateDismissed, setDuplicateDismissed] = useState(false)
  const [billingAddress, setBillingAddress] = useState('')
  const [billingAddressB, setBillingAddressB] = useState('')
  const [createError, setCreateError] = useState(null)

  const duplicateMatches = useMemo(() => {
    if (duplicateDismissed || !newLastName.trim()) return []
    return findDuplicateClients({ firstName: newFirstName, lastName: newLastName }, clients, getCoupleName)
  }, [newFirstName, newLastName, clients, duplicateDismissed])
  // Auto-open new client modal from URL param
  useEffect(() => {
    if (searchParams.get('newClient') === '1') {
      setShowModal(true)
      // Pre-fill from proRef if coming from Réseau Pro
      const proRefParam = searchParams.get('proRef')
      if (proRefParam) {
        try {
          const proRef = JSON.parse(decodeURIComponent(proRefParam))
          setNewSource('parrainage')
          setExternalReferrer({
            referrerType: 'professionnel',
            firstName: proRef.firstName || '',
            lastName: proRef.lastName || '',
            proId: proRef.proId || null
          })
        } catch (e) { /* ignore parse error */ }
      }
    }
  }, [searchParams])

  const activeClients = clients.filter(c => !c.deleted)
  const prospectCount = activeClients.filter(c => isProspect(c)).length
  const clientCount = activeClients.filter(c => c.phase !== 'prospect').length

  // Compute next/last session from real session data
  const now = new Date()
  const sessionsByCouple = {}
  sessions.forEach(s => {
    if (s.status === 'cancelled') return
    if (!sessionsByCouple[s.coupleId]) sessionsByCouple[s.coupleId] = { past: [], future: [] }
    const d = new Date(s.date)
    if (d <= now) sessionsByCouple[s.coupleId].past.push(s)
    else sessionsByCouple[s.coupleId].future.push(s)
  })
  const getNextSession = (coupleId) => {
    const s = sessionsByCouple[coupleId]
    if (!s || s.future.length === 0) return null
    return s.future.sort((a, b) => a.date.localeCompare(b.date))[0].date
  }
  const getLastSession = (coupleId) => {
    const s = sessionsByCouple[coupleId]
    if (!s || s.past.length === 0) return null
    return s.past.sort((a, b) => b.date.localeCompare(a.date))[0].date
  }

  let filtered = activeClients
    .filter(c => activeTab === 'prospects' ? isProspect(c) : !isProspect(c))
    .filter(c => getCoupleName(c).toLowerCase().includes(search.toLowerCase()))

  if (statusFilter === 'individual') {
    filtered = filtered.filter(c => getClientType(c) === 'individual')
  } else if (statusFilter === 'couple') {
    filtered = filtered.filter(c => getClientType(c) === 'couple')
  } else if (statusFilter === 'family') {
    filtered = filtered.filter(c => getClientType(c) === 'family')
  } else if (statusFilter === 'parrains') {
    filtered = filtered.filter(c => (c.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'parrain'))
  } else if (statusFilter === 'filleuls') {
    filtered = filtered.filter(c => (c.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul'))
  } else if (statusFilter !== 'all') {
    filtered = filtered.filter(c => getComputedStatus(c) === statusFilter)
  }

  if (sortMode === 'alpha-asc') {
    filtered = [...filtered].sort((a, b) => (a.partnerA?.lastName || '').localeCompare(b.partnerA?.lastName || '', 'fr'))
  } else if (sortMode === 'alpha-desc') {
    filtered = [...filtered].sort((a, b) => (b.partnerA?.lastName || '').localeCompare(a.partnerA?.lastName || '', 'fr'))
  } else if (sortMode === 'recent') {
    filtered = [...filtered].sort((a, b) => {
      const dateA = activeTab === 'prospects' ? (a.startDate || '') : (a.lastSession || '')
      const dateB = activeTab === 'prospects' ? (b.startDate || '') : (b.lastSession || '')
      return dateB.localeCompare(dateA)
    })
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mes Clients</h1>
        <button className="btn btn-accent" onClick={() => { setWizardStep(0); setNewClientType(''); setNewChildren([]); setShowModal(true) }}>
          <Plus size={18} /> Nouveau client
        </button>
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>
          <Users size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> Clients ({clientCount})
        </button>
        <button className={`tab ${activeTab === 'prospects' ? 'active' : ''}`} onClick={() => setActiveTab('prospects')}>
          <UserPlus size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> Prospects ({prospectCount})
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
        {[['all', 'Tous'], ['active', 'Actifs'], ['inactive', 'Inactifs']].map(([val, label]) => (
          <button
            key={val}
            className={`btn ${statusFilter === val ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(val)}
            style={{ fontSize: '0.857rem', padding: '4px 12px' }}
          >
            {label}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--primary-300)', margin: '0 4px' }} />
        {[['individual', 'Individuel'], ['couple', 'Couple'], ['family', 'Famille']].map(([val, label]) => (
          <button
            key={val}
            className={`btn ${statusFilter === val ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(statusFilter === val ? 'all' : val)}
            style={{ fontSize: '0.857rem', padding: '4px 12px' }}
          >
            {label}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--primary-300)', margin: '0 4px' }} />
        <button
          className={`btn ${statusFilter === 'parrains' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter(statusFilter === 'parrains' ? 'all' : 'parrains')}
          style={{ fontSize: '0.857rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Award size={14} /> Parrains
        </button>
        <button
          className={`btn ${statusFilter === 'filleuls' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter(statusFilter === 'filleuls' ? 'all' : 'filleuls')}
          style={{ fontSize: '0.857rem', padding: '4px 12px' }}
        >
          Filleuls
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div className="search-input" style={{ flex: 1 }}>
          <Search />
          <input
            className="input"
            placeholder={activeTab === 'prospects' ? 'Rechercher un prospect...' : 'Rechercher un client...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`btn ${sortMode === 'alpha-asc' || sortMode === 'alpha-desc' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'none' || sortMode === 'recent' ? 'alpha-asc' : sortMode === 'alpha-asc' ? 'alpha-desc' : 'none')}
          title="Trier par nom de famille"
        >
          <ArrowUpAZ size={18} /> {sortMode === 'alpha-desc' ? 'Z→A' : 'A→Z'}
        </button>
        <button
          className={`btn ${sortMode === 'recent' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'recent' ? 'none' : 'recent')}
          title="Trier par dernier rendez-vous"
        >
          <ArrowDownUp size={18} /> Plus récent
        </button>
        <span style={{ width: 1, height: 28, background: 'var(--border-light)', margin: '0 2px' }} />
        <button
          className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('cards')}
          title="Vue cartes"
          style={{ padding: '6px 8px' }}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('list')}
          title="Vue liste"
          style={{ padding: '6px 8px' }}
        >
          <List size={18} />
        </button>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid-3">
          {filtered.map(couple => {
            const PhaseIcon = getPhaseIcon(couple.phase)
            return (
              <div className={`card card-clickable ${getComputedStatus(couple) === 'inactive' || getComputedStatus(couple) === 'completed' ? 'card-inactive' : ''}`} key={couple.id} onClick={() => navigate(`/couples/${couple.id}`)} style={{ position: 'relative' }}>
                {(() => {
                  const cType = getClientType(couple)
                  if (cType === 'individual') return <User size={20} style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-tertiary)', opacity: 0.5 }} title="Individuel" />
                  if (cType === 'family') return (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: 12, right: 12, opacity: 0.5 }} title="Famille">
                      <circle cx="7" cy="6" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="12" cy="9" r="2" />
                      <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20" />
                      <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
                    </svg>
                  )
                  return <Users size={20} style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-tertiary)', opacity: 0.5 }} title="Couple" />
                })()}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <div className="couple-avatar" style={{ width: 48, height: 48, fontSize: '1rem', ...(getComputedStatus(couple) === 'inactive' || couple.phase === 'completed' ? { background: 'var(--primary-200)', color: 'var(--text-inverse)' } : couple.phase === 'prospect' ? { background: '#E8D8FE', color: '#6B46C1' } : {}) }}>
                    {getCoupleInitials(couple)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: 2 }}>{getCoupleName(couple)}</h3>
                    <p style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
                      {`Premier contact : ${formatDate(couple.startDate)}`}
                    </p>
                  </div>
                </div>

                {couple.phase !== 'prospect' && couple.phase !== 'completed' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                      {(() => {
                        const pc = getPhaseColor(couple.phase)
                        return (<>
                          <div style={{
                            width: 32, height: 32, borderRadius: 'var(--radius-full)',
                            background: pc.bg, color: pc.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <PhaseIcon size={16} />
                          </div>
                          <span style={{ fontSize: '0.786rem', fontWeight: 600, color: pc.color }}>{getPhaseLabel(couple.phase)}</span>
                        </>)
                      })()}
                      {(getComputedStatus(couple) === 'completed' || couple.status === 'completed') && (
                        <span className="badge badge-status-completed">
                          <CheckCircle size={12} />
                          {getStatusLabel('completed')}
                        </span>
                      )}
                    </div>
                    <span className="caption" style={{ color: 'var(--text-secondary)' }}>
                      {`${couple.sessionsCount}/${couple.totalSessions} séances`}
                    </span>
                  </div>
                )}



                {couple.phase !== 'prospect' && (() => {
                  const therapyPhases = therapyPhasesData.map(tp => tp.key)
                  const nowStr = new Date().toISOString()
                  const coupleSessions = sessions.filter(s => s.coupleId === couple.id && s.status !== 'cancelled')
                  const doneByPhase = {}
                  const schedByPhase = {}
                  therapyPhases.forEach(p => {
                    doneByPhase[p] = coupleSessions.filter(s => s.phase === p && s.status !== 'scheduled' && s.date <= nowStr).length
                    schedByPhase[p] = coupleSessions.filter(s => s.phase === p && s.status === 'scheduled').length
                  })
                  const totalAssigned = therapyPhases.reduce((sum, p) => sum + (doneByPhase[p] || 0) + (schedByPhase[p] || 0), 0)
                  const barBase = Math.max(couple.totalSessions || 1, totalAssigned)
                  return (
                    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#E2E8F0' }}>
                      {therapyPhases.map(p => {
                        const done = doneByPhase[p] || 0
                        const sched = schedByPhase[p] || 0
                        if (done + sched === 0) return null
                        const pc = getPhaseColor(p)
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
                  )
                })()}

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
                  {couple.phase === 'prospect' && couple.source ? (() => {
                    const SourceIcon = sourceIcons[couple.source] || Globe
                    return (<>
                      <SourceIcon size={14} style={{ color: '#6B46C1' }} />
                      <span className="caption" style={{ color: 'var(--text-secondary)' }}>
                        Source : {(() => { if (couple.referrerType === 'particulier') return 'Parrain externe'; const hasExternalParrain = (couple.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul' && (() => { const ref = clients.find(c => c.id === l.clientId); return ref?.referrerType === 'particulier' })()); return hasExternalParrain ? 'Parrain externe' : (recruitmentSources.find(s => s.key === couple.source) || {}).label || couple.source })()}
                      </span>
                    </>)
                  })() : couple.phase === 'prospect' && !couple.source ? (<>
                    <HelpCircle size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="caption" style={{ color: 'var(--text-tertiary)' }}>
                      Source non renseignée
                    </span>
                  </>) : (<>
                    <Calendar size={14} style={{ color: getComputedStatus(couple) === 'inactive' || couple.phase === 'completed' ? 'var(--text-tertiary)' : 'var(--primary-500)' }} />
                    <span className="caption" style={{ color: getComputedStatus(couple) === 'inactive' || couple.phase === 'completed' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
                      {getComputedStatus(couple) === 'inactive' || couple.phase === 'completed'
                        ? (getLastSession(couple.id) ? `Dernier RDV : ${formatDate(getLastSession(couple.id))}` : 'Aucun RDV')
                        : (getNextSession(couple.id) ? `Prochain RDV : ${formatDate(getNextSession(couple.id))}` : getLastSession(couple.id) ? `Dernier RDV : ${formatDate(getLastSession(couple.id))}` : 'Aucun RDV')
                      }
                    </span>
                  </>)}
                </div>

                {/* Client links (parrainage + dossier) */}
                {(couple.clientLinks || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {(couple.clientLinks || []).map((link, idx) => {
                      const linked = clients.find(c => c.id === link.clientId)
                      if (!linked) return null
                      const isDossier = link.type === 'dossier'
                      const color = isDossier ? '#6366F1' : '#8B5CF6'
                      const bg = isDossier ? '#EEF2FF' : '#F5F0FF'
                      const roleLabel = link.type === 'parrainage' && link.role ? (link.role === 'parrain' ? 'Parrain de' : 'Filleul de') : 'Lié à'
                      const Icon = isDossier ? Link2 : Award
                      return (
                        <div key={idx}
                          onClick={e => { e.stopPropagation(); navigate(`/couples/${linked.id}`) }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                            background: bg, fontSize: '0.643rem', fontWeight: 500, color,
                            cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${color}15`
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = color + '25'}
                          onMouseLeave={e => e.currentTarget.style.background = bg}
                          title={`${roleLabel} ${getCoupleName(linked)} — cliquer pour ouvrir`}
                        >
                          <Icon size={10} />
                          {roleLabel} {getCoupleName(linked)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (<>
        {/* LIST VIEW */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.857rem' }}>
            <thead>
              <tr style={{ background: 'var(--primary-50)', textAlign: 'left' }}>
                <th style={{ padding: '10px 8px 10px 14px', width: 36 }}>
                  <button
                    onClick={() => {
                      if (selected.size === filtered.length) setSelected(new Set())
                      else setSelected(new Set(filtered.map(c => c.id)))
                    }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: selected.size === filtered.length && filtered.length > 0 ? 'var(--primary-600)' : 'var(--text-tertiary)' }}
                    title={selected.size === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  >
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nom</th>
                {activeTab === 'clients' ? (<>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phase</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Séances</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dernier RDV</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prochain RDV</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Parrain de</th>
                </>) : (<>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Premier contact</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Source</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.714rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommandé par</th>
                </>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(couple => {
                const PhaseIcon = getPhaseIcon(couple.phase)
                const pc = getPhaseColor(couple.phase)?.color || 'var(--primary-600)'
                const referrals = clients.filter(c => c.referredBy === couple.id)
                const referrer = couple.referredBy ? clients.find(c => c.id === couple.referredBy) : null
                const isChecked = selected.has(couple.id)
                return (
                  <tr
                    key={couple.id}
                    onClick={() => navigate(`/couples/${couple.id}`)}
                    style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background 0.1s', background: isChecked ? 'var(--primary-50)' : 'transparent' }}
                    onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'var(--primary-50)' }}
                    onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}
                  >
                    <td style={{ padding: '10px 8px 10px 14px', width: 36 }}>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); s.has(couple.id) ? s.delete(couple.id) : s.add(couple.id); return s }) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: isChecked ? 'var(--primary-600)' : 'var(--text-tertiary)' }}
                      >
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                      </button>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="couple-avatar" style={{ width: 32, height: 32, fontSize: '0.714rem', ...(getComputedStatus(couple) === 'inactive' || couple.phase === 'completed' ? { background: 'var(--primary-200)', color: 'white' } : couple.phase === 'prospect' ? { background: '#E8D8FE', color: '#6B46C1' } : {}) }}>
                          {getCoupleInitials(couple)}
                        </div>
                        {getCoupleName(couple)}
                        {!couple.partnerB && <User size={14} style={{ color: 'var(--text-tertiary)' }} />}
                      </div>
                    </td>
                    {activeTab === 'clients' ? (<>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PhaseIcon size={14} style={{ color: pc }} />
                          <span style={{ color: pc, fontWeight: 500, fontSize: '0.786rem' }}>{couple.phase === 'completed' ? 'Terminé' : getPhaseLabel(couple.phase)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{couple.sessionsCount}/{couple.totalSessions}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{getLastSession(couple.id) ? formatDate(getLastSession(couple.id)) : '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{getNextSession(couple.id) ? formatDate(getNextSession(couple.id)) : '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {referrals.length > 0 ? (
                          <span style={{ color: '#6B46C1', fontWeight: 500, fontSize: '0.786rem' }}>
                            <Award size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                            {referrals.map(r => getCoupleName(r)).join(', ')}
                          </span>
                        ) : '—'}
                      </td>
                    </>) : (<>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{formatDate(couple.startDate)}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{(() => { if (couple.referrerType === 'particulier') return 'Parrain externe'; const hasExternalParrain = (couple.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul' && (() => { const ref = clients.find(c => c.id === l.clientId); return ref?.referrerType === 'particulier' })()); return hasExternalParrain ? 'Parrain externe' : (recruitmentSources.find(s => s.key === couple.source) || {}).label || couple.source || '—' })()}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {referrer ? (
                          <span style={{ color: '#6B46C1', fontWeight: 500, fontSize: '0.786rem' }}>
                            <Link2 size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                            {getCoupleName(referrer)}
                          </span>
                        ) : '—'}
                      </td>
                    </>)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Floating bulk action bar */}
        {selected.size > 0 && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
            padding: '12px 24px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-light)',
            zIndex: 100,
            animation: 'bulkBarIn 0.2s ease-out'
          }}>
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <div style={{ width: 1, height: 20, background: 'var(--border-light)' }} />
            <button
              onClick={() => setSelected(new Set())}
              className="btn btn-ghost"
              style={{ fontSize: '0.786rem', padding: '5px 10px' }}
            >
              Désélectionner
            </button>
            <button
              onClick={async () => {
                const count = selected.size
                if (!await confirm(`Archiver ${count} client${count > 1 ? 's' : ''} ?\n\nIls seront déplacés dans « Clients archivés » et pourront être restaurés.`)) return
                setArchiving(true)
                try {
                  for (const id of selected) {
                    await updateClient(id, { deletedAt: new Date().toISOString() })
                  }
                  setSelected(new Set())
                } catch (err) {
                  console.error('Bulk archive error:', err)
                  await confirm('Erreur lors de l\'archivage.', { variant: 'alert' })
                } finally {
                  setArchiving(false)
                }
              }}
              disabled={archiving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 'var(--radius-md)',
                fontSize: '0.857rem', fontWeight: 700,
                background: '#DC2626', color: 'white',
                border: 'none', cursor: archiving ? 'wait' : 'pointer',
                transition: 'all 0.15s',
                opacity: archiving ? 0.6 : 1
              }}
            >
              <Archive size={15} />
              {archiving ? 'Archivage...' : 'Archiver'}
            </button>
          </div>
        )}
        <style>{`@keyframes bulkBarIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      </>)}

      {/* Modal Nouveau Client — Wizard 3 étapes */}
      {showModal && (() => {
        const STEP_COUNT = 3
        const stepLabels = ['Type', 'Identité', 'Suivi']
        const currentYear = new Date().getFullYear()

        // Helper: render adult fields with referent toggle
        const renderAdultBlock = (title, idx) => (
          <div style={{
            padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
            background: 'var(--primary-50)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
              <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} /> {title}
              </h4>
              {newClientType !== 'individual' && (() => {
                const isRef = newReferents.includes(idx)
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (isRef) {
                        if (newReferents.length > 1) setNewReferents(newReferents.filter(r => r !== idx))
                      } else {
                        setNewReferents([...newReferents, idx])
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
                <input className="input" placeholder="Prénom" value={idx === 0 ? newFirstName : newFirstNameB} onChange={idx === 0 ? e => { setNewFirstName(e.target.value); setDuplicateDismissed(false) } : e => setNewFirstNameB(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label-required">Nom</label>
                {idx === 0 ? (
                  <input className={`input${!newLastName.trim() ? ' input-required' : ''}`} placeholder="Nom" value={newLastName} onChange={e => { setNewLastName(e.target.value); setDuplicateDismissed(false) }} />
                ) : (
                  <input className={`input${!newLastNameB.trim() ? ' input-required' : ''}`} placeholder="Nom" value={newLastNameB} onChange={e => setNewLastNameB(e.target.value)} />
                )}
              </div>
            </div>
            {idx === 0 && duplicateMatches.length > 0 && (
              <DuplicateAlert
                matches={duplicateMatches}
                onView={(id) => { setShowModal(false); navigate(`/couples/${id}`) }}
                onDismiss={() => setDuplicateDismissed(true)}
                formatDate={formatDate}
                getPhaseLabel={getPhaseLabel}
                getPhaseColor={getPhaseColor}
              />
            )}
            <div className="grid-2">
              <div className="input-group">
                <label>Email</label>
                <input className="input" type="email" placeholder="email@exemple.com" />
              </div>
              <div className="input-group">
                <label>Téléphone</label>
                <input className="input" type="tel" placeholder="06 12 34 56 78" />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  Date de naissance
                  <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                </label>
                <input className="input" type="date" style={{ colorScheme: 'light' }} />
              </div>
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  ou Année
                  <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                </label>
                <input className="input" type="number" min="1920" max={currentYear} placeholder={`ex. ${currentYear - 35}`}
                  onBlur={e => { if (e.target.value && parseInt(e.target.value) > currentYear) e.target.value = currentYear }}
                />
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                Adresse de facturation
                <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
              </label>
              <textarea className="input" rows={2} placeholder="Adresse complète pour la facturation…" value={idx === 0 ? billingAddress : billingAddressB} onChange={idx === 0 ? e => setBillingAddress(e.target.value) : e => setBillingAddressB(e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        )

        return (
          <div className="modal-overlay">
            <div style={{
              width: '100%', maxWidth: 580,
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              animation: 'ncFadeIn 0.3s ease-out'
            }}>
              {/* Header context */}
              <div style={{
                padding: '16px 32px 0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <h2 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Nouveau client</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
                  <X size={20} />
                </button>
              </div>

              {/* Stepper bar */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
                padding: '12px 32px 0'
              }}>
                {stepLabels.map((label, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      onClick={() => { if (i < wizardStep || (i === 1 && newClientType)) setWizardStep(i) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '5px 14px',
                        borderBottom: i === wizardStep ? '2px solid var(--accent-main)' : '2px solid transparent',
                        cursor: (i < wizardStep || (i === 1 && newClientType)) ? 'pointer' : 'default',
                        transition: 'all 0.2s', opacity: (i <= wizardStep || newClientType) ? 1 : 0.4
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: 'var(--radius-sm)',
                        background: i < wizardStep ? 'var(--accent-main)' : i === wizardStep ? 'var(--accent-bg)' : 'var(--primary-50)',
                        color: i < wizardStep ? 'white' : i === wizardStep ? 'var(--accent-main)' : 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.714rem', fontWeight: 700, transition: 'all 0.2s'
                      }}>
                        {i < wizardStep ? '✓' : i + 1}
                      </div>
                      <span style={{
                        fontSize: '0.786rem', fontWeight: 600,
                        color: i === wizardStep ? 'var(--accent-main)' : i < wizardStep ? 'var(--accent-dark)' : 'var(--text-tertiary)',
                      }}>{label}</span>
                    </div>
                    {i < STEP_COUNT - 1 && (
                      <div style={{
                        width: 20, height: 1,
                        background: i < wizardStep ? 'var(--accent-main)' : 'var(--border-light)',
                        transition: 'background 0.3s'
                      }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Content */}
              <div style={{ padding: '24px 32px 16px', minHeight: 280, maxHeight: 480, overflowY: 'auto' }}>
                <div key={wizardStep} style={{ animation: 'ncSlideIn 0.25s ease-out' }}>

                  {/* Step 0: Type selection */}
                  {wizardStep === 0 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Type d'accompagnement
                      </h3>
                      <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>
                        Sélectionnez le cadre thérapeutique
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                        {[
                          { key: 'individual', icon: 'user', label: 'Individuel', desc: '1 personne', color: '#6366F1', bg: '#EEF2FF' },
                          { key: 'couple', icon: 'users', label: 'Couple', desc: '2 partenaires', color: '#EC4899', bg: '#FDF2F8' },
                          { key: 'family', icon: 'family', label: 'Famille', desc: 'Adultes + enfants', color: '#F59E0B', bg: '#FFFBEB' }
                        ].map(t => (
                          <div
                            key={t.key}
                            onClick={() => { setNewClientType(t.key); setWizardStep(1) }}
                            style={{
                              padding: 'var(--space-lg) var(--space-md)',
                              borderRadius: 'var(--radius-lg)',
                              border: `2px solid ${newClientType === t.key ? t.color : 'transparent'}`,
                              background: newClientType === t.key ? t.bg : 'var(--bg-card)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.2s',
                              transform: newClientType === t.key ? 'scale(1.03)' : 'scale(1)'
                            }}
                            onMouseEnter={e => { if (newClientType !== t.key) { e.currentTarget.style.borderColor = t.color + '60'; e.currentTarget.style.background = t.bg + '80' } }}
                            onMouseLeave={e => { if (newClientType !== t.key) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-card)' } }}
                          >
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              margin: '0 auto 10px', height: 52
                            }}>
                              {t.icon === 'user' && <User size={36} color={t.color} />}
                              {t.icon === 'users' && <Users size={36} color={t.color} />}
                              {t.icon === 'family' && (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  {/* Adult left */}
                                  <circle cx="7" cy="5" r="2.2" fill={t.color} />
                                  <path d="M4 19v-4.5c0-1.7 1.3-3 3-3s3 1.3 3 3V19" stroke={t.color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                                  {/* Adult right */}
                                  <circle cx="17" cy="5" r="2.2" fill={t.color} />
                                  <path d="M14 19v-4.5c0-1.7 1.3-3 3-3s3 1.3 3 3V19" stroke={t.color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                                  {/* Child center */}
                                  <circle cx="12" cy="9" r="1.7" fill={t.color} />
                                  <path d="M9.8 19v-3.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2V19" stroke={t.color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
                                </svg>
                              )}
                            </div>
                            <div style={{ fontSize: '0.929rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{t.label}</div>
                            <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>{t.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 1: Identity */}
                  {wizardStep === 1 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {newClientType === 'individual' ? 'Informations du client' : newClientType === 'couple' ? 'Les partenaires' : 'La famille'}
                      </h3>
                      {newClientType !== 'individual' && (
                        <p style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={9} color="var(--text-tertiary)" /> Référent = interlocuteur principal pour la communication et le suivi financier
                        </p>
                      )}

                      {/* Adults — Individual */}
                      {newClientType === 'individual' && renderAdultBlock('Client', 0)}

                      {/* Adults — Couple (fixed 2) */}
                      {newClientType === 'couple' && (
                        <>
                          {renderAdultBlock('Partenaire A', 0)}
                          {renderAdultBlock('Partenaire B', 1)}
                        </>
                      )}

                      {/* Adults — Family (dynamic) */}
                      {newClientType === 'family' && (
                        <>
                          {newFamilyAdults.map((_, idx) => {
                            const isRef = newReferents.includes(idx)
                            const canRemove = newFamilyAdults.length > 1 && !isRef
                            return (
                              <div key={`fam-adult-${idx}`} style={{ position: 'relative' }}>
                                {renderAdultBlock(`Adulte ${idx + 1}`, idx)}
                                {newFamilyAdults.length > 1 && (
                                  <button
                                    onClick={() => {
                                      if (!canRemove) return
                                      setNewFamilyAdults(newFamilyAdults.filter((_, i) => i !== idx))
                                      setNewReferents(newReferents.filter(r => r !== idx).map(r => r > idx ? r - 1 : r))
                                    }}
                                    disabled={!canRemove}
                                    title={isRef ? 'Impossible de supprimer un référent' : 'Retirer cet adulte'}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 4,
                                      fontSize: '0.643rem', fontWeight: 500,
                                      padding: '2px 0', marginTop: -8, marginBottom: 'var(--space-sm)',
                                      background: 'none', border: 'none',
                                      cursor: canRemove ? 'pointer' : 'not-allowed',
                                      color: canRemove ? 'var(--error)' : 'var(--text-tertiary)',
                                      opacity: canRemove ? 0.7 : 0.3,
                                      transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={e => { if (canRemove) e.currentTarget.style.opacity = '1' }}
                                    onMouseLeave={e => { if (canRemove) e.currentTarget.style.opacity = '0.7' }}
                                  >
                                    <Trash2 size={11} /> Retirer cet adulte
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.714rem', padding: '4px 10px', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setNewFamilyAdults([...newFamilyAdults, {}])}
                          >
                            <Plus size={13} /> Ajouter un adulte
                          </button>
                        </>
                      )}

                      {/* Children (family only) */}
                      {newClientType === 'family' && (
                        <div style={{
                          padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                          background: '#FFFBEB', border: '1px solid #FDE68A'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                            <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Baby size={14} /> Enfants
                            </h4>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: '0.714rem', padding: '3px 8px' }}
                              onClick={() => setNewChildren([...newChildren, { name: '', birthYear: '' }])}
                            >
                              <Plus size={13} /> Ajouter
                            </button>
                          </div>
                          {newChildren.length === 0 && (
                            <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-sm) 0' }}>
                              Cliquez "Ajouter" pour ajouter un enfant
                            </p>
                          )}
                          {newChildren.map((child, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                              <input
                                className="input" placeholder="Prénom" style={{ flex: 2 }}
                                value={child.name}
                                onChange={e => {
                                  const c = [...newChildren]; c[idx] = { ...c[idx], name: e.target.value }; setNewChildren(c)
                                }}
                              />
                              <input
                                className="input" placeholder="Année" type="number" min="1990" max={currentYear}
                                style={{ flex: 1, maxWidth: 80 }}
                                value={child.birthYear}
                                onChange={e => {
                                  const val = e.target.value
                                  const c = [...newChildren]; c[idx] = { ...c[idx], birthYear: val && parseInt(val) > currentYear ? String(currentYear) : val }; setNewChildren(c)
                                }}
                              />
                              {child.birthYear && !isNaN(child.birthYear) && (
                                <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 30 }}>
                                  {currentYear - parseInt(child.birthYear)} ans
                                </span>
                              )}
                              <button
                                onClick={() => setNewChildren(newChildren.filter((_, i) => i !== idx))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2: Therapy info */}
                  {wizardStep === 2 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Informations de suivi
                      </h3>
                      <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>
                        Stade d'avancement et contexte
                      </p>

                      <div className="grid-2">
                        <div className="input-group">
                          <label>Phase de la thérapie</label>
                          <div style={{
                            padding: '8px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)',
                            border: '1px solid #E8D8FE', fontSize: '0.786rem', color: '#6B46C1', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            <UserPlus size={14} />
                            Prospect
                            <span style={{ fontWeight: 400, fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 4 }}>
                              Évoluera automatiquement à la 1ère séance payée
                            </span>
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Source du prospect</label>
                          <select className="input" style={{ cursor: 'pointer' }} value={newSource} onChange={e => setNewSource(e.target.value)}>
                            <option value="">Sélectionner...</option>
                            {recruitmentSources.map(s => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {(newSource === 'referral' || newSource === 'parrainage') && (
                        <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                          <label className="label-required">Orienté par</label>
                          <ReferrerSection
                            externalReferrer={externalReferrer}
                            setExternalReferrer={setExternalReferrer}
                            selectedReferrer={selectedReferrer}
                            setSelectedReferrer={setSelectedReferrer}
                            referrerSearch={referrerSearch}
                            setReferrerSearch={setReferrerSearch}
                            clients={clients}
                            professionals={professionals}
                            getCoupleName={getCoupleName}
                            formatDate={formatDate}
                            getPhaseLabel={getPhaseLabel}
                            getPhaseColor={getPhaseColor}
                            onNavigate={(id) => { setShowModal(false); navigate(`/couples/${id}`) }}
                            onLink={(item, refType) => {
                              if (refType === 'professionnel') {
                                // Pro linked — will be handled at save time
                                setExternalReferrer({ ...externalReferrer, linkedProId: item.id, referrerType: 'professionnel' })
                              } else {
                                setSelectedReferrer(item)
                              }
                            }}
                            coupleId={null}
                          />
                        </div>
                      )}



                      <div className="input-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label>Notes (optionnel)</label>
                        <textarea className="input" rows={3} placeholder="Contexte initial, motif de consultation..." style={{ resize: 'vertical' }} />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Creation error message */}
              {createError && (
                <div style={{ padding: '8px 32px 0', animation: 'ncSlideIn 0.25s ease-out' }}>
                  <div style={{ padding: '8px 12px', background: '#FFF5F5', borderRadius: 'var(--radius-md)', border: '1px solid #FED7D7', fontSize: '0.786rem', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠ {createError}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 32px 18px',
                borderTop: '1px solid var(--border-light)'
              }}>
                <div>
                  {wizardStep > 0 ? (
                    <button onClick={() => setWizardStep(wizardStep - 1)} className="btn btn-ghost"
                      style={{ fontSize: '0.786rem', padding: '6px 12px' }}
                    >
                      ← Précédent
                    </button>
                  ) : (
                    <button onClick={() => setShowModal(false)}
                      style={{
                        fontSize: '0.786rem', fontWeight: 500, color: 'var(--text-tertiary)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px',
                        fontFamily: 'var(--font-family)'
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
                {wizardStep < STEP_COUNT - 1 ? (
                  <button
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="btn btn-accent"
                    style={{ fontSize: '0.857rem', padding: '8px 18px', opacity: (wizardStep === 0 && !newClientType) || (wizardStep === 1 && !newLastName.trim()) ? 0.4 : 1 }}
                    disabled={(wizardStep === 0 && !newClientType) || (wizardStep === 1 && !newLastName.trim())}
                  >
                    Suivant →
                  </button>
                ) : (
                  <button
                    className="btn btn-accent"
                    style={{
                      fontSize: '0.857rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6,
                      opacity: ((newSource === 'referral' || newSource === 'parrainage') && !selectedReferrer && (!externalReferrer || !(externalReferrer.lastName || '').trim())) ? 0.4 : 1
                    }}
                    disabled={(newSource === 'referral' || newSource === 'parrainage') && !selectedReferrer && (!externalReferrer || !(externalReferrer.lastName || '').trim())}
                    onClick={async () => {
                      setCreateError(null)
                      try {
                        const today = new Date().toISOString().split('T')[0]
                        // Build new client object
                        const newClient = {
                          type: newClientType || 'couple',
                          partnerA: {
                            firstName: newFirstName || '',
                            lastName: newLastName.trim().toUpperCase(),
                            billingAddress: billingAddress.trim() || null,
                          },
                          ...(newClientType !== 'individual' && newLastNameB.trim() ? {
                            partnerB: {
                              firstName: newFirstNameB || '',
                              lastName: newLastNameB.trim().toUpperCase(),
                              billingAddress: billingAddressB.trim() || null,
                            }
                          } : {}),
                          phase: 'prospect',
                          source: newSource || null,
                          status: 'active',
                          startDate: today,
                        }
                        // Save to Supabase
                        const created = await createClient(newClient)

                        if (!created) {
                          setCreateError('Erreur lors de la création du client. Vérifiez votre connexion et réessayez.')
                          return
                        }

                        // Handle referrer → create clientLinks
                        if (selectedReferrer) {
                          // Client referrer — bidirectional links
                          const filleulLinks = [{ clientId: selectedReferrer.id, type: 'parrainage', role: 'filleul' }]
                          await updateClient(created.id, { clientLinks: filleulLinks, source: newSource || 'referral' })
                          const parrainLinks = [...(selectedReferrer.clientLinks || []), { clientId: created.id, type: 'parrainage', role: 'parrain' }]
                          await updateClient(selectedReferrer.id, { clientLinks: parrainLinks })
                        } else if (externalReferrer && externalReferrer.lastName && externalReferrer.lastName.trim()) {
                          const refType = externalReferrer.referrerType || 'particulier'
                          if (refType === 'particulier') {
                            // Create the external referrer as a prospect client
                            const refClient = await createClient({
                              type: 'individual',
                              partnerA: {
                                firstName: externalReferrer.firstName || '',
                                lastName: externalReferrer.lastName.trim().toUpperCase(),
                                email: externalReferrer.email || '',
                                phone: externalReferrer.phone || ''
                              },
                              phase: 'prospect',
                              status: 'active',
                              startDate: today,
                            })
                            if (refClient) {
                              // Bidirectional links
                              await updateClient(created.id, { clientLinks: [{ clientId: refClient.id, type: 'parrainage', role: 'filleul' }], externalReferrer, source: newSource || 'referral' })
                              await updateClient(refClient.id, { clientLinks: [{ clientId: created.id, type: 'parrainage', role: 'parrain' }] })
                            }
                          } else {
                            // Professionnel externe → créer dans Supabase professionals + lien parrainage-pro
                            const today2 = new Date().toISOString().split('T')[0]
                            const proName = `${externalReferrer.firstName || ''} ${externalReferrer.lastName || ''}`.trim()
                            // Check if this pro already exists
                            const existingPro = professionals.find(p =>
                              p.lastName?.toUpperCase() === externalReferrer.lastName?.trim().toUpperCase() &&
                              (p.firstName || '').toLowerCase() === (externalReferrer.firstName || '').toLowerCase()
                            )
                            let proId
                            if (existingPro) {
                              // Update existing pro with referral
                              const updatedReferrals = [...(existingPro.referrals || [])]
                              if (!updatedReferrals.some(r => r.clientId === created.id)) {
                                updatedReferrals.push({ clientId: created.id, date: today2, clientName: `${newFirstName} ${newLastName}`.trim() })
                              }
                              proId = existingPro.id
                            } else {
                              // Create new professional
                              const newPro = await createPro({
                                firstName: externalReferrer.firstName || '',
                                lastName: externalReferrer.lastName.trim().toUpperCase(),
                                email: externalReferrer.email || '',
                                phone: externalReferrer.phone || '',
                                note: externalReferrer.role || '',
                                referrals: [{ clientId: created.id, date: today2, clientName: `${newFirstName} ${newLastName}`.trim() }]
                              })
                              proId = newPro?.id
                            }
                            await updateClient(created.id, {
                              clientLinks: [{ type: 'parrainage-pro', proId: proId || undefined, proName, role: 'filleul' }],
                              externalReferrer: { ...externalReferrer, referrerType: 'professionnel' },
                              source: newSource || 'referral'
                            })
                          }
                        }

                        setShowModal(false); setWizardStep(0); setNewClientType(''); setNewChildren([]); setNewFamilyAdults([{}]); setNewLastName(''); setNewFirstName(''); setNewReferents([0]); setSelectedReferrer(null); setReferrerSearch(''); setExternalReferrer(null); setCreateError(null); setNewPhase(therapyPhasesData[0]?.key || 'debut')
                        navigate(`/couples/${created.id}`)
                      } catch (err) {
                        console.error('Client creation error:', err)
                        setCreateError('Erreur inattendue : ' + (err.message || 'veuillez réessayer.'))
                      }
                    }}
                  >
                    <Plus size={16} style={{ color: 'white' }} /> Créer le client
                  </button>
                )}
              </div>
            </div>

            <style>{`
            @keyframes ncFadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
            @keyframes ncSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
          `}</style>
          </div>
        )
      })()}
    </div>
  )
}

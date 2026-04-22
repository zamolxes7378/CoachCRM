import React, { useState, useMemo, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { todayIso } from '../lib/date'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Users, User, X, UserPlus, Star, Baby, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { findDuplicateClients } from '../utils/duplicateUtils'
import DuplicateAlert from '../components/DuplicateAlert'
import ReferrerSection from '../components/client/ReferrerSection'
import NewClientButton from '../components/NewClientButton'
import ClientsFilterBar from '../components/clients/ClientsFilterBar'
import ClientCard from '../components/clients/ClientCard'
import ClientsList from '../components/clients/ClientsList'

export default function ClientsPage() {
  usePageTitle('Mes Clients')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    clients, sessions, professionals, recruitmentSources, therapyPhases: therapyPhasesData,
    getPhaseColor, getPhaseIcon, isProspect, getClientName, getClientInitials, getPhaseLabel,
    getStatusLabel, getComputedStatus, formatDate, getClientType,
    createClient, updateClient, createProfessional: createPro
  } = useData()

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
  const [viewMode, setViewMode] = useState(searchParams.get('view') || 'cards')
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
  const [newNotes, setNewNotes] = useState('')
  const [createError, setCreateError] = useState(null)

  const duplicateMatches = useMemo(() => {
    if (duplicateDismissed || !newLastName.trim()) return []
    return findDuplicateClients({ firstName: newFirstName, lastName: newLastName }, clients, getClientName)
  }, [newFirstName, newLastName, clients, duplicateDismissed, getClientName])

  // H-03: proper deps for this useEffect
  useEffect(() => {
    if (searchParams.get('newClient') === '1') {
      setShowModal(true)
      const proRefParam = searchParams.get('proRef')
      if (proRefParam) {
        try {
          const proRef = JSON.parse(decodeURIComponent(proRefParam))
          setNewSource('parrainage')
          setExternalReferrer({ referrerType: 'professionnel', firstName: proRef.firstName || '', lastName: proRef.lastName || '', proId: proRef.proId || null })
        } catch (e) { /* ignore parse error */ }
      }
    }
    const tabParam = searchParams.get('tab')
    if (tabParam) setActiveTab(tabParam)
    const viewParam = searchParams.get('view')
    if (viewParam) setViewMode(viewParam)
  }, [searchParams])

  const activeClients = useMemo(() => clients.filter(c => !c.deleted), [clients])
  const prospectCount = useMemo(() => activeClients.filter(c => isProspect(c)).length, [activeClients, isProspect])
  const clientCount = useMemo(() => activeClients.filter(c => c.phase !== 'prospect').length, [activeClients])

  // sessionsByClient Map — O(1) per-client lookup; replaces .find() in render loops
  const sessionsByClient = useMemo(() => {
    const now = new Date()
    const map = new Map()
    sessions.forEach(s => {
      if (s.status === 'cancelled') return
      if (!map.has(s.clientId)) map.set(s.clientId, { past: [], future: [] })
      const bucket = map.get(s.clientId)
      const d = new Date(s.date)
      if (d <= now) bucket.past.push(s)
      else bucket.future.push(s)
    })
    return map
  }, [sessions])

  const filtered = useMemo(() => {
    let result = activeClients
      .filter(c => activeTab === 'prospects' ? isProspect(c) : !isProspect(c))
      .filter(c => getClientName(c).toLowerCase().includes(search.toLowerCase()))

    if (statusFilter === 'individual') {
      result = result.filter(c => getClientType(c) === 'individual')
    } else if (statusFilter === 'client') {
      result = result.filter(c => getClientType(c) === 'client')
    } else if (statusFilter === 'family') {
      result = result.filter(c => getClientType(c) === 'family')
    } else if (statusFilter === 'parrains') {
      result = result.filter(c => (c.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'parrain'))
    } else if (statusFilter === 'filleuls') {
      result = result.filter(c => (c.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul'))
    } else if (statusFilter !== 'all') {
      result = result.filter(c => getComputedStatus(c) === statusFilter)
    }

    if (sortMode === 'alpha-asc') {
      result = [...result].sort((a, b) => (a.partnerA?.lastName || '').localeCompare(b.partnerA?.lastName || '', 'fr'))
    } else if (sortMode === 'alpha-desc') {
      result = [...result].sort((a, b) => (b.partnerA?.lastName || '').localeCompare(a.partnerA?.lastName || '', 'fr'))
    } else if (sortMode === 'recent') {
      result = [...result].sort((a, b) => {
        const dateA = activeTab === 'prospects' ? (a.startDate || '') : (a.lastSession || '')
        const dateB = activeTab === 'prospects' ? (b.startDate || '') : (b.lastSession || '')
        return dateB.localeCompare(dateA)
      })
    }
    return result
  }, [activeClients, activeTab, search, statusFilter, sortMode, isProspect, getClientName, getClientType, getComputedStatus])

  const sharedProps = {
    clients,
    therapyPhasesData,
    sessions,
    recruitmentSources,
    sessionsByClient,
    getPhaseColor,
    getPhaseIcon,
    getComputedStatus,
    getClientName,
    getClientInitials,
    getPhaseLabel,
    getStatusLabel,
    getClientType,
    formatDate,
  }

  const resetModal = () => {
    setShowModal(false); setWizardStep(0); setNewClientType(''); setNewChildren([])
    setNewFamilyAdults([{}]); setNewLastName(''); setNewFirstName(''); setNewReferents([0])
    setSelectedReferrer(null); setReferrerSearch(''); setExternalReferrer(null)
    setCreateError(null); setNewPhase(therapyPhasesData[0]?.key || 'debut')
  }

  const renderAdultBlock = (title, idx) => {
    const currentYear = new Date().getFullYear()
    return (
      <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} /> {title}
          </h4>
          {newClientType !== 'individual' && (() => {
            const isRef = newReferents.includes(idx)
            return (
              <button type="button" onClick={() => { if (isRef) { if (newReferents.length > 1) setNewReferents(newReferents.filter(r => r !== idx)) } else { setNewReferents([...newReferents, idx]) } }}
                title="Référent principal"
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', fontWeight: 600, padding: 0, background: 'none', border: 'none', color: isRef ? '#D97706' : 'var(--text-tertiary)', cursor: 'pointer', transition: 'color 0.2s' }}>
                <Star size={12} fill={isRef ? '#F59E0B' : 'none'} color={isRef ? '#F59E0B' : 'var(--text-tertiary)'} /> Référent
              </button>
            )
          })()}
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-firstname`}>Prénom</label>
            <input id={`new-client-${idx}-firstname`} className="input" placeholder="Prénom" value={idx === 0 ? newFirstName : newFirstNameB} onChange={idx === 0 ? e => { setNewFirstName(e.target.value); setDuplicateDismissed(false) } : e => setNewFirstNameB(e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-lastname`} className="label-required">Nom</label>
            {idx === 0 ? (
              <input id={`new-client-${idx}-lastname`} className={`input${!newLastName.trim() ? ' input-required' : ''}`} placeholder="Nom" value={newLastName} onChange={e => { setNewLastName(e.target.value); setDuplicateDismissed(false) }} />
            ) : (
              <input id={`new-client-${idx}-lastname`} className={`input${!newLastNameB.trim() ? ' input-required' : ''}`} placeholder="Nom" value={newLastNameB} onChange={e => setNewLastNameB(e.target.value)} />
            )}
          </div>
        </div>
        {idx === 0 && duplicateMatches.length > 0 && (
          <DuplicateAlert matches={duplicateMatches} onView={(id) => { setShowModal(false); navigate(`/clients/${id}`) }} onDismiss={() => setDuplicateDismissed(true)} formatDate={formatDate} getPhaseLabel={getPhaseLabel} getPhaseColor={getPhaseColor} />
        )}
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-email`}>Email</label>
            <input id={`new-client-${idx}-email`} className="input" type="email" placeholder="email@exemple.com" />
          </div>
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-phone`}>Téléphone</label>
            <input id={`new-client-${idx}-phone`} className="input" type="tel" placeholder="06 12 34 56 78" />
          </div>
        </div>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-birthdate`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Date de naissance <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
            </label>
            <input id={`new-client-${idx}-birthdate`} className="input" type="date" style={{ colorScheme: 'light' }} />
          </div>
          <div className="input-group">
            <label htmlFor={`new-client-${idx}-birthyear`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              ou Année <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
            </label>
            <input id={`new-client-${idx}-birthyear`} className="input" type="number" min="1920" max={currentYear} placeholder={`ex. ${currentYear - 35}`} onBlur={e => { if (e.target.value && parseInt(e.target.value) > currentYear) e.target.value = currentYear }} />
          </div>
        </div>
        <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
          <label htmlFor={`new-client-${idx}-billing`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Adresse de facturation <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
          </label>
          <textarea id={`new-client-${idx}-billing`} className="input" rows={2} placeholder="Adresse complète pour la facturation…" value={idx === 0 ? billingAddress : billingAddressB} onChange={idx === 0 ? e => setBillingAddress(e.target.value) : e => setBillingAddressB(e.target.value)} style={{ resize: 'vertical' }} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Mes Clients</h1>
        <NewClientButton onClick={() => { setWizardStep(0); setNewClientType(''); setNewChildren([]); setShowModal(true) }} />
      </div>

      <div className="tabs">
        <button className={`tab ${activeTab === 'clients' ? 'active' : ''}`} onClick={() => setActiveTab('clients')}>
          <Users size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> Clients ({clientCount})
        </button>
        <button className={`tab ${activeTab === 'prospects' ? 'active' : ''}`} onClick={() => setActiveTab('prospects')}>
          <UserPlus size={16} style={{ marginRight: 4, verticalAlign: -3 }} /> Prospects ({prospectCount})
        </button>
      </div>

      <ClientsFilterBar
        search={search} setSearch={setSearch}
        sortMode={sortMode} setSortMode={setSortMode}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        viewMode={viewMode} setViewMode={setViewMode}
        activeTab={activeTab}
      />

      {viewMode === 'cards' ? (
        <div className="grid-3">
          {filtered.map(client => (
            <ClientCard key={client.id} client={client} {...sharedProps} />
          ))}
        </div>
      ) : (
        <ClientsList
          filtered={filtered}
          activeTab={activeTab}
          updateClient={updateClient}
          {...sharedProps}
        />
      )}

      {/* Modal Nouveau Client — Wizard 3 étapes */}
      {showModal && (() => {
        const STEP_COUNT = 3
        const stepLabels = ['Type', 'Identité', 'Suivi']
        const currentYear = new Date().getFullYear()

        return (
          <div className="modal-overlay">
            <div style={{ width: '100%', maxWidth: 580, background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'ncFadeIn 0.3s ease-out' }}>
              <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {newClientType === 'client' ? 'Nouveau Couple' : newClientType === 'family' ? 'Nouvelle Famille' : 'Nouveau client'}
                </h2>
                <button onClick={resetModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '12px 32px 0' }}>
                {stepLabels.map((label, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div onClick={() => { if (i < wizardStep || (i === 1 && newClientType)) setWizardStep(i) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderBottom: i === wizardStep ? '2px solid var(--accent-main)' : '2px solid transparent', cursor: (i < wizardStep || (i === 1 && newClientType)) ? 'pointer' : 'default', transition: 'all 0.2s', opacity: (i <= wizardStep || newClientType) ? 1 : 0.4 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', background: i < wizardStep ? 'var(--accent-main)' : i === wizardStep ? 'var(--accent-bg)' : 'var(--primary-50)', color: i < wizardStep ? 'white' : i === wizardStep ? 'var(--accent-main)' : 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.714rem', fontWeight: 700, transition: 'all 0.2s' }}>
                        {i < wizardStep ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.786rem', fontWeight: 600, color: i === wizardStep ? 'var(--accent-main)' : i < wizardStep ? 'var(--accent-dark)' : 'var(--text-tertiary)' }}>{label}</span>
                    </div>
                    {i < STEP_COUNT - 1 && <div style={{ width: 20, height: 1, background: i < wizardStep ? 'var(--accent-main)' : 'var(--border-light)', transition: 'background 0.3s' }} />}
                  </div>
                ))}
              </div>

              <div style={{ padding: '24px 32px 16px', minHeight: 280, maxHeight: 480, overflowY: 'auto' }}>
                <div key={wizardStep} style={{ animation: 'ncSlideIn 0.25s ease-out' }}>
                  {wizardStep === 0 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Type d'accompagnement</h3>
                      <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>Sélectionnez le cadre thérapeutique</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                        {[
                          { key: 'individual', icon: 'user', label: 'Individuel', desc: '1 personne', color: '#6366F1', bg: '#EEF2FF' },
                          { key: 'client', icon: 'users', label: 'Couple', desc: '2 partenaires', color: '#EC4899', bg: '#FDF2F8' },
                          { key: 'family', icon: 'family', label: 'Famille', desc: 'Adultes + enfants', color: '#F59E0B', bg: '#FFFBEB' }
                        ].map(t => (
                          <div key={t.key} onClick={() => { setNewClientType(t.key); setWizardStep(1) }}
                            style={{ padding: 'var(--space-lg) var(--space-md)', borderRadius: 'var(--radius-lg)', border: `2px solid ${newClientType === t.key ? t.color : 'transparent'}`, background: newClientType === t.key ? t.bg : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', transform: newClientType === t.key ? 'scale(1.03)' : 'scale(1)' }}
                            onMouseEnter={e => { if (newClientType !== t.key) { e.currentTarget.style.borderColor = t.color + '60'; e.currentTarget.style.background = t.bg + '80' } }}
                            onMouseLeave={e => { if (newClientType !== t.key) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-card)' } }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', height: 52 }}>
                              {t.icon === 'user' && <User size={36} color={t.color} />}
                              {t.icon === 'users' && <Users size={36} color={t.color} />}
                              {t.icon === 'family' && (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="7" cy="5" r="2.2" fill={t.color} /><path d="M4 19v-4.5c0-1.7 1.3-3 3-3s3 1.3 3 3V19" stroke={t.color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                                  <circle cx="17" cy="5" r="2.2" fill={t.color} /><path d="M14 19v-4.5c0-1.7 1.3-3 3-3s3 1.3 3 3V19" stroke={t.color} strokeWidth="1.6" strokeLinecap="round" fill="none" />
                                  <circle cx="12" cy="9" r="1.7" fill={t.color} /><path d="M9.8 19v-3.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2V19" stroke={t.color} strokeWidth="1.4" strokeLinecap="round" fill="none" />
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

                  {wizardStep === 1 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                        {newClientType === 'individual' ? 'Informations du client' : newClientType === 'client' ? 'Le Couple' : 'La famille'}
                      </h3>
                      {newClientType !== 'individual' && (
                        <p style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={9} color="var(--text-tertiary)" /> Référent = interlocuteur principal pour la communication et le suivi financier
                        </p>
                      )}
                      {newClientType === 'individual' && renderAdultBlock('Client', 0)}
                      {newClientType === 'client' && (<>{renderAdultBlock('Partenaire A', 0)}{renderAdultBlock('Partenaire B', 1)}</>)}
                      {newClientType === 'family' && (
                        <>
                          {newFamilyAdults.map((_, idx) => {
                            const isRef = newReferents.includes(idx)
                            const canRemove = newFamilyAdults.length > 1 && !isRef
                            return (
                              <div key={`fam-adult-${idx}`} style={{ position: 'relative' }}>
                                {renderAdultBlock(`Adulte ${idx + 1}`, idx)}
                                {newFamilyAdults.length > 1 && (
                                  <button onClick={() => { if (!canRemove) return; setNewFamilyAdults(newFamilyAdults.filter((_, i) => i !== idx)); setNewReferents(newReferents.filter(r => r !== idx).map(r => r > idx ? r - 1 : r)) }}
                                    disabled={!canRemove}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.643rem', fontWeight: 500, padding: '2px 0', marginTop: -8, marginBottom: 'var(--space-sm)', background: 'none', border: 'none', cursor: canRemove ? 'pointer' : 'not-allowed', color: canRemove ? 'var(--error)' : 'var(--text-tertiary)', opacity: canRemove ? 0.7 : 0.3, transition: 'opacity 0.2s' }}
                                    onMouseEnter={e => { if (canRemove) e.currentTarget.style.opacity = '1' }}
                                    onMouseLeave={e => { if (canRemove) e.currentTarget.style.opacity = '0.7' }}>
                                    <Trash2 size={11} /> Retirer cet adulte
                                  </button>
                                )}
                              </div>
                            )
                          })}
                          <button className="btn btn-ghost" style={{ fontSize: '0.714rem', padding: '4px 10px', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => setNewFamilyAdults([...newFamilyAdults, {}])}>
                            <Plus size={13} /> Ajouter un adulte
                          </button>
                        </>
                      )}
                      {newClientType === 'family' && (
                        <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                            <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Baby size={14} /> Enfants
                            </h4>
                            <button className="btn btn-ghost" style={{ fontSize: '0.714rem', padding: '3px 8px' }} onClick={() => setNewChildren([...newChildren, { name: '', birthYear: '' }])}>
                              <Plus size={13} /> Ajouter
                            </button>
                          </div>
                          {newChildren.length === 0 && <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-sm) 0' }}>Cliquez "Ajouter" pour ajouter un enfant</p>}
                          {newChildren.map((child, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                              <input className="input" placeholder="Prénom" style={{ flex: 2 }} value={child.name} onChange={e => { const c = [...newChildren]; c[idx] = { ...c[idx], name: e.target.value }; setNewChildren(c) }} />
                              <input className="input" placeholder="Année" type="number" min="1990" max={currentYear} style={{ flex: 1, maxWidth: 80 }} value={child.birthYear} onChange={e => { const val = e.target.value; const c = [...newChildren]; c[idx] = { ...c[idx], birthYear: val && parseInt(val) > currentYear ? String(currentYear) : val }; setNewChildren(c) }} />
                              {child.birthYear && !isNaN(child.birthYear) && <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap', minWidth: 30 }}>{currentYear - parseInt(child.birthYear)} ans</span>}
                              <button onClick={() => setNewChildren(newChildren.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div>
                      <h3 style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Informations de suivi</h3>
                      <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-lg)' }}>Stade d'avancement et contexte</p>
                      <div className="grid-2">
                        <div className="input-group">
                          <label>Phase de la thérapie</label>
                          <div style={{ padding: '8px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)', border: '1px solid #E8D8FE', fontSize: '0.786rem', color: '#6B46C1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <UserPlus size={14} /> Prospect
                            <span style={{ fontWeight: 400, fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 4 }}>Évoluera automatiquement à la 1ère séance payée</span>
                          </div>
                        </div>
                        <div className="input-group">
                          <label htmlFor="new-client-source">Source du prospect</label>
                          <select id="new-client-source" className="input" style={{ cursor: 'pointer' }} value={newSource} onChange={e => setNewSource(e.target.value)}>
                            <option value="">Sélectionner...</option>
                            {recruitmentSources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      </div>
                      {(newSource === 'referral' || newSource === 'parrainage') && (
                        <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                          <label className="label-required">Orienté par</label>
                          <ReferrerSection
                            externalReferrer={externalReferrer} setExternalReferrer={setExternalReferrer}
                            selectedReferrer={selectedReferrer} setSelectedReferrer={setSelectedReferrer}
                            referrerSearch={referrerSearch} setReferrerSearch={setReferrerSearch}
                            clients={clients} professionals={professionals}
                            getClientName={getClientName} formatDate={formatDate}
                            getPhaseLabel={getPhaseLabel} getPhaseColor={getPhaseColor}
                            onNavigate={(id) => { setShowModal(false); navigate(`/clients/${id}`) }}
                            onLink={(item, refType) => {
                              if (refType === 'professionnel') setExternalReferrer({ ...externalReferrer, linkedProId: item.id, referrerType: 'professionnel' })
                              else setSelectedReferrer(item)
                            }}
                            clientId={null}
                          />
                        </div>
                      )}
                      <div className="input-group" style={{ marginTop: 'var(--space-md)' }}>
                        <label htmlFor="new-client-notes">Notes (optionnel)</label>
                        <textarea id="new-client-notes" className="input" rows={3} placeholder="Contexte initial, motif de consultation..." value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ resize: 'vertical' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {createError && (
                <div style={{ padding: '8px 32px 0', animation: 'ncSlideIn 0.25s ease-out' }}>
                  <div style={{ padding: '8px 12px', background: '#FFF5F5', borderRadius: 'var(--radius-md)', border: '1px solid #FED7D7', fontSize: '0.786rem', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ⚠ {createError}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 32px 18px', borderTop: '1px solid var(--border-light)' }}>
                <div>
                  {wizardStep > 0 ? (
                    <button onClick={() => setWizardStep(wizardStep - 1)} className="btn btn-ghost" style={{ fontSize: '0.786rem', padding: '6px 12px' }}>← Précédent</button>
                  ) : (
                    <button onClick={resetModal} style={{ fontSize: '0.786rem', fontWeight: 500, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', fontFamily: 'var(--font-family)' }}>Annuler</button>
                  )}
                </div>
                {wizardStep < STEP_COUNT - 1 ? (
                  <button onClick={() => setWizardStep(wizardStep + 1)} className="btn btn-accent"
                    style={{ fontSize: '0.857rem', padding: '8px 18px', opacity: (wizardStep === 0 && !newClientType) || (wizardStep === 1 && !newLastName.trim()) ? 0.4 : 1 }}
                    disabled={(wizardStep === 0 && !newClientType) || (wizardStep === 1 && !newLastName.trim())}>
                    Suivant →
                  </button>
                ) : (
                  <button className="btn btn-accent"
                    style={{ fontSize: '0.857rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, opacity: ((newSource === 'referral' || newSource === 'parrainage') && !selectedReferrer && (!externalReferrer || !(externalReferrer.lastName || '').trim())) ? 0.4 : 1 }}
                    disabled={(newSource === 'referral' || newSource === 'parrainage') && !selectedReferrer && (!externalReferrer || !(externalReferrer.lastName || '').trim())}
                    onClick={async () => {
                      setCreateError(null)
                      try {
                        const today = todayIso()
                        const newClient = {
                          type: newClientType || 'client',
                          partnerA: { firstName: newFirstName || '', lastName: newLastName.trim().toUpperCase(), billingAddress: billingAddress.trim() || null },
                          ...(newClientType !== 'individual' && newLastNameB.trim() ? { partnerB: { firstName: newFirstNameB || '', lastName: newLastNameB.trim().toUpperCase(), billingAddress: billingAddressB.trim() || null } } : {}),
                          phase: 'prospect', source: newSource || null, status: 'active',
                          startDate: today, billingAddress: billingAddress.trim() || null, notes: newNotes.trim() || null,
                        }
                        const created = await createClient(newClient)
                        if (!created) { setCreateError('Erreur lors de la création du client. Vérifiez votre connexion et réessayez.'); return }

                        if (selectedReferrer) {
                          await updateClient(created.id, { clientLinks: [{ clientId: selectedReferrer.id, type: 'parrainage', role: 'filleul' }], source: newSource || 'referral' })
                          await updateClient(selectedReferrer.id, { clientLinks: [...(selectedReferrer.clientLinks || []), { clientId: created.id, type: 'parrainage', role: 'parrain' }] })
                        } else if (externalReferrer && externalReferrer.lastName && externalReferrer.lastName.trim()) {
                          const refType = externalReferrer.referrerType || 'particulier'
                          if (refType === 'particulier') {
                            const refClient = await createClient({ type: 'individual', partnerA: { firstName: externalReferrer.firstName || '', lastName: externalReferrer.lastName.trim().toUpperCase(), email: externalReferrer.email || '', phone: externalReferrer.phone || '' }, phase: 'prospect', status: 'active', startDate: today })
                            if (refClient) {
                              await updateClient(created.id, { clientLinks: [{ clientId: refClient.id, type: 'parrainage', role: 'filleul' }], externalReferrer, source: newSource || 'referral' })
                              await updateClient(refClient.id, { clientLinks: [{ clientId: created.id, type: 'parrainage', role: 'parrain' }] })
                            }
                          } else {
                            const today2 = todayIso()
                            const existingPro = professionals.find(p => p.lastName?.toUpperCase() === externalReferrer.lastName?.trim().toUpperCase() && (p.firstName || '').toLowerCase() === (externalReferrer.firstName || '').toLowerCase())
                            let proId
                            if (existingPro) { proId = existingPro.id }
                            else {
                              const newPro = await createPro({ firstName: externalReferrer.firstName || '', lastName: externalReferrer.lastName.trim().toUpperCase(), email: externalReferrer.email || '', phone: externalReferrer.phone || '', note: externalReferrer.role || '', referrals: [{ clientId: created.id, date: today2, clientName: `${newFirstName} ${newLastName}`.trim() }] })
                              proId = newPro?.id
                            }
                            const proName = `${externalReferrer.firstName || ''} ${externalReferrer.lastName || ''}`.trim()
                            await updateClient(created.id, { clientLinks: [{ type: 'parrainage-pro', proId: proId || undefined, proName, role: 'filleul' }], externalReferrer: { ...externalReferrer, referrerType: 'professionnel' }, source: newSource || 'referral' })
                          }
                        }
                        resetModal()
                        navigate(`/clients/${created.id}`)
                      } catch (err) {
                        console.error('Client creation error:', err)
                        setCreateError('Erreur inattendue : ' + (err.message || 'veuillez réessayer.'))
                      }
                    }}>
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

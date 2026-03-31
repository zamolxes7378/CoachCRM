import React, { useState, useMemo } from 'react'
import { User, Briefcase, X, Award, UserPlus } from 'lucide-react'
import { findDuplicateClients, findDuplicatePros } from '../../utils/duplicateUtils'
import DuplicateAlert from '../DuplicateAlert'

/**
 * ReferrerSection — Shared parrainage UI for client creation and edit.
 *
 * Handles 3 states:
 * 1. Search — input to find existing client or switch to external person
 * 2. Selected client — badge showing the chosen parrain
 * 3. External form — toggle Particulier/Professionnel + name/email/phone/note + deduplication
 *
 * Props:
 *  - externalReferrer / setExternalReferrer — external referrer form state
 *  - selectedReferrer / setSelectedReferrer — selected client parrain
 *  - referrerSearch / setReferrerSearch — search input state
 *  - clients — all clients for search + dedup
 *  - professionals — all pros for dedup when type=professionnel
 *  - getClientName — helper to display client name
 *  - formatDate / getPhaseLabel / getPhaseColor — for DuplicateAlert preview
 *  - onNavigate — callback(id) to navigate to a client page
 *  - onLink — callback(item) when linking to a duplicate (client or pro)
 *  - onClear — callback() when clearing the external referrer (for cleanup logic)
 *  - clientId — current client id (to exclude from dedup), null at creation
 */
export default function ReferrerSection({
  externalReferrer,
  setExternalReferrer,
  selectedReferrer,
  setSelectedReferrer,
  referrerSearch,
  setReferrerSearch,
  clients,
  professionals,
  getClientName,
  formatDate,
  getPhaseLabel,
  getPhaseColor,
  onNavigate,
  onLink,
  onClear,
  clientId
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [duplicateDismissed, setDuplicateDismissed] = useState(false)

  // Duplicate detection for external referrer
  const duplicateMatches = useMemo(() => {
    if (duplicateDismissed || !externalReferrer) return []
    const refType = externalReferrer.referrerType || 'particulier'
    const firstName = externalReferrer.firstName || ''
    const lastName = externalReferrer.lastName || ''
    if (!lastName.trim()) return []
    if (refType === 'professionnel') {
      return findDuplicatePros({ firstName, lastName }, professionals)
    }
    return findDuplicateClients(
      { firstName, lastName, email: externalReferrer.email || '', phone: externalReferrer.phone || '' },
      clients, getClientName, clientId
    )
  }, [externalReferrer, clients, professionals, duplicateDismissed, clientId, getClientName])

  // --- State 3: External referrer form ---
  if (externalReferrer) {
    const refType = externalReferrer.referrerType || 'particulier'
    return (
      <div style={{
        padding: '10px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)',
        border: '1px solid #C4B5FD'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: '0.714rem', fontWeight: 600, color: '#8B5CF6' }}>Personne externe (non client)</span>
          <button onClick={() => {
            setExternalReferrer(null)
            setDuplicateDismissed(false)
            if (onClear) onClear()
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
            const active = refType === opt.key
            return (
              <button key={opt.key} type="button"
                onClick={() => {
                  setExternalReferrer({ ...externalReferrer, referrerType: opt.key })
                  setDuplicateDismissed(false)
                }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '5px 8px', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.714rem', fontWeight: 600, cursor: 'pointer',
                  border: '2px solid transparent',
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

        {/* Name fields */}
        <div className="grid-2" style={{ marginBottom: 6 }}>
          <input className="input" placeholder="Prénom" value={externalReferrer.firstName || ''}
            onChange={e => setExternalReferrer({ ...externalReferrer, firstName: e.target.value })}
            style={{ fontSize: '0.786rem' }} />
          <input className="input" placeholder="Nom *" value={externalReferrer.lastName || ''}
            onChange={e => {
              setExternalReferrer({ ...externalReferrer, lastName: e.target.value })
              setDuplicateDismissed(false)
            }}
            style={{ fontSize: '0.786rem', ...(!(externalReferrer.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}) }} />
        </div>

        {/* Duplicate alert */}
        {duplicateMatches.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <DuplicateAlert
              matches={duplicateMatches}
              type={refType === 'professionnel' ? 'pro' : 'client'}
              onView={(id) => onNavigate(id)}
              onLink={(item) => {
                if (onLink) onLink(item, refType)
                setExternalReferrer(null)
                setDuplicateDismissed(false)
              }}
              onDismiss={() => setDuplicateDismissed(true)}
              formatDate={formatDate}
              getPhaseLabel={getPhaseLabel}
              getPhaseColor={getPhaseColor}
            />
          </div>
        )}

        {/* Contact fields */}
        <div className="grid-2" style={{ marginBottom: 6 }}>
          <input className="input" type="email" placeholder="Email" value={externalReferrer.email || ''}
            onChange={e => setExternalReferrer({ ...externalReferrer, email: e.target.value })}
            style={{ fontSize: '0.786rem' }} />
          <input className="input" type="tel" placeholder="Téléphone" value={externalReferrer.phone || ''}
            onChange={e => setExternalReferrer({ ...externalReferrer, phone: e.target.value })}
            style={{ fontSize: '0.786rem' }} />
        </div>

        {/* Note */}
        <input className="input" placeholder="Note (ex: confrère, ami, médecin…)" value={externalReferrer.role || ''}
          onChange={e => setExternalReferrer({ ...externalReferrer, role: e.target.value })}
          style={{ fontSize: '0.786rem', width: '100%' }} />
      </div>
    )
  }

  // --- State 2: Client sélectionné ---
  if (selectedReferrer) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
      }}>
        <span style={{ fontWeight: 500, color: '#8B5CF6' }}>
          <Award size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          {getClientName(selectedReferrer)} <span style={{ fontSize: '0.643rem', fontWeight: 400, opacity: 0.7 }}>· Parrain</span>
        </span>
        <button onClick={() => { setSelectedReferrer(null); setReferrerSearch('') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
    )
  }

  // --- State 1: Search ---
  const filteredClients = clients
    .filter(c => !c.deleted)
    .filter(c => {
      if (!referrerSearch.trim()) return true
      const q = referrerSearch.toLowerCase()
      const name = getClientName(c).toLowerCase()
      return name.includes(q)
    })
    .filter(c => c.id !== clientId)
    .slice(0, 8)

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="input" type="text" placeholder="Rechercher un client…"
        value={referrerSearch}
        onChange={e => { setReferrerSearch(e.target.value); setShowDropdown(true) }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        style={{ fontSize: '0.857rem', width: '100%' }}
      />
      {showDropdown && (
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
              setExternalReferrer({ firstName: '', lastName: '', role: '', referrerType: 'particulier' })
              setShowDropdown(false)
              setReferrerSearch('')
            }}
            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-light)' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <UserPlus size={14} color="#D97706" />
            <span style={{ fontWeight: 500, color: '#D97706' }}>Personne externe (non client)</span>
          </div>
          {filteredClients.map(c => (
            <div
              key={c.id}
              onMouseDown={e => {
                e.preventDefault()
                setSelectedReferrer(c)
                setShowDropdown(false)
                setReferrerSearch('')
              }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.857rem' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {getClientName(c)}
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div style={{ padding: '8px 12px', fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              Aucun client trouvé
            </div>
          )}
        </div>
      )}
    </div>
  )
}

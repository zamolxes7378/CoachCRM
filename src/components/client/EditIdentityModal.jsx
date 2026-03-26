import React from 'react'
import {
  X, User, Users, Sprout, Baby, Trash2, Plus, Edit3, Save, Check,
  ChevronDown, ChevronUp, Star, Link2, Award, Briefcase, UserPlus
} from 'lucide-react'
import DeleteConfirmModal from './DeleteConfirmModal'

/**
 * Edit Identity Modal — sliding panel for editing client identity, type, source, links.
 * Receives grouped state from useEditIdentityState hook.
 */
export default function EditIdentityModal({
  couple,
  editState,       // all edit fields from useEditIdentityState
  editActions,     // all setters from useEditIdentityState
  therapy,         // { phasesData, phaseIcons, phaseColors, phase, setPhase, status }
  data,            // { clients, professionals, recruitmentSources }
  utils,           // { updateClient, updatePro, createPro, navigate, getCoupleName, getClientType, getCoupleInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert }
}) {
  // Destructure for convenience
  const {
    editPartnerA, editPartnerB, editChildren, editType, editReferents, editSource,
    showDeleteConfirm, modalShowAddLink, modalAddLinkSearch,
    modalReferrerSearch, modalSelectedReferrer, modalShowReferrerDropdown, modalExternalReferrer
  } = editState
  const {
    setEditPartnerA, setEditPartnerB, setEditChildren, setEditType, setEditReferents, setEditSource,
    setShowEditModal, setShowDeleteConfirm, setModalShowAddLink, setModalAddLinkSearch,
    setModalReferrerSearch, setModalSelectedReferrer, setModalShowReferrerDropdown, setModalExternalReferrer,
    resetToOriginal
  } = editActions
  const { phasesData: therapyPhasesData, phaseIcons, phaseColors, phase, setPhase, status } = therapy
  const { clients, professionals, recruitmentSources } = data
  const { updateClient, updatePro, createPro, navigate, getCoupleName, getClientType, getCoupleInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert } = utils


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
              <div className="couple-avatar" style={{ width: 40, height: 40, fontSize: '0.857rem', background: status === 'inactive' ? 'var(--primary-200)' : couple.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', color: status === 'inactive' ? 'white' : couple.phase === 'prospect' ? '#6B46C1' : 'white', flexShrink: 0 }}>{getCoupleInitials(couple)}</div>
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
                            ? findDuplicatePros({ firstName: modalExternalReferrer.firstName, lastName: modalExternalReferrer.lastName }, professionals)
                            : findDuplicateClients({ firstName: modalExternalReferrer.firstName, lastName: modalExternalReferrer.lastName }, clients, getCoupleName, couple.id)
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
                    ) : (modalSelectedReferrer || (() => { const link = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul'); return link ? clients.find(c => c.id === link.clientId) : null })()) ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: '#F5F0FF', borderRadius: 'var(--radius-md)', fontSize: '0.857rem'
                      }}>
                        <span style={{ fontWeight: 500, color: '#8B5CF6' }}>
                          <Award size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                          {getCoupleName(modalSelectedReferrer || (() => { const link = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul'); return link ? clients.find(c => c.id === link.clientId) : null })())} <span style={{ fontSize: '0.643rem', fontWeight: 400, opacity: 0.7 }}>· Parrain</span>
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
                              const other = clients.find(c => c.id === link.clientId)
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
                            {clients
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
                    const linked = isPro ? null : clients.find(c => c.id === link.clientId)
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
                          {clients
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
                          const other = clients.find(c => c.id === link.clientId)
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
                        let existingPro = existingProLink ? professionals.find(p => p.id === existingProLink.proId) : null
                        if (!existingPro) {
                          existingPro = professionals.find(p =>
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
                        // --- PARTICULIER → prospect in clients ---
                        const existingLink = (couple.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul')
                        const existingProspect = existingLink ? clients.find(c => c.id === existingLink.clientId) : null
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
                          clients.push(newProspect)
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
  )
}

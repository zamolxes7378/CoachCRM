import React, { useRef } from 'react'
import {
  X, User, Users, Sprout, Baby, Trash2, Plus, Edit3, Save, Check,
  ChevronDown, ChevronUp, Star, Link2, Award, Briefcase, UserPlus
} from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'
import DeleteConfirmModal from './DeleteConfirmModal'
import ReferrerSection from './ReferrerSection'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/**
 * Edit Identity Modal — sliding panel for editing client identity, type, source, links.
 * Receives grouped state from useEditIdentityState hook.
 */
export default function EditIdentityModal({
  client,
  editState,       // all edit fields from useEditIdentityState
  editActions,     // all setters from useEditIdentityState
  therapy,         // { phasesData, phaseIcons, phaseColors, phase, setPhase, status }
  data,            // { clients, professionals, recruitmentSources }
  utils,           // { updateClient, updatePro, createPro, navigate, getClientName, getClientType, getClientInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert }
}) {
  // Destructure for convenience
  const {
    editPartnerA, editPartnerB, editChildren, editType, editReferents, editSource, editBillingAddress,
    showDeleteConfirm, modalShowAddLink, modalAddLinkSearch,
    modalReferrerSearch, modalSelectedReferrer, modalShowReferrerDropdown, modalExternalReferrer,
    isSaving
  } = editState
  const {
    setEditPartnerA, setEditPartnerB, setEditChildren, setEditType, setEditReferents, setEditSource, setEditBillingAddress,
    setShowEditModal, setShowDeleteConfirm, setModalShowAddLink, setModalAddLinkSearch,
    setModalReferrerSearch, setModalSelectedReferrer, setModalShowReferrerDropdown, setModalExternalReferrer,
    setIsSaving, resetToOriginal
  } = editActions
  const { phasesData: therapyPhasesData, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, phase, setPhase, status } = therapy
  const { clients, professionals, recruitmentSources } = data
  const { updateClient, createClient, updatePro, createPro, navigate, getClientName, getClientType, getClientInitials, findDuplicateClients, findDuplicatePros, DuplicateAlert, formatDate, getPhaseLabel } = utils


  const hasChanges = () => {
    const a = client.partnerA, ea = editPartnerA
    if ((ea.firstName || '') !== (a.firstName || '') || (ea.lastName || '') !== (a.lastName || '') || (ea.email || '') !== (a.email || '') || (ea.phone || '') !== (a.phone || '')) return true
    if (client.partnerB) {
      const b = client.partnerB, eb = editPartnerB
      if ((eb.firstName || '') !== (b.firstName || '') || (eb.lastName || '') !== (b.lastName || '') || (eb.email || '') !== (b.email || '') || (eb.phone || '') !== (b.phone || '')) return true
    }
    if ((editSource || '') !== (client.source || '')) return true
    if ((editBillingAddress || '') !== (client.billingAddress || '')) return true
    return false
  }
  const confirm = useConfirm()
  const panelRef = useRef(null)
  const handleClose = async () => {
    if (hasChanges()) {
      if (!await confirm('Des modifications non enregistrées seront perdues. Voulez-vous vraiment quitter ?')) return
    }
    // Reset all edit fields to original values
    setEditPartnerA({ ...client.partnerA })
    setEditPartnerB(client.partnerB ? { ...client.partnerB } : {})
    setEditChildren(client.children || [])
    setEditType(client ? getClientType(client) : 'individual')
    setEditSource(client?.source || '')
    setEditBillingAddress(client?.billingAddress || '')
    setShowEditModal(false); setShowDeleteConfirm(false)
  }
  useFocusTrap(panelRef, true)
  useEscapeKey(handleClose, true)
  return (
        <div className="modal-overlay" onClick={handleClose}>
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-identity-title"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '100%', maxWidth: 520,
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
              display: 'flex', flexDirection: 'column',
              animation: 'slideInRight 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: '20px 28px', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
              <div className="client-avatar" style={{ width: 40, height: 40, fontSize: '0.857rem', background: status === 'inactive' ? 'var(--primary-200)' : client.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', color: status === 'inactive' ? 'white' : client.phase === 'prospect' ? '#6B46C1' : 'white', flexShrink: 0 }}>{getClientInitials(client)}</div>
              <div style={{ flex: 1 }}>
                <div id="edit-identity-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{getClientName(client)}</div>
                <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}>
                  {getClientType(client) === 'individual' && <><User size={14} /> Individuel</>}
                  {getClientType(client) === 'client' && <><Users size={14} /> Client</>}
                  {getClientType(client) === 'family' && (
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
              <button onClick={handleClose} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}>
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
                        const Icon = getPhaseIcon(tp.key)
                        const pc = getPhaseColor(tp.key)
                        return (
                          <div key={tp.key} style={{ display: 'flex', alignItems: 'center' }}>
                            <div
                            onClick={() => { setPhase(tp.key) }}
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
                    <User size={14} /> {editType === 'individual' ? 'Client' : editType === 'client' ? 'Partenaire A' : 'Parent 1'}
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
                    <label htmlFor="edit-a-firstname">Prénom</label>
                    <input id="edit-a-firstname" className="input" placeholder="Prénom" autoComplete="given-name" value={editPartnerA.firstName || ''} onChange={e => setEditPartnerA({ ...editPartnerA, firstName: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-a-lastname">Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input id="edit-a-lastname" className="input" placeholder="Nom" autoComplete="family-name" value={editPartnerA.lastName || ''} onChange={e => setEditPartnerA({ ...editPartnerA, lastName: e.target.value })}
                      style={!(editPartnerA.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label htmlFor="edit-a-email">Email</label>
                    <input id="edit-a-email" className="input" type="email" placeholder="email@exemple.com" autoComplete="email" value={editPartnerA.email || ''} onChange={e => setEditPartnerA({ ...editPartnerA, email: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-a-phone">Téléphone</label>
                    <input id="edit-a-phone" className="input" type="tel" placeholder="06 12 34 56 78" autoComplete="tel" value={editPartnerA.phone || ''} onChange={e => setEditPartnerA({ ...editPartnerA, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label htmlFor="edit-a-birthdate" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Date de naissance
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <input id="edit-a-birthdate" className="input" type="date" style={{ colorScheme: 'light' }} autoComplete="bday" value={editPartnerA.birthDate || ''} onChange={e => setEditPartnerA({ ...editPartnerA, birthDate: e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-a-birthyear" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      ou Année
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <input id="edit-a-birthyear" className="input" type="number" min="1920" max={new Date().getFullYear()} placeholder={`ex. ${new Date().getFullYear() - 35}`}
                      autoComplete="bday-year" value={editPartnerA.birthYear || ''} onChange={e => setEditPartnerA({ ...editPartnerA, birthYear: e.target.value })} />
                  </div>
                </div>
                <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                  <label htmlFor="edit-billing-address" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Adresse de facturation
                    <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                  </label>
                  <textarea id="edit-billing-address" className="input" rows={2} placeholder="Adresse complète pour la facturation…" autoComplete="street-address" value={editBillingAddress} onChange={e => setEditBillingAddress(e.target.value)} style={{ resize: 'vertical' }} />
                </div>
              </div>

              {/* Partner B (client & family) */}
              {(editType === 'client' || editType === 'family') && (
                <div style={{
                  padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-50)', marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
                  <h4 style={{ fontSize: '0.786rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={14} /> {editType === 'client' ? 'Partenaire B' : 'Parent 2'}
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
                      <label htmlFor="edit-b-firstname">Prénom</label>
                      <input id="edit-b-firstname" className="input" placeholder="Prénom" autoComplete="given-name" value={editPartnerB.firstName || ''} onChange={e => setEditPartnerB({ ...editPartnerB, firstName: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label htmlFor="edit-b-lastname">Nom <span style={{ color: 'var(--error)' }}>*</span></label>
                      <input id="edit-b-lastname" className="input" placeholder="Nom" autoComplete="family-name" value={editPartnerB.lastName || ''} onChange={e => setEditPartnerB({ ...editPartnerB, lastName: e.target.value })}
                        style={!(editPartnerB.lastName || '').trim() ? { borderColor: 'var(--error)', borderWidth: 1 } : {}} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label htmlFor="edit-b-email">Email</label>
                      <input id="edit-b-email" className="input" type="email" placeholder="email@exemple.com" autoComplete="email" value={editPartnerB.email || ''} onChange={e => setEditPartnerB({ ...editPartnerB, email: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label htmlFor="edit-b-phone">Téléphone</label>
                      <input id="edit-b-phone" className="input" type="tel" placeholder="06 12 34 56 78" autoComplete="tel" value={editPartnerB.phone || ''} onChange={e => setEditPartnerB({ ...editPartnerB, phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label htmlFor="edit-b-birthdate" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Date de naissance
                        <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                      </label>
                      <input id="edit-b-birthdate" className="input" type="date" style={{ colorScheme: 'light' }} autoComplete="bday" value={editPartnerB.birthDate || ''} onChange={e => setEditPartnerB({ ...editPartnerB, birthDate: e.target.value })} />
                    </div>
                    <div className="input-group">
                      <label htmlFor="edit-b-birthyear" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        ou Année
                        <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                      </label>
                      <input id="edit-b-birthyear" className="input" type="number" min="1920" max={new Date().getFullYear()} placeholder={`ex. ${new Date().getFullYear() - 35}`}
                        autoComplete="bday-year" value={editPartnerB.birthYear || ''} onChange={e => setEditPartnerB({ ...editPartnerB, birthYear: e.target.value })} />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginTop: 'var(--space-xs)' }}>
                    <label htmlFor="edit-b-billing-address" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Adresse de facturation
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400, fontStyle: 'italic' }}>optionnel</span>
                    </label>
                    <textarea id="edit-b-billing-address" className="input" rows={2} placeholder="Adresse complète pour la facturation…" autoComplete="street-address" value={editBillingAddress} onChange={e => setEditBillingAddress(e.target.value)} style={{ resize: 'vertical' }} />
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
                {client.referrerType === 'particulier' ? (
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
                    <ReferrerSection
                      externalReferrer={modalExternalReferrer}
                      setExternalReferrer={setModalExternalReferrer}
                      selectedReferrer={modalSelectedReferrer || (() => { const link = (client.clientLinks || []).find(l => l.type === 'parrainage' && l.role === 'filleul'); return link ? clients.find(c => c.id === link.clientId) : null })()}
                      setSelectedReferrer={(val) => {
                        setModalSelectedReferrer(val)
                        if (!val) {
                          setModalReferrerSearch('')
                          setModalExternalReferrer(null)
                          // Clear parrainage links
                          if (client.clientLinks) {
                            const parrainageLinks = client.clientLinks.filter(l => l.type === 'parrainage' && l.role === 'filleul')
                            parrainageLinks.forEach(link => {
                              const other = clients.find(c => c.id === link.clientId)
                              if (other?.clientLinks) {
                                other.clientLinks = other.clientLinks.filter(l => !(l.type === 'parrainage' && l.clientId === client.id))
                              }
                            })
                            client.clientLinks = client.clientLinks.filter(l => !(l.type === 'parrainage' && l.role === 'filleul'))
                          }
                          client.externalReferrer = null
                        }
                      }}
                      referrerSearch={modalReferrerSearch}
                      setReferrerSearch={setModalReferrerSearch}
                      clients={clients}
                      professionals={professionals}
                      getClientName={getClientName}
                      formatDate={formatDate}
                      getPhaseLabel={getPhaseLabel}
                      getPhaseColor={utils.getPhaseColor}
                      onNavigate={(id) => navigate(`/clients/${id}`)}
                      onLink={(item, refType) => {
                        if (refType === 'professionnel') {
                          // Link to existing pro
                          if (!client.clientLinks) client.clientLinks = []
                          if (!client.clientLinks.some(l => l.type === 'parrainage-pro' && l.proId === item.id)) {
                            client.clientLinks.push({ type: 'parrainage-pro', proId: item.id, proName: `${item.firstName || ''} ${item.lastName || ''}`.trim(), role: 'filleul' })
                          }
                        } else {
                          // Link to existing client as parrain
                          setModalSelectedReferrer(item)
                        }
                      }}
                      onClear={() => {
                        client.externalReferrer = null
                        if (client.clientLinks) {
                          client.clientLinks = client.clientLinks.filter(l => l.type !== 'parrainage-pro')
                        }
                      }}
                      clientId={client.id}
                    />
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
                  {(client.clientLinks || []).map((link, idx) => {
                    const isPro = link.type === 'parrainage-pro'
                    const linked = isPro ? null : clients.find(c => c.id === link.clientId)
                    if (!isPro && !linked) return null
                    const isDossier = link.type === 'dossier'
                    const color = isPro ? '#7C3AED' : isDossier ? '#6366F1' : '#8B5CF6'
                    const bg = isDossier ? '#EEF2FF' : '#F5F0FF'
                    const LinkIcon = isPro ? Briefcase : isDossier ? Link2 : Award
                    const displayName = isPro ? link.proName : getClientName(linked)
                    const roleLabel = link.type === 'parrainage' && link.role
                      ? (link.role === 'filleul' ? '· Parrain' : '· Filleul')
                      : isPro ? '· Parrain Pro' : `· ${getClientType(linked) === 'individual' ? 'Individuel' : getClientType(linked) === 'client' ? 'Client' : 'Famille'}`
                    return (
                      <div key={idx} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                        background: bg, border: `1px solid ${color}20`,
                        fontSize: '0.714rem', fontWeight: 600, color,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                        onClick={async () => {
                          if (hasChanges()) {
                            if (!await confirm('Des modifications non enregistrées seront perdues. Voulez-vous vraiment quitter ?')) return
                          }
                          setShowEditModal(false)
                          isPro ? navigate('/admin/reseau-pro') : navigate(`/clients/${linked.id}`)
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
                          client.clientLinks = client.clientLinks.filter((_, i) => i !== idx)
                          if (linked && linked.clientLinks) linked.clientLinks = linked.clientLinks.filter(l => l.clientId !== client.id)
                          // If deleting a parrain link, also clear external referrer
                          if ((link.type === 'parrainage' && link.role === 'filleul') || link.type === 'parrainage-pro') {
                            setModalExternalReferrer(null)
                            client.externalReferrer = null
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
                            .filter(c => c.id !== client.id && !c.deleted)
                            .filter(c => !(client.clientLinks || []).some(l => l.clientId === c.id))
                            .filter(c => !modalAddLinkSearch || getClientName(c).toLowerCase().includes(modalAddLinkSearch.toLowerCase()))
                            .slice(0, 6)
                            .map(c => (
                              <div key={c.id} onClick={() => {
                                if (!client.clientLinks) client.clientLinks = []
                                client.clientLinks.push({ clientId: c.id, type: 'dossier' })
                                if (!c.clientLinks) c.clientLinks = []
                                c.clientLinks.push({ clientId: client.id, type: 'dossier' })
                                setModalShowAddLink(false); setModalAddLinkSearch('')
                              }} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '5px 6px', borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer', fontSize: '0.714rem', transition: 'background 0.15s'
                              }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(c)}</span>
                                <span style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                                  {getClientType(c) === 'individual' ? 'Individuel' : getClientType(c) === 'client' ? 'Client' : 'Famille'}
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
                  setEditPartnerA({ ...client.partnerA })
                  setEditPartnerB(client.partnerB ? { ...client.partnerB } : {})
                  setEditChildren(client.children || [])
                  setEditType(client ? getClientType(client) : 'individual')
                  setEditSource(client?.source || '')
                  setEditBillingAddress(client?.billingAddress || '')
                  setShowEditModal(false)
                  setShowDeleteConfirm(false)
                }}
                  style={{ fontSize: '0.857rem' }}
                >Annuler</button>
                <button className="btn btn-accent" style={{ fontSize: '0.857rem', padding: '8px 20px',
                    opacity: (isSaving || !(editPartnerA.lastName || '').trim() || ((editType === 'client' || editType === 'family') && !(editPartnerB.lastName || '').trim()) || ((editSource === 'referral' || editSource === 'parrainage') && modalExternalReferrer && !(modalExternalReferrer.lastName || '').trim())) ? 0.4 : 1
                  }}
                  disabled={isSaving || !(editPartnerA.lastName || '').trim() || ((editType === 'client' || editType === 'family') && !(editPartnerB.lastName || '').trim()) || ((editSource === 'referral' || editSource === 'parrainage') && modalExternalReferrer && !(modalExternalReferrer.lastName || '').trim())}
                  onClick={async () => {
                    try {
                      setIsSaving(true)
                      // Build updated values without mutating client directly
                      const updatedPartnerA = { ...editPartnerA, lastName: (editPartnerA.lastName || '').toUpperCase() }
                      const updatedPartnerB = (editType === 'client' || editType === 'family') ? { ...editPartnerB, lastName: (editPartnerB.lastName || '').toUpperCase() } : client.partnerB
                      
                      const updates = {
                        partnerA: updatedPartnerA,
                        partnerB: updatedPartnerB,
                        type: editType,
                        source: editSource || null,
                        billingAddress: editBillingAddress,
                        clientLinks: client.clientLinks ? [...client.clientLinks] : [],
                        externalReferrer: modalExternalReferrer || null
                      }
                      
                      // Local update for UI consistency
                      client.children = editType === 'family' ? [...editChildren] : null

                      // Auto-force source to 'parrainage' if a referrer is configured
                      if (modalSelectedReferrer || (modalExternalReferrer && modalExternalReferrer.lastName?.trim())) {
                        updates.source = 'parrainage'
                      }

                      // Handle parrainage logic on clones, not original objects
                      if (updates.source !== 'parrainage' && updates.source !== 'referral') {
                        updates.externalReferrer = null
                        updates.clientLinks = updates.clientLinks.filter(l => l.type !== 'parrainage')
                      } else {
                        // Internal Referrer Link
                        if (modalSelectedReferrer && modalSelectedReferrer.id !== client.id) {
                          if (!updates.clientLinks.some(l => l.type === 'parrainage' && l.clientId === modalSelectedReferrer.id)) {
                            updates.clientLinks.push({ clientId: modalSelectedReferrer.id, type: 'parrainage', role: 'filleul' })
                          }
                          // Note: Reverse link on modalSelectedReferrer should ideally be handled by a service or transaction
                          // For now, we follow the existing pattern but attempt to be safer
                          const updatedSelectedReferrerLinks = modalSelectedReferrer.clientLinks ? [...modalSelectedReferrer.clientLinks] : []
                          if (!updatedSelectedReferrerLinks.some(l => l.type === 'parrainage' && l.clientId === client.id)) {
                            updatedSelectedReferrerLinks.push({ clientId: client.id, type: 'parrainage', role: 'parrain' })
                            await utils.updateClient(modalSelectedReferrer.id, { clientLinks: updatedSelectedReferrerLinks })
                          }
                        }

                        // External Referrer Professional Logic
                        if (modalExternalReferrer && modalExternalReferrer.lastName?.trim()) {
                          const refType = modalExternalReferrer.referrerType || 'particulier'
                          const today = new Date().toISOString().split('T')[0]

                          if (refType === 'professionnel') {
                            const existingProLink = updates.clientLinks.find(l => l.type === 'parrainage-pro')
                            let existingPro = existingProLink ? professionals.find(p => p.id === existingProLink.proId) : null
                            if (!existingPro) {
                              existingPro = professionals.find(p =>
                                p.lastName === modalExternalReferrer.lastName.trim() &&
                                (p.firstName || '') === (modalExternalReferrer.firstName || '')
                              )
                            }

                            let proId
                            if (existingPro) {
                              const updatedReferrals = existingPro.referrals ? [...existingPro.referrals] : []
                              if (!updatedReferrals.some(r => r.clientId === client.id)) {
                                updatedReferrals.push({ clientId: client.id, date: today, clientName: getClientName({ ...client, partnerA: updatedPartnerA, partnerB: updatedPartnerB }) })
                              }
                              await utils.updatePro(existingPro.id, {
                                firstName: modalExternalReferrer.firstName || existingPro.firstName,
                                lastName: modalExternalReferrer.lastName.trim(),
                                email: modalExternalReferrer.email || existingPro.email,
                                phone: modalExternalReferrer.phone || existingPro.phone,
                                note: modalExternalReferrer.role || existingPro.note,
                                referrals: updatedReferrals
                              })
                              proId = existingPro.id
                            } else {
                              const newPro = await utils.createPro({
                                firstName: modalExternalReferrer.firstName || '',
                                lastName: modalExternalReferrer.lastName.trim(),
                                email: modalExternalReferrer.email || '',
                                phone: modalExternalReferrer.phone || '',
                                note: modalExternalReferrer.role || '',
                                createdAt: today,
                                referrals: [{ clientId: client.id, date: today, clientName: getClientName({ ...client, partnerA: updatedPartnerA, partnerB: updatedPartnerB }) }]
                              })
                              proId = newPro?.id || ('pro-' + Date.now())
                            }
                            if (!updates.clientLinks.some(l => l.type === 'parrainage-pro' && l.proId === proId)) {
                              updates.clientLinks.push({ type: 'parrainage-pro', proId, proName: `${modalExternalReferrer.firstName || ''} ${modalExternalReferrer.lastName}`.trim(), role: 'filleul' })
                            }
                          } else {
                            // Particulier Logic - ideally should also be an updateClient call if it exists
                            const existingLink = updates.clientLinks.find(l => l.type === 'parrainage' && l.role === 'filleul')
                            const existingProspect = existingLink ? clients.find(c => c.id === existingLink.clientId) : null
                            if (existingProspect) {
                              const prospectUpdates = {
                                partnerA: {
                                  ...existingProspect.partnerA,
                                  firstName: modalExternalReferrer.firstName || '',
                                  lastName: modalExternalReferrer.lastName.trim(),
                                  email: modalExternalReferrer.email || '',
                                  phone: modalExternalReferrer.phone || ''
                                },
                                referrerType: 'particulier',
                                note: modalExternalReferrer.role || ''
                              }
                              await utils.updateClient(existingProspect.id, prospectUpdates)
                            } else {
                              // Create New Prospect
                              const newProspect = {
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
                                clientLinks: [{ clientId: client.id, type: 'parrainage', role: 'parrain' }]
                              }
                              const created = await utils.createClient(newProspect)
                              if (created?.id) {
                                updates.clientLinks.push({ clientId: created.id, type: 'parrainage', role: 'filleul' })
                              }
                            }
                          }
                        }
                      }

                      // Persist main client identity changes to Supabase
                      const success = await utils.updateClient(client.id, updates)
                      if (success) {
                        setShowEditModal(false)
                      }
                    } catch (err) {
                      console.error("Error saving client identity:", err)
                      // Notify user of error
                      if (utils.showToast) utils.showToast("Erreur lors de la sauvegarde. Vérifiez les champs.", "error")
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                >
                  {isSaving ? '⌛ Enregistrement...' : '✓ Enregistrer'}
                </button>
              </div>
        </div>
      </div>
    </div>
  )
}

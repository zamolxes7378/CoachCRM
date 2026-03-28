import React from 'react'
import { useConfirm } from '../../context/ConfirmContext'
import {
  X, FileText, Mic, Sparkles, CheckCircle, XCircle, RefreshCw, Loader,
  Euro, Banknote, CreditCard, Landmark, Hourglass, Check, Receipt,
  Sprout, Calendar, Clock
} from 'lucide-react'

/**
 * Session Detail Modal — sliding panel for viewing/editing a single session.
 * Receives grouped state from useSessionModalState hook.
 */
export default function SessionDetailModal({
  session, couple, sessions, sessionNum,
  sessionModal,   // { sessionUpdates, expandedSessionId, rateOverrides, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions }
  sessionActions, // { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR }
  therapy,        // { phasesData, defaultPhaseKey, phaseIcons, phaseColors, sessionNumbers }
  utils           // { updateSession, formatDate, getCoupleName }
}) {
  if (!session) return null
  const confirm = useConfirm()

  // Destructure for convenience
  const { sessionUpdates, recordingSessionId, recordingStep, editingCoveredSessions, editingInvoiceSessions } = sessionModal
  const { setSessionUpdates, setExpandedSessionId, setRateOverrides, setEditingCoveredSessions, setEditingInvoiceSessions, getRate, handleStartRecording, handleSaveCR } = sessionActions
  const { phasesData: therapyPhasesData, defaultPhaseKey, phaseIcons, phaseColors, getPhaseColor, getPhaseIcon, sessionNumbers } = therapy
  const { updateSession, formatDate, getCoupleName } = utils

  const update = sessionUpdates[session.id]
  const hasReport = session.hasReport || update?.hasReport
  const summary = update?.summary || session.summary
  const isRecording = recordingSessionId === session.id
  const rate = getRate(session.id)
  const isPast = new Date(session.date) <= new Date()
  const pc = getPhaseColor(session.phase)
  const SessionPhaseIcon = getPhaseIcon(session.phase)

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
                        const Icon = getPhaseIcon(tp.key)
                        const pc = getPhaseColor(tp.key)
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
                      style={{ fontSize: '0.786rem', flex: '1.5 1 0' }}
                    />
                    
                    {/* Duration field — discrete and efficient */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '0 0 85px' }}>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        className="input"
                        value={session.duration ?? 60}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 0
                          session.duration = v
                          updateSession(session.id, { duration: v })
                          setSessionUpdates(prev => ({ ...prev, [session.id]: { ...prev[session.id], _dur: Date.now() } }))
                        }}
                        style={{ fontSize: '0.786rem', paddingRight: '28px', textAlign: 'center', paddingLeft: '8px' }}
                      />
                      <span style={{ 
                        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                        fontSize: '0.643rem', color: 'var(--text-tertiary)', pointerEvents: 'none',
                        fontWeight: 600
                      }}>min</span>
                    </div>

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
                        onClick={async () => {
                          // Block cancellation if payment method is set (except free sessions)
                          const sessionAmount = session.paymentAmount ?? getRate(session.id)
                          if (session.paymentMethod && sessionAmount > 0) {
                            await confirm('Impossible d\'annuler cette séance : un moyen de paiement est renseigné.\n\nVeuillez d\'abord supprimer le moyen de paiement avant d\'annuler la séance.', { variant: 'alert' })
                            return
                          }
                          if (!await confirm('Annuler cette séance ?')) return
                          session.status = 'cancelled'
                          session.paymentReceived = false
                          session.paymentMethod = null
                          updateSession(session.id, { status: 'cancelled', paymentReceived: false, paymentMethod: null })
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
                        value={rate ?? ''}
                        onChange={e => {
                          const raw = e.target.value
                          const v = raw === '' ? 0 : parseFloat(raw)
                          setRateOverrides(prev => ({ ...prev, [session.id]: v }))
                          // Always persist paymentAmount to DB when rate is changed
                          session.paymentAmount = v
                          updateSession(session.id, { paymentAmount: v })
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
                    {(() => {
                      const isFreeSession = rate === 0
                      // Check if this free session covers other paid sessions
                      const hasCoveredPaidSessions = isFreeSession && (session.coveredSessionIds || []).some(sid => {
                        if (sid === session.id) return false
                        const covS = sessions.find(s => s.id === sid)
                        return covS && (covS.paymentAmount ?? getRate(covS.id)) > 0
                      })
                      if (isFreeSession && !hasCoveredPaidSessions) return (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '10px 14px', borderRadius: 'var(--radius-md)',
                          fontSize: '0.857rem', fontWeight: 700,
                          border: '1px solid #FED7D7', background: '#FFF5F5', color: 'var(--error)'
                        }}>
                          Séance offerte
                        </div>
                      )
                      return (
                    <>
                      {isFreeSession && hasCoveredPaidSessions && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 'var(--radius-md)',
                          fontSize: '0.714rem', fontWeight: 700, marginBottom: 6,
                          border: '1px solid #FED7D7', background: '#FFF5F5', color: 'var(--error)'
                        }}>
                          Séance offerte — paiement pour les séances couvertes
                        </div>
                      )}
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
                              border: isActive ? '2px solid var(--primary-400)' : '2px solid transparent',
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
                    </>
                      )
                    })()}

                    {/* Warning: past session without payment method */}
                    {isPast && !session.paymentMethod && session.status !== 'cancelled' && (session.paymentAmount ?? rate) > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 10px', background: '#FFFBEB',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-sm)',
                        border: '1px solid #FEF3C7'
                      }}>
                        <span style={{ fontSize: '0.714rem', color: '#D97706', fontWeight: 600 }}>
                          Séance à confirmer — Veuillez renseigner le mode de paiement.
                        </span>
                      </div>
                    )}

                    {/* Montant du paiement (calculated, read-only) — hidden for free sessions */}
                    {(() => {
                      const pAmount = session.paymentAmount ?? rate
                      if (pAmount === 0) return null
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
                            {pAmount > 0 && session.paymentMethod && (
                              <button
                                onClick={() => {
                                  const newStatus = !session.paymentReceived
                                  session.paymentReceived = newStatus
                                  // Propagate to all covered sessions
                                  const coveredIds = session.coveredSessionIds?.length ? session.coveredSessionIds : [session.id]
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
                                {(session.coveredSessionIds?.length ? session.coveredSessionIds : [session.id]).map(sid => {
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
                                    const currentCovered = session.coveredSessionIds?.length ? session.coveredSessionIds : [session.id]
                                    if (currentCovered.includes(s.id)) return true
                                    if (s.id === session.id) return true
                                    return !sessions.some(other => other.id !== session.id && other.paymentReceived && (other.coveredSessionIds || [other.id]).includes(s.id))
                                  }).sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                                    const sNum = sessionNumbers[s.id]
                                    const coveredSessions = session.coveredSessionIds?.length ? session.coveredSessionIds : [session.id]
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
                                            const current = session.coveredSessionIds?.length ? session.coveredSessionIds : [session.id]
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
}

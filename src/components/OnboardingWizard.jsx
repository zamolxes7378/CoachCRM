import { useState } from 'react'
import { Heart, ChevronRight, ChevronLeft, Layers, Euro, Users, Plus, Trash2, Check, Sparkles, GripVertical } from 'lucide-react'
import { therapyPhases, defaultTherapyConfig, sessionRates, recruitmentSources } from '../data/constants'

const STEP_COUNT = 4

export default function OnboardingWizard({ user, onComplete }) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [animating, setAnimating] = useState(false)
  const [phasesVersion, setPhasesVersion] = useState(0)
  const [newPhaseLabel, setNewPhaseLabel] = useState('')
  const [newPhaseColor, setNewPhaseColor] = useState('#718096')
  const [newSourceLabel, setNewSourceLabel] = useState('')
  const [sourcesVersion, setSourcesVersion] = useState(0)

  const goTo = (next) => {
    if (animating || next === step) return
    setDirection(next > step ? 1 : -1)
    setAnimating(true)
    setTimeout(() => {
      setStep(next)
      setTimeout(() => setAnimating(false), 50)
    }, 220)
  }

  const next = () => { if (step < STEP_COUNT - 1) goTo(step + 1) }
  const prev = () => { if (step > 0) goTo(step - 1) }
  const finish = () => {
    localStorage.setItem('coachcrm_onboarding_done', 'true')
    onComplete()
  }

  const addPhase = () => {
    const label = newPhaseLabel.trim()
    if (!label) return
    const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (therapyPhases.some(p => p.key === key)) return
    therapyPhases.push({ key, label, color: newPhaseColor, bg: newPhaseColor + '18' })
    setNewPhaseLabel('')
    setNewPhaseColor('#718096')
    setPhasesVersion(n => n + 1)
  }

  const addSource = () => {
    const label = newSourceLabel.trim()
    if (!label) return
    const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (recruitmentSources.some(s => s.key === key)) return
    recruitmentSources.push({ key, label })
    setNewSourceLabel('')
    setSourcesVersion(n => n + 1)
  }

  const stepIcons = [
    <Heart size={15} />,
    <Layers size={15} />,
    <Euro size={15} />,
    <Users size={15} />
  ]
  const stepLabels = ['Bienvenue', 'Parcours', 'Tarifs', 'Sources']

  const steps = [
    // Step 0: Welcome
    () => (
      <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0 var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
          <Heart size={24} style={{ color: 'var(--accent-main)' }} />
          <span style={{ fontSize: '1.286rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Coach<span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>CRM</span>
          </span>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.3px' }}>
          Bienvenue, {user?.name?.split(' ')[0] || 'Thérapeute'} !
        </h2>
        <p style={{ fontSize: '0.929rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 400, margin: '0 auto' }}>
          Configurons votre espace en quelques instants.
        </p>
        <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
          Vous pourrez modifier ces réglages à tout moment.
        </p>
      </div>
    ),

    // Step 1: Therapy Phases
    () => (
      <div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '1.071rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Parcours thérapeutique</h3>
          <p style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>Étapes et nombre de séances par défaut</p>
        </div>

        {/* Default sessions */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
        }}>
          <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>Séances par défaut</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number" defaultValue={defaultTherapyConfig.totalSessions}
              min={1} max={100}
              onBlur={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v > 0) defaultTherapyConfig.totalSessions = v
                else e.target.value = defaultTherapyConfig.totalSessions
              }}
              style={{
                width: 56, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)',
                background: 'white', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)', padding: '4px 6px', textAlign: 'center', outline: 'none',
                fontFamily: 'var(--font-family)'
              }}
            />
            <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', fontWeight: 600 }}>séances</span>
          </div>
        </div>

        {/* Phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--space-sm)' }}>
          {therapyPhases.map((phase, idx) => (
            <div key={phase.key + idx + phasesVersion}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx); e.currentTarget.style.opacity = '0.4' }}
              onDragEnd={e => { e.currentTarget.style.opacity = '1'; document.querySelectorAll('[data-ob-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }) }}
              onDragOver={e => {
                e.preventDefault(); e.dataTransfer.dropEffect = 'move'
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                document.querySelectorAll('[data-ob-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' })
                if (e.clientY < mid) e.currentTarget.style.borderTop = '2px solid var(--accent-main)'
                else e.currentTarget.style.borderBottom = '2px solid var(--accent-main)'
              }}
              onDrop={e => {
                e.preventDefault()
                const from = parseInt(e.dataTransfer.getData('text/plain'))
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                let to = e.clientY < mid ? idx : idx + 1
                if (from === to || from + 1 === to) { document.querySelectorAll('[data-ob-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }); return }
                const [moved] = therapyPhases.splice(from, 1)
                if (from < to) to--
                therapyPhases.splice(to, 0, moved)
                setPhasesVersion(n => n + 1)
              }}
              data-ob-phase-drop
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: idx % 2 === 0 ? 'var(--primary-50)' : 'transparent',
                cursor: 'grab', transition: 'opacity 0.15s'
              }}>
              <GripVertical size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0, cursor: 'grab' }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 18 }}>{idx + 1}.</span>
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                background: phase.bg, border: `2px solid ${phase.color}`,
                flexShrink: 0, position: 'relative', overflow: 'hidden'
              }}>
                <input type="color" defaultValue={phase.color}
                  onChange={e => { phase.color = e.target.value; phase.bg = e.target.value + '18'; setPhasesVersion(n => n + 1) }}
                  style={{ position: 'absolute', inset: -4, opacity: 0, cursor: 'pointer', width: 'calc(100% + 8px)', height: 'calc(100% + 8px)' }}
                />
              </div>
              <input
                defaultValue={phase.label}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v && v !== phase.label) { phase.label = v; setPhasesVersion(n => n + 1) }
                  else e.target.value = phase.label
                }}
                style={{
                  flex: 1, fontSize: '0.857rem', fontWeight: 500, color: 'var(--text-primary)',
                  background: 'none', border: 'none', borderBottom: '1px dashed transparent',
                  padding: '2px 0', outline: 'none', transition: 'border-color 0.15s',
                  fontFamily: 'var(--font-family)'
                }}
                onFocus={e => e.target.style.borderBottomColor = 'var(--primary-300)'}
                onBlurCapture={e => e.target.style.borderBottomColor = 'transparent'}
              />
              <button
                onClick={() => { if (therapyPhases.length <= 1) return; therapyPhases.splice(idx, 1); setPhasesVersion(n => n + 1) }}
                style={{
                  background: 'none', border: 'none', color: therapyPhases.length <= 1 ? '#ccc' : 'var(--error)',
                  cursor: therapyPhases.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: 0.4, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', padding: 2
                }}
                onMouseEnter={e => { if (therapyPhases.length > 1) e.currentTarget.style.opacity = 1 }}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
              ><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="color" value={newPhaseColor} onChange={e => setNewPhaseColor(e.target.value)}
            style={{ width: 24, height: 24, border: '1px solid var(--border-light)', borderRadius: 3, padding: 1, cursor: 'pointer' }}
          />
          <input value={newPhaseLabel} onChange={e => setNewPhaseLabel(e.target.value)}
            placeholder="Nouvelle étape…"
            onKeyDown={e => { if (e.key === 'Enter') addPhase() }}
            style={{ flex: 1, fontSize: '0.786rem', padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--primary-50)', fontFamily: 'var(--font-family)' }}
          />
          <button onClick={addPhase} disabled={!newPhaseLabel.trim()}
            className="btn btn-accent"
            style={{ fontSize: '0.714rem', padding: '4px 10px', opacity: newPhaseLabel.trim() ? 1 : 0.4 }}
          ><Plus size={13} /> Ajouter</button>
        </div>
      </div>
    ),

    // Step 2: Session Rates
    () => (
      <div>
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: '1.071rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Tarifs des séances</h3>
          <p style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>Tarifs appliqués par défaut</p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
          {[
            { key: 'client', label: 'Séance client', icon: '👫', desc: 'Séance duo' },
            { key: 'individual', label: 'Séance individuelle', icon: '👤', desc: 'Suivi individuel' }
          ].map(item => (
            <div key={item.key} style={{
              flex: 1, padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)',
              background: 'var(--primary-50)', border: '1px solid var(--border-light)',
              textAlign: 'center', transition: 'all 0.2s'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-main)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: 6 }}>{item.icon}</span>
              <div style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{item.label}</div>
              <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>{item.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <input
                  type="number" defaultValue={sessionRates[item.key]}
                  min={0} step={5}
                  onBlur={e => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v) && v >= 0) sessionRates[item.key] = v
                    else e.target.value = sessionRates[item.key]
                  }}
                  style={{
                    width: 72, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)',
                    background: 'white', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', padding: '5px 8px', textAlign: 'right', outline: 'none',
                    fontFamily: 'var(--font-family)'
                  }}
                />
                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>€</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    // Step 3: Recruitment Sources
    () => (
      <div>
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <h3 style={{ fontSize: '1.071rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Sources de recrutement</h3>
          <p style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>Comment vos clients vous trouvent-ils ?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 'var(--space-sm)' }}>
          {recruitmentSources.map((src, idx) => (
            <div key={src.key + idx + sourcesVersion}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx); e.currentTarget.style.opacity = '0.4' }}
              onDragEnd={e => { e.currentTarget.style.opacity = '1'; document.querySelectorAll('[data-ob-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }) }}
              onDragOver={e => {
                e.preventDefault(); e.dataTransfer.dropEffect = 'move'
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                document.querySelectorAll('[data-ob-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' })
                if (e.clientY < mid) e.currentTarget.style.borderTop = '2px solid var(--accent-main)'
                else e.currentTarget.style.borderBottom = '2px solid var(--accent-main)'
              }}
              onDrop={e => {
                e.preventDefault()
                const from = parseInt(e.dataTransfer.getData('text/plain'))
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                let to = e.clientY < mid ? idx : idx + 1
                if (from === to || from + 1 === to) { document.querySelectorAll('[data-ob-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }); return }
                const [moved] = recruitmentSources.splice(from, 1)
                if (from < to) to--
                recruitmentSources.splice(to, 0, moved)
                setSourcesVersion(n => n + 1)
              }}
              data-ob-src-drop
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                background: idx % 2 === 0 ? 'var(--primary-50)' : 'transparent',
                cursor: 'grab', transition: 'opacity 0.15s'
              }}>
              <GripVertical size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0, cursor: 'grab' }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 18 }}>{idx + 1}.</span>
              <input
                defaultValue={src.label}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v && v !== src.label) { src.label = v; setSourcesVersion(n => n + 1) }
                  else e.target.value = src.label
                }}
                style={{
                  flex: 1, fontSize: '0.857rem', fontWeight: 500, color: 'var(--text-primary)',
                  background: 'none', border: 'none', borderBottom: '1px dashed transparent',
                  padding: '2px 0', outline: 'none', transition: 'border-color 0.15s',
                  fontFamily: 'var(--font-family)'
                }}
                onFocus={e => e.target.style.borderBottomColor = 'var(--primary-300)'}
                onBlurCapture={e => e.target.style.borderBottomColor = 'transparent'}
              />
              <button
                onClick={() => { if (recruitmentSources.length <= 1) return; recruitmentSources.splice(idx, 1); setSourcesVersion(n => n + 1) }}
                style={{
                  background: 'none', border: 'none', color: recruitmentSources.length <= 1 ? '#ccc' : 'var(--error)',
                  cursor: recruitmentSources.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: 0.4, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', padding: 2
                }}
                onMouseEnter={e => { if (recruitmentSources.length > 1) e.currentTarget.style.opacity = 1 }}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
              ><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input value={newSourceLabel} onChange={e => setNewSourceLabel(e.target.value)}
            placeholder="Nouvelle source…"
            onKeyDown={e => { if (e.key === 'Enter') addSource() }}
            style={{ flex: 1, fontSize: '0.786rem', padding: '5px 10px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', outline: 'none', background: 'var(--primary-50)', fontFamily: 'var(--font-family)' }}
          />
          <button onClick={addSource} disabled={!newSourceLabel.trim()}
            className="btn btn-accent"
            style={{ fontSize: '0.714rem', padding: '4px 10px', opacity: newSourceLabel.trim() ? 1 : 0.4 }}
          ><Plus size={13} /> Ajouter</button>
        </div>
      </div>
    )
  ]

  const isLast = step === STEP_COUNT - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-800) 0%, var(--primary-900) 100%)',
      animation: 'obFadeIn 0.4s ease-out'
    }}>
      {/* Main card */}
      <div style={{
        width: '100%', maxWidth: 540,
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Step indicator bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0,
          padding: '16px 32px 0'
        }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => goTo(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderBottom: i === step ? '2px solid var(--accent-main)' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (i !== step) e.currentTarget.style.borderBottomColor = 'var(--border-medium)' }}
                onMouseLeave={e => { if (i !== step) e.currentTarget.style.borderBottomColor = 'transparent' }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                  background: i < step ? 'var(--accent-main)' : 'var(--primary-50)',
                  color: i < step ? 'white' : i === step ? 'var(--accent-main)' : 'var(--text-tertiary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', fontSize: '0.643rem'
                }}>
                  {i < step ? <Check size={11} strokeWidth={3} /> : stepIcons[i]}
                </div>
                <span style={{
                  fontSize: '0.714rem', fontWeight: 600,
                  color: i === step ? 'var(--accent-main)' : i < step ? 'var(--accent-dark)' : 'var(--text-tertiary)',
                  transition: 'color 0.2s'
                }}>{label}</span>
              </div>
              {i < STEP_COUNT - 1 && (
                <div style={{
                  width: 16, height: 1,
                  background: i < step ? 'var(--accent-main)' : 'var(--border-light)',
                  transition: 'background 0.3s'
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 32px 12px', minHeight: 300, overflow: 'hidden' }}>
          <div
            key={step}
            style={{
              animation: animating
                ? `obOut${direction > 0 ? 'L' : 'R'} 0.22s ease-in forwards`
                : `obIn${direction > 0 ? 'R' : 'L'} 0.28s ease-out`
            }}
          >
            {steps[step]()}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 32px 18px',
          borderTop: '1px solid var(--border-light)'
        }}>
          <div>
            {step > 0 ? (
              <button onClick={prev} className="btn btn-ghost"
                style={{ fontSize: '0.786rem', padding: '6px 10px' }}
              >
                <ChevronLeft size={15} /> Précédent
              </button>
            ) : (
              <button onClick={finish}
                style={{
                  fontSize: '0.714rem', fontWeight: 500, color: 'var(--text-tertiary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '6px 4px', transition: 'color 0.15s', fontFamily: 'var(--font-family)'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                Passer
              </button>
            )}
          </div>
          <button
            onClick={isLast ? finish : next}
            className="btn btn-accent"
            style={{ fontSize: '0.857rem', padding: '8px 18px' }}
          >
            {isLast ? (
              <><Sparkles size={15} /> Commencer</>
            ) : step === 0 ? (
              <><span>C'est parti</span> <ChevronRight size={15} /></>
            ) : (
              <><span>Suivant</span> <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes obFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes obInR { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes obInL { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes obOutL { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(-30px); } }
        @keyframes obOutR { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30px); } }
      `}</style>
    </div>
  )
}

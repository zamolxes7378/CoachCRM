import { useState } from 'react'
import { Settings, Calendar, RefreshCw, CheckCircle, Bell, Shield, Euro, Layers, Plus, Trash2, GripVertical } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function SettingsPage() {
  const {
    sessionRates, recruitmentSources, therapyPhases, defaultTherapyConfig,
    upsertSettings
  } = useData()

  const [googleSync, setGoogleSync] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [notifications, setNotifications] = useState({ reminder: true, report: true, invoice: false })
  const [localSources, setLocalSources] = useState(recruitmentSources)
  const [localPhases, setLocalPhases] = useState(therapyPhases)
  const [localRates, setLocalRates] = useState(sessionRates)
  const [localTotalSessions, setLocalTotalSessions] = useState(defaultTherapyConfig.totalSessions)
  const [newSourceLabel, setNewSourceLabel] = useState('')
  const [newPhaseLabel, setNewPhaseLabel] = useState('')
  const [newPhaseColor, setNewPhaseColor] = useState('#718096')

  // Persist helpers
  const persistRates = (rates) => {
    setLocalRates(rates)
    upsertSettings({ session_rates: rates })
  }

  const persistSources = (sources) => {
    setLocalSources(sources)
    upsertSettings({ recruitment_sources: sources.map(s => s.label) })
  }

  const persistPhases = (phases) => {
    setLocalPhases(phases)
    upsertSettings({ therapy_phases: phases })
  }

  const persistTotalSessions = (total) => {
    setLocalTotalSessions(total)
    upsertSettings({ default_therapy_config: { totalSessions: total } })
  }

  const addSource = () => {
    const label = newSourceLabel.trim()
    if (!label) return
    const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (localSources.some(s => s.key === key)) return
    const updated = [...localSources, { key, label }]
    setNewSourceLabel('')
    persistSources(updated)
  }

  const handleGoogleSync = () => {
    if (googleSync) {
      setGoogleSync(false)
      return
    }
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setGoogleSync(true)
    }, 2000)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Settings size={24} /> Paramètres
        </h1>
      </div>

      {/* Google Calendar Integration */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <Calendar size={22} />
          <h3>Synchronisation Google Calendar</h3>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-lg)',
          padding: 'var(--space-md)',
          background: googleSync ? '#F0FFF4' : 'var(--primary-50)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)',
          border: googleSync ? '1px solid #C6F6D5' : '1px solid transparent',
          transition: 'all 0.3s ease'
        }}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg"
            alt="Google Calendar"
            style={{ width: 48, height: 48 }}
            onError={e => { e.target.style.display = 'none' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>Google Calendar</div>
            <div style={{ fontSize: '0.857rem', color: googleSync ? 'var(--success)' : 'var(--text-tertiary)', marginTop: 4 }}>
              {syncing ? 'Connexion en cours…' : googleSync ? '✓ Connecté — anne-chantal.dupont@gmail.com' : 'Connectez votre agenda pour synchroniser automatiquement les séances de tous vos clients'}
            </div>
            {googleSync && (
              <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                Dernière synchronisation : il y a 2 minutes
              </div>
            )}
          </div>
          <button
            className={`btn ${googleSync ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleGoogleSync}
            disabled={syncing}
            style={{ opacity: syncing ? 0.6 : 1 }}
          >
            {syncing ? (
              <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Connexion…</>
            ) : (
              <><RefreshCw size={16} /> {googleSync ? 'Déconnecter' : 'Connecter Google Calendar'}</>
            )}
          </button>
        </div>

        <div style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-md)' }}>
          <p style={{ marginBottom: 'var(--space-sm)', fontWeight: 600 }}>La synchronisation permet de :</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
            {[
              'Importer automatiquement vos RDV',
              'Créer des événements à la planification',
              'Recevoir des rappels avant chaque séance',
              'Synchroniser les annulations'
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: '0.786rem' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {googleSync && (
          <div style={{
            padding: 'var(--space-sm) var(--space-md)',
            background: '#F0FFF4',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.786rem', color: 'var(--success)',
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <CheckCircle size={14} />
            Tous vos clients sont synchronisés avec votre agenda Google. Les nouveaux RDV seront automatiquement ajoutés.
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <Bell size={22} />
          <h3>Notifications</h3>
        </div>
        {[
          { key: 'reminder', label: 'Rappel avant séance', desc: 'Recevoir un rappel 1h avant chaque séance' },
          { key: 'report', label: 'Compte-rendu en attente', desc: 'Alerter quand un CR n\'a pas été rédigé sous 48h' },
          { key: 'invoice', label: 'Facture en attente', desc: 'Alerter quand une facture n\'a pas été envoyée' }
        ].map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-sm) 0',
            borderBottom: '1px solid var(--border-light)'
          }}>
            <div>
              <div style={{ fontSize: '0.929rem', fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)' }}>{item.desc}</div>
            </div>
            <div
              onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
              style={{
                width: 38, height: 20, borderRadius: 10,
                background: notifications[item.key] ? 'var(--primary-800)' : 'var(--primary-200)',
                position: 'relative', transition: 'background 0.25s ease',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                background: 'white', position: 'absolute', top: 2,
                left: notifications[item.key] ? 20 : 2,
                transition: 'left 0.25s ease'
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Session Rates */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <Euro size={22} />
          <h3>Tarifs des séances</h3>
        </div>
        <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
          Tarifs appliqués par défaut lors de la création d'une séance.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
          {[
            { key: 'client', label: 'Séance client', icon: '👫' },
            { key: 'individual', label: 'Séance individuelle', icon: '👤' }
          ].map(item => (
            <div key={item.key} style={{
              flex: 1, padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
              background: 'var(--primary-50)', border: '1px solid var(--border-light)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{item.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number"
                    defaultValue={localRates[item.key]}
                    min={0}
                    step={5}
                    onBlur={e => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v >= 0) {
                        persistRates({ ...localRates, [item.key]: v })
                      } else {
                        e.target.value = localRates[item.key]
                      }
                    }}
                    style={{
                      width: 80, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)',
                      background: 'white', border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)', padding: '4px 8px', textAlign: 'right',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>€</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Therapy Phases */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <Layers size={22} />
          <h3>Parcours thérapeutique</h3>
        </div>
        <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
          Définissez les étapes de votre parcours thérapeutique et le nombre de séances par défaut.
        </p>

        {/* Default session count */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--primary-50)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)', border: '1px solid var(--border-light)'
        }}>
          <div>
            <div style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)' }}>Nombre de séances par défaut</div>
            <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', marginTop: 2 }}>Appliqué automatiquement à chaque nouveau dossier</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              defaultValue={localTotalSessions}
              min={1}
              max={100}
              onBlur={e => {
                const v = parseInt(e.target.value)
                if (!isNaN(v) && v > 0) {
                  persistTotalSessions(v)
                } else {
                  e.target.value = localTotalSessions
                }
              }}
              style={{
                width: 60, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)',
                background: 'white', border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)', padding: '4px 8px', textAlign: 'center',
                outline: 'none'
              }}
            />
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-secondary)' }}>séances</span>
          </div>
        </div>

        {/* Phases list */}
        <div style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>Étapes du parcours</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localPhases.map((phase, idx) => (
            <div key={phase.key + idx}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx); e.currentTarget.style.opacity = '0.4' }}
              onDragEnd={e => { e.currentTarget.style.opacity = '1'; document.querySelectorAll('[data-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }) }}
              onDragOver={e => {
                e.preventDefault(); e.dataTransfer.dropEffect = 'move'
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                document.querySelectorAll('[data-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' })
                if (e.clientY < mid) e.currentTarget.style.borderTop = '2px solid var(--accent-main)'
                else e.currentTarget.style.borderBottom = '2px solid var(--accent-main)'
              }}
              onDrop={e => {
                e.preventDefault()
                const from = parseInt(e.dataTransfer.getData('text/plain'))
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                let to = e.clientY < mid ? idx : idx + 1
                if (from === to || from + 1 === to) { document.querySelectorAll('[data-phase-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }); return }
                const updated = [...localPhases]
                const [moved] = updated.splice(from, 1)
                if (from < to) to--
                updated.splice(to, 0, moved)
                persistPhases(updated)
              }}
              data-phase-drop
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: idx % 2 === 0 ? 'var(--primary-50)' : 'transparent',
                cursor: 'grab', transition: 'opacity 0.15s'
              }}>
              <GripVertical size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, cursor: 'grab' }} />
              <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 20 }}>{idx + 1}.</span>
              <div style={{
                width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                background: phase.bg, border: `2px solid ${phase.color}`,
                flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <input
                  type="color"
                  defaultValue={phase.color}
                  onChange={e => {
                    const updated = localPhases.map((p, i) => i === idx ? { ...p, color: e.target.value, bg: e.target.value + '18' } : p)
                    persistPhases(updated)
                  }}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  title="Changer la couleur"
                />
              </div>
              <input
                defaultValue={phase.label}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v && v !== phase.label) {
                    const updated = localPhases.map((p, i) => i === idx ? { ...p, label: v } : p)
                    persistPhases(updated)
                  } else {
                    e.target.value = phase.label
                  }
                }}
                style={{
                  flex: 1, fontSize: '0.857rem', fontWeight: 500, color: 'var(--text-primary)',
                  background: 'none', border: 'none', borderBottom: '1px dashed transparent',
                  padding: '2px 0', outline: 'none',
                  transition: 'border-color 0.15s'
                }}
                onFocus={e => e.target.style.borderBottomColor = 'var(--primary-300)'}
                onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottomColor = 'transparent' }}
              />
              <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{phase.key}</span>
              <button
                onClick={() => {
                  if (localPhases.length <= 1) return
                  const updated = localPhases.filter((_, i) => i !== idx)
                  persistPhases(updated)
                }}
                style={{
                  background: 'none', border: 'none', cursor: localPhases.length <= 1 ? 'not-allowed' : 'pointer',
                  color: localPhases.length <= 1 ? 'var(--text-tertiary)' : 'var(--error)',
                  padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                  opacity: localPhases.length <= 1 ? 0.3 : 0.6,
                  transition: 'opacity 0.15s', display: 'flex', alignItems: 'center'
                }}
                onMouseEnter={e => { if (localPhases.length > 1) e.currentTarget.style.opacity = 1 }}
                onMouseLeave={e => e.currentTarget.style.opacity = localPhases.length <= 1 ? 0.3 : 0.6}
                title="Supprimer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="color"
            value={newPhaseColor}
            onChange={e => setNewPhaseColor(e.target.value)}
            style={{ width: 28, height: 28, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: 1, cursor: 'pointer' }}
            title="Couleur de l'étape"
          />
          <input
            value={newPhaseLabel}
            onChange={e => setNewPhaseLabel(e.target.value)}
            placeholder="Nouvelle étape…"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const label = newPhaseLabel.trim()
                if (!label) return
                const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
                if (localPhases.some(p => p.key === key)) return
                const updated = [...localPhases, { key, label, color: newPhaseColor, bg: newPhaseColor + '18' }]
                setNewPhaseLabel('')
                setNewPhaseColor('#718096')
                persistPhases(updated)
              }
            }}
            style={{
              flex: 1, fontSize: '0.857rem', padding: '6px 10px',
              border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
              outline: 'none', background: 'var(--primary-50)'
            }}
          />
          <button
            onClick={() => {
              const label = newPhaseLabel.trim()
              if (!label) return
              const key = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
              if (localPhases.some(p => p.key === key)) return
              const updated = [...localPhases, { key, label, color: newPhaseColor, bg: newPhaseColor + '18' }]
              setNewPhaseLabel('')
              setNewPhaseColor('#718096')
              persistPhases(updated)
            }}
            disabled={!newPhaseLabel.trim()}
            className="btn btn-primary"
            style={{ fontSize: '0.786rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      {/* Recruitment Sources */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          <h3>Sources de recrutement</h3>
        </div>
        <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
          Gérez les sources de prospection disponibles pour vos fiches clients.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {localSources.map((src, idx) => (
            <div key={src.key + idx}
              draggable
              onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx); e.currentTarget.style.opacity = '0.4' }}
              onDragEnd={e => { e.currentTarget.style.opacity = '1'; document.querySelectorAll('[data-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }) }}
              onDragOver={e => {
                e.preventDefault(); e.dataTransfer.dropEffect = 'move'
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                document.querySelectorAll('[data-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' })
                if (e.clientY < mid) e.currentTarget.style.borderTop = '2px solid var(--accent-main)'
                else e.currentTarget.style.borderBottom = '2px solid var(--accent-main)'
              }}
              onDrop={e => {
                e.preventDefault()
                const from = parseInt(e.dataTransfer.getData('text/plain'))
                const rect = e.currentTarget.getBoundingClientRect()
                const mid = rect.top + rect.height / 2
                let to = e.clientY < mid ? idx : idx + 1
                if (from === to || from + 1 === to) { document.querySelectorAll('[data-src-drop]').forEach(el => { el.style.borderTop = 'none'; el.style.borderBottom = 'none' }); return }
                const updated = [...localSources]
                const [moved] = updated.splice(from, 1)
                if (from < to) to--
                updated.splice(to, 0, moved)
                persistSources(updated)
              }}
              data-src-drop
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: idx % 2 === 0 ? 'var(--primary-50)' : 'transparent',
                cursor: 'grab', transition: 'opacity 0.15s'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GripVertical size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, cursor: 'grab' }} />
                <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', minWidth: 20 }}>{idx + 1}.</span>
                <input
                  defaultValue={src.label}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (v && v !== src.label) {
                      const updated = localSources.map((s, i) => i === idx ? { ...s, label: v } : s)
                      persistSources(updated)
                    } else {
                      e.target.value = src.label
                    }
                  }}
                  style={{
                    fontSize: '0.857rem', fontWeight: 500, color: 'var(--text-primary)',
                    background: 'none', border: 'none', borderBottom: '1px dashed transparent',
                    padding: '2px 0', outline: 'none', width: 200,
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--primary-300)'}
                  onMouseLeave={e => { if (document.activeElement !== e.target) e.target.style.borderBottomColor = 'transparent' }}
                />
                <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{src.key}</span>
              </div>
              <button
                onClick={() => {
                  if (localSources.length <= 1) return
                  const updated = localSources.filter((_, i) => i !== idx)
                  persistSources(updated)
                }}
                style={{
                  background: 'none', border: 'none', cursor: localSources.length <= 1 ? 'not-allowed' : 'pointer',
                  color: localSources.length <= 1 ? 'var(--text-tertiary)' : 'var(--error)',
                  fontSize: '0.786rem', padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                  opacity: localSources.length <= 1 ? 0.3 : 0.6,
                  transition: 'opacity 0.15s'
                }}
                onMouseEnter={e => { if (localSources.length > 1) e.target.style.opacity = 1 }}
                onMouseLeave={e => e.target.style.opacity = localSources.length <= 1 ? 0.3 : 0.6}
                title="Supprimer"
              >✕</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 8 }}>
          <input
            value={newSourceLabel}
            onChange={e => setNewSourceLabel(e.target.value)}
            placeholder="Nouvelle source…"
            onKeyDown={e => { if (e.key === 'Enter') addSource() }}
            style={{
              flex: 1, fontSize: '0.857rem', padding: '6px 10px',
              border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)',
              outline: 'none', background: 'var(--primary-50)'
            }}
          />
          <button
            onClick={addSource}
            disabled={!newSourceLabel.trim()}
            className="btn btn-primary"
            style={{ fontSize: '0.786rem', padding: '6px 14px' }}
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* Account Security */}
      <div className="card">
        <div className="card-header">
          <Shield size={22} />
          <h3>Sécurité</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) 0' }}>
          <div>
            <div style={{ fontSize: '0.929rem', fontWeight: 500 }}>Mot de passe</div>
            <div style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)' }}>Dernier changement il y a 3 mois</div>
          </div>
          <button className="btn btn-secondary" style={{ fontSize: '0.786rem' }}>Modifier</button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

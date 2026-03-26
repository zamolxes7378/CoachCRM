import React from 'react'
import { BookOpen, Heart, Crosshair, AlertCircle, Target, CheckCircle, FileText, Sparkles, Mic, X } from 'lucide-react'

const CATEGORIES = [
  { key: 'dynamique', icon: Heart, color: '#E53E3E', bg: '#FFF5F5', label: 'Dynamique relationnelle', placeholder: 'Qualité de la communication, patterns d\'attachement, dynamique de pouvoir…' },
  { key: 'axes', icon: Crosshair, color: '#2B6CB0', bg: '#EBF8FF', label: 'Axes de travail', placeholder: 'Thèmes récurrents, compétences à développer, exercices en cours…' },
  { key: 'vigilance', icon: AlertCircle, color: '#DD6B20', bg: '#FFFAF0', label: 'Points de vigilance', placeholder: 'Risques identifiés, fragilités, contre-transfert, signaux d\'alerte…' },
  { key: 'objectifs', icon: Target, color: '#38A169', bg: '#F0FFF4', label: 'Objectifs thérapeutiques', placeholder: 'Objectifs à court/moyen terme, critères de réussite…' }
]

export default function NotesModal({ coupleName, noteCategories, setNoteCategories, globalNote, setGlobalNote, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        zIndex: 999, animation: 'fadeIn 0.2s'
      }} />
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
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} style={{ color: 'var(--primary-500)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.857rem', fontWeight: 700, color: 'var(--text-primary)' }}>Mes notes du dossier</div>
              <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>{coupleName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'var(--bg-main)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>

          {/* Structured categories */}
          {CATEGORIES.map(cat => {
            const CatIcon = cat.icon
            const hasContent = noteCategories[cat.key]?.trim()
            return (
              <div key={cat.key} style={{ marginBottom: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CatIcon size={13} style={{ color: cat.color }} />
                  </div>
                  <span style={{ fontSize: '0.786rem', fontWeight: 600, color: cat.color }}>{cat.label}</span>
                  {hasContent && <CheckCircle size={12} style={{ color: 'var(--success)', marginLeft: 'auto' }} />}
                </div>
                <textarea
                  value={noteCategories[cat.key]}
                  onChange={e => setNoteCategories(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  onKeyDown={e => e.stopPropagation()}
                  placeholder={cat.placeholder}
                  rows={3}
                  style={{
                    width: '100%', fontSize: '0.786rem', lineHeight: 1.6,
                    border: `1px solid ${hasContent ? cat.color + '30' : 'var(--border-light)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-sm)', resize: 'vertical',
                    background: hasContent ? cat.bg + '80' : 'var(--bg-main)',
                    fontFamily: 'inherit', color: 'var(--text-primary)',
                    transition: 'border-color 0.2s, background 0.2s'
                  }}
                />
              </div>
            )
          })}

          {/* Separator */}
          <div style={{ borderTop: '1px solid var(--border-light)', margin: 'var(--space-md) 0', paddingTop: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notes libres</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <button
                  onClick={() => {
                    if (!globalNote.trim()) return
                    const btn = document.getElementById('modal-note-ai-btn')
                    if (btn) { btn.textContent = '✨ Amélioration…'; btn.disabled = true }
                    setTimeout(() => {
                      setGlobalNote(prev => prev.trim() + '\n\n[✨ Texte amélioré par l\'IA]')
                      if (btn) { btn.textContent = '✨ Améliorer'; btn.disabled = false }
                    }, 2000)
                  }}
                  id="modal-note-ai-btn"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none', color: 'white', borderRadius: 20,
                    padding: '4px 12px', fontSize: '0.643rem', fontWeight: 600,
                    cursor: globalNote.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 4,
                    opacity: globalNote.trim() ? 1 : 0.5,
                    boxShadow: '0 2px 6px rgba(118,75,162,0.2)',
                    transition: 'transform 0.15s'
                  }}
                >
                  <Sparkles size={11} /> Améliorer
                </button>
                <button
                  onClick={() => {
                    const isRec = document.getElementById('modal-note-mic')?.dataset.recording === 'true'
                    const btn = document.getElementById('modal-note-mic')
                    if (isRec) {
                      btn.dataset.recording = 'false'
                      btn.style.background = 'var(--bg-main)'
                      btn.style.color = 'var(--text-secondary)'
                      setTimeout(() => {
                        setGlobalNote(prev => (prev ? prev + ' ' : '') + 'Notes dictées par le thérapeute.')
                      }, 500)
                    } else {
                      btn.dataset.recording = 'true'
                      btn.style.background = 'var(--error)'
                      btn.style.color = 'white'
                    }
                  }}
                  id="modal-note-mic"
                  data-recording="false"
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-main)', color: 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                  title="Dicter une note"
                >
                  <Mic size={14} />
                </button>
              </div>
            </div>
            <textarea
              value={globalNote}
              onChange={e => setGlobalNote(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="Rédigez vos notes libres pour ce dossier…"
              rows={6}
              style={{
                width: '100%', fontSize: '0.786rem', lineHeight: 1.7,
                border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm)', resize: 'vertical',
                background: 'var(--bg-main)', fontFamily: 'inherit',
                color: 'var(--text-primary)'
              }}
            />
            <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mic size={10} /> Vous pouvez dicter ou améliorer vos notes avec l'IA
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

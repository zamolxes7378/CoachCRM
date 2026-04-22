import React, { useRef, useState } from 'react'
import { Download, Lock, Shield } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useEscapeKey } from '../hooks/useEscapeKey'

/**
 * Modal de confirmation avant export d'un dossier client (données Art. 9 RGPD).
 *
 * Props:
 *   clientInitials {string}  — ex. "JD"
 *   onConfirm(password)      — appelé avec le mot de passe (ou null si vide)
 *   onCancel()
 */
export default function ExportConfirmModal({ clientInitials, onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  const [consented, setConsented] = useState(false)
  const [usePassword, setUsePassword] = useState(false)
  const [password, setPassword] = useState('')

  useFocusTrap(dialogRef, true)
  useEscapeKey(onCancel, true)

  function handleConfirm() {
    if (!consented) return
    onConfirm(usePassword && password ? password : null)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={onCancel}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="export-confirm-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          padding: '32px',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-full)',
          background: '#DBEAFE', color: '#1E3A8A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }} aria-hidden="true">
          <Download size={28} />
        </div>

        <h3 id="export-confirm-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          Exporter le dossier {clientInitials}
        </h3>

        {/* RGPD notice */}
        <div style={{
          background: '#FEF3C7', border: '1px solid #F59E0B',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Shield size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <p style={{ fontSize: '0.8rem', color: '#92400E', lineHeight: 1.55, margin: 0 }}>
            Ce dossier contient des données sensibles (Art. 9 RGPD). Le fichier exporté sera marqué{' '}
            <strong>« Document confidentiel »</strong> et tracé dans le journal d'audit.
            Veillez à ne le transmettre qu'au professionnel destinataire.
          </p>
        </div>

        {/* Optional password */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.857rem', color: 'var(--text-primary)', marginBottom: usePassword ? 10 : 0 }}>
            <input
              type="checkbox"
              checked={usePassword}
              onChange={e => setUsePassword(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <Lock size={14} aria-hidden="true" />
            Protéger par mot de passe (optionnel)
          </label>
          {usePassword && (
            <div style={{ marginTop: 8 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mot de passe du fichier"
                autoComplete="new-password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 12px', fontSize: '0.857rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input, var(--bg-card))',
                  color: 'var(--text-primary)',
                }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Note : la protection par mot de passe n'est pas encore disponible — le fichier sera généré sans chiffrement.
              </p>
            </div>
          )}
        </div>

        {/* Consent checkbox */}
        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
          marginBottom: 24, fontSize: '0.857rem', color: 'var(--text-primary)', lineHeight: 1.5,
        }}>
          <input
            type="checkbox"
            checked={consented}
            onChange={e => setConsented(e.target.checked)}
            style={{ marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
            aria-describedby="consent-desc"
          />
          <span id="consent-desc">
            Je confirme que cet export est <strong>nécessaire à des fins professionnelles</strong> et que
            je respecterai les obligations de confidentialité liées aux données Art. 9 RGPD.
          </span>
        </label>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} style={{ fontSize: '0.857rem', padding: '8px 20px' }}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!consented}
            style={{ fontSize: '0.857rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Download size={15} aria-hidden="true" />
            Exporter
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

/**
 * IdleWarningModal — shown 2 minutes before forced logout.
 * French UI to match the rest of the application.
 *
 * Props:
 *   visible    {boolean}    — whether to show the modal
 *   secondsLeft {number}   — countdown in seconds (caller maintains this)
 *   onStay     {() => void} — user clicked "Rester connecté"
 *   onLogout   {() => void} — user clicked "Se déconnecter"
 */
export default function IdleWarningModal({ visible, secondsLeft, onStay, onLogout }) {
  if (!visible) return null

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdown = minutes > 0
    ? `${minutes} min ${String(seconds).padStart(2, '0')} s`
    : `${seconds} s`

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-desc"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px 36px',
        maxWidth: 400,
        width: '90%',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: '#FEF5E7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <Clock size={28} style={{ color: '#DAA520' }} />
        </div>

        <h2
          id="idle-title"
          style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-700, #1A2332)', marginBottom: 10 }}
        >
          Session sur le point d'expirer
        </h2>

        <p
          id="idle-desc"
          style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #6B7280)', lineHeight: 1.6, marginBottom: 8 }}
        >
          Vous avez été inactif(ve). Pour protéger vos données, vous serez déconnecté(e) dans :
        </p>

        <div style={{
          fontSize: '1.8rem', fontWeight: 800,
          color: secondsLeft <= 30 ? '#E53E3E' : '#DAA520',
          marginBottom: 24,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {countdown}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onLogout}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: 'transparent',
              border: '1.5px solid rgba(0,0,0,0.15)',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
              color: 'var(--text-secondary, #6B7280)',
              transition: 'background 0.15s'
            }}
          >
            Se déconnecter
          </button>
          <button
            autoFocus
            onClick={onStay}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              background: 'linear-gradient(135deg, #DAA520 0%, #F6AD55 100%)',
              border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 700, color: '#1A2332',
              boxShadow: '0 2px 8px rgba(218,165,32,0.3)',
              transition: 'transform 0.15s'
            }}
          >
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  )
}

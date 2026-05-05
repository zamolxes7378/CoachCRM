import React, { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'

export default function DeleteConfirmModal({ client, clientName, onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  useFocusTrap(dialogRef, true)
  useEscapeKey(onCancel, true)
  return (
    <div className="modal-overlay" style={{ zIndex: 10001 }} onClick={onCancel}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          padding: '32px',
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-full)',
          background: '#FEE2E2', color: 'var(--error)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-md)'
        }} aria-hidden="true">
          <Trash2 size={28} />
        </div>
        <h3 id="delete-confirm-title" style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Supprimer ce client ?
        </h3>
        <p style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
          La fiche de <strong>{clientName}</strong> sera déplacée dans les clients archivés. Vous pourrez la restaurer depuis la section Administration.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel}
            style={{ fontSize: '0.857rem', padding: '8px 20px' }}
          >Annuler</button>
          <button className="btn" style={{
            fontSize: '0.857rem', padding: '8px 20px',
            background: 'var(--error)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600,
            fontFamily: 'var(--font-family)', display: 'flex', alignItems: 'center', gap: 4
          }}
            onClick={onConfirm}
          >
            <Trash2 size={15} /> Confirmer la suppression
          </button>
        </div>
      </div>
    </div>
  )
}

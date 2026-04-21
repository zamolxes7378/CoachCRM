import React from 'react'

export function AiTransparencyBanner({ report, onValidate }) {
  if (!report.ai_generated) return null

  if (report.reviewed_at) {
    const date = new Date(report.reviewed_at).toLocaleDateString('fr-FR')
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 6,
        background: '#F0FDF4',
        border: '1px solid var(--success, #22C55E)',
        color: 'var(--success, #166534)',
        fontSize: '0.875rem',
        marginBottom: 8,
      }}>
        <span>✨ Généré par IA</span>
        <span style={{ color: 'var(--text-secondary)', margin: '0 4px' }}>·</span>
        <span style={{ color: 'var(--success, #166534)', fontWeight: 500 }}>
          Validé le {date}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 6,
      background: '#FFFBEB',
      border: '1px solid var(--warning, #F59E0B)',
      color: '#92400E',
      fontSize: '0.875rem',
      marginBottom: 8,
    }}>
      <span>✨ Généré par IA — vérifiez avant utilisation</span>
      <button
        onClick={onValidate}
        style={{
          marginLeft: 'auto',
          padding: '4px 10px',
          borderRadius: 4,
          border: 'none',
          background: 'var(--primary-600, #2563EB)',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        Valider
      </button>
    </div>
  )
}

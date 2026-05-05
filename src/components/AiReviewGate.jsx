import React from 'react'

export function AiReviewGate({ report, children }) {
  if (!report.ai_generated || report.reviewed_at) {
    return children
  }

  return (
    <div style={{
      padding: '16px',
      borderRadius: 6,
      background: '#FFF7ED',
      border: '1px solid var(--warning, #F59E0B)',
      color: '#92400E',
      fontSize: '0.875rem',
      textAlign: 'center',
    }}>
      Ce rapport IA doit être validé par le thérapeute avant toute action.
    </div>
  )
}

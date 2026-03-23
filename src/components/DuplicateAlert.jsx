import React from 'react'
import { AlertTriangle, Eye, Link2, X, User } from 'lucide-react'

/**
 * DuplicateAlert — dropdown showing potential duplicate matches
 * 
 * Props:
 * - matches: Array of { client|pro, score, reason, name }
 * - onView: (id) => navigate to the client/pro
 * - onLink: (item) => link to existing instead of creating new
 * - onDismiss: () => close the alert
 * - type: 'client' | 'pro'
 */
export default function DuplicateAlert({ matches, onView, onLink, onDismiss, type = 'client' }) {
  if (!matches || matches.length === 0) return null

  const getScoreColor = (score) => {
    if (score >= 90) return '#DC2626'
    if (score >= 70) return '#D97706'
    return '#6B7280'
  }

  const getScoreBg = (score) => {
    if (score >= 90) return '#FEF2F2'
    if (score >= 70) return '#FFFBEB'
    return '#F9FAFB'
  }

  return (
    <div style={{
      marginTop: 4,
      borderRadius: 'var(--radius-md)',
      border: '1px solid #FECACA',
      background: '#FEF2F2',
      overflow: 'hidden',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 10px',
        background: '#FEE2E2',
        borderBottom: '1px solid #FECACA'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.714rem', fontWeight: 700, color: '#DC2626' }}>
          <AlertTriangle size={12} />
          {matches.length === 1 ? 'Doublon potentiel détecté' : `${matches.length} doublons potentiels`}
        </span>
        {onDismiss && (
          <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Matches list */}
      <div style={{ maxHeight: 180, overflowY: 'auto' }}>
        {matches.map((match, idx) => {
          const item = match.client || match.pro
          const score = match.score
          return (
            <div key={item.id || idx} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px',
              borderBottom: idx < matches.length - 1 ? '1px solid #FECACA30' : 'none',
              background: getScoreBg(score)
            }}>
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: getScoreColor(score) + '15',
                color: getScoreColor(score),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '0.643rem', fontWeight: 700
              }}>
                <User size={14} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {match.name}
                  <span style={{
                    fontSize: '0.571rem', fontWeight: 700,
                    padding: '1px 5px', borderRadius: 'var(--radius-sm)',
                    background: getScoreColor(score) + '18',
                    color: getScoreColor(score)
                  }}>
                    {score}%
                  </span>
                </div>
                <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                  {match.reason}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {onView && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onView(item.id) }}
                    title="Voir le dossier"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      padding: '3px 6px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      background: 'white', cursor: 'pointer',
                      fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <Eye size={10} /> Voir
                  </button>
                )}
                {onLink && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onLink(item) }}
                    title="Lier au dossier existant"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      padding: '3px 6px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid #8B5CF6',
                      background: '#F5F0FF', cursor: 'pointer',
                      fontSize: '0.571rem', fontWeight: 600, color: '#8B5CF6',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#8B5CF6'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F5F0FF'; e.currentTarget.style.color = '#8B5CF6' }}
                  >
                    <Link2 size={10} /> Lier
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

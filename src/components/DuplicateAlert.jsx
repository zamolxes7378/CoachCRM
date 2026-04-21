import React, { useState } from 'react'
import { AlertTriangle, Eye, EyeOff, Link2, X, User, Phone, Mail, Calendar, Hash, ExternalLink } from 'lucide-react'

/**
 * DuplicateAlert — dropdown showing potential duplicate matches
 * with expandable compact preview cards.
 */
export default function DuplicateAlert({ matches, onView, onLink, onDismiss, type = 'client', formatDate, getPhaseLabel, getPhaseColor }) {
  const [expandedId, setExpandedId] = useState(null)

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
          <button onClick={onDismiss} aria-label="Ignorer les doublons" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Matches list */}
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {matches.map((match, idx) => {
          const item = match.client || match.pro
          const score = match.score
          const isExpanded = expandedId === item.id

          // Extract contact info for preview
          const partnerA = item.partnerA || {}
          const partnerB = item.partnerB || {}
          const phoneA = partnerA.phone || ''
          const phoneB = partnerB.phone || ''
          const emailA = partnerA.email || ''
          const emailB = partnerB.email || ''
          const phase = item.phase || 'prospect'
          const phaseColor = getPhaseColor ? getPhaseColor(phase) : { bg: '#EBF8FF', color: '#2B6CB0' }
          const phaseLabel = getPhaseLabel ? getPhaseLabel(phase) : phase

          return (
            <div key={item.id || idx}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px',
                borderBottom: !isExpanded && idx < matches.length - 1 ? '1px solid #FECACA30' : 'none',
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
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : item.id) }}
                    title={isExpanded ? 'Masquer l\'aperçu' : 'Voir l\'aperçu'}
                    aria-label={isExpanded ? 'Masquer l\'aperçu' : 'Voir l\'aperçu'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 2,
                      padding: '3px 6px', borderRadius: 'var(--radius-sm)',
                      border: isExpanded ? '1px solid var(--accent-main)' : '1px solid var(--border-light)',
                      background: isExpanded ? 'rgba(218, 165, 32, 0.1)' : 'white',
                      cursor: 'pointer',
                      fontSize: '0.571rem', fontWeight: 600,
                      color: isExpanded ? 'var(--accent-main)' : 'var(--text-secondary)',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (!isExpanded) { e.currentTarget.style.borderColor = '#8B5CF6'; e.currentTarget.style.color = '#8B5CF6' } }}
                    onMouseLeave={e => { if (!isExpanded) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                  >
                    {isExpanded ? <><EyeOff size={10} /> Masquer</> : <><Eye size={10} /> Voir</>}
                  </button>
                  {onLink && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onLink(item) }}
                      title="Lier au dossier existant"
                      aria-label="Lier au dossier existant"
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

              {/* Expanded compact preview */}
              {isExpanded && (
                <div style={{
                  padding: '10px 14px',
                  background: 'white',
                  borderTop: '1px solid #FECACA30',
                  borderBottom: idx < matches.length - 1 ? '1px solid #FECACA30' : 'none',
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  {/* Phase badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontSize: '0.571rem', fontWeight: 700,
                      padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                      background: phaseColor.bg, color: phaseColor.color,
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {phaseLabel}
                    </span>
                    {item.type && (
                      <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>
                        {item.type === 'client' ? 'Client' : item.type === 'individual' ? 'Individuel' : 'Famille'}
                      </span>
                    )}
                    {item.sessionsCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.643rem', color: 'var(--text-secondary)' }}>
                        <Hash size={9} /> {item.sessionsCount} séance{item.sessionsCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Contact details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: '0.643rem' }}>
                    {/* Partner A */}
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {partnerA.firstName} {partnerA.lastName}
                    </div>
                    {/* Partner B (if exists) */}
                    {partnerB.firstName ? (
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {partnerB.firstName} {partnerB.lastName}
                      </div>
                    ) : <div />}

                    {/* Phone A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: phoneA ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                      <Phone size={9} style={{ flexShrink: 0 }} /> {phoneA || '—'}
                    </div>
                    {/* Phone B */}
                    {partnerB.firstName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: phoneB ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
                        <Phone size={9} style={{ flexShrink: 0 }} /> {phoneB || '—'}
                      </div>
                    )}

                    {/* Email A */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: emailA ? 'var(--text-secondary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Mail size={9} style={{ flexShrink: 0 }} /> {emailA || '—'}
                    </div>
                    {/* Email B */}
                    {partnerB.firstName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: emailB ? 'var(--text-secondary)' : 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Mail size={9} style={{ flexShrink: 0 }} /> {emailB || '—'}
                      </div>
                    )}
                  </div>

                  {/* Footer: creation date + link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
                    {item.startDate ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.571rem', color: 'var(--text-tertiary)' }}>
                        <Calendar size={9} /> Créé le {formatDate ? formatDate(item.startDate) : item.startDate}
                      </span>
                    ) : <span />}
                    <a
                      href={`/clients/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: '0.571rem', fontWeight: 600,
                        color: 'var(--primary-600)',
                        textDecoration: 'none'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      Ouvrir la fiche complète <ExternalLink size={9} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

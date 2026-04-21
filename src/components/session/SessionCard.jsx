import { memo } from 'react'
import {
  Clock, XCircle, CheckCircle, HelpCircle
} from 'lucide-react'
import ReportIcon from '../ReportIcon'
import ConfirmBadge from '../ConfirmBadge'
import PaymentBadge from '../PaymentBadge'
import InvoiceBadge from '../InvoiceBadge'
import { useData } from '../../context/DataContext'
import ClientTypeBadge from '../ClientTypeBadge'

/**
 * SessionCard — Composant partagé pour le rendu d'une carte de séance.
 * 
 * Utilisé par DashboardPage (showClientName=true) et ClientDetailPage (showClientName=false).
 * TOUTE modification visuelle d'une carte de séance doit se faire ICI.
 */
function SessionCard({
  session,
  sessionNumber,
  phaseColor,       // { bg, color } from getPhaseColor
  PhaseIcon,        // Component from getPhaseIcon
  phaseLabel,       // "Analyse", "Intégration", etc.
  showClientName = false,
  clientName = null,
  isProspect = false,
  sessionRate = 60,
  isExpanded = false,
  onClick,
  reportSummary = null,
  hasReport = false,
  formatDate,
  formatTime,
  // Optional ClientDetailPage-specific styling
  showExpandedStyle = false,
  dimmed = false,
  onDelete,           // callback(sessionId) — for cancelled sessions, makes X clickable
  maxChars = 50,      // Limite de caractères pour l'aperçu
  clientType = null,  // 'individual' | 'client' | 'family' — shown in round badge
}) {
  const isPast = session?.isCompleted
  const isPlanned = session?.status === 'scheduled' && !isPast
  const isConfirmed = session?.isConfirmed
  const isCancelled = session?.status === 'cancelled'
  const isOffered = session?.paymentAmount === 0 && !isCancelled
  const needsConfirm = isPast && !isCancelled && !isOffered && (!isConfirmed || !session?.paymentMethod)

  // Card background & border
  const cardBg = isExpanded && showExpandedStyle ? 'rgba(218, 165, 32, 0.12)'
    : session.status === 'cancelled' ? 'var(--error-bg)'
      : isPast ? 'var(--primary-50)' : 'white'

  const cardBorder = isExpanded && showExpandedStyle ? '1px solid var(--accent-main)'
    : session.status === 'cancelled' ? 'none'
      : isPast ? 'none' : '1px dashed var(--border-light)'

  const { getInvoiceForSession } = useData()
  const invoice = getInvoiceForSession(session.id)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-sm)',
        padding: 'var(--space-sm)',
        width: '100%',
        background: cardBg,
        border: cardBorder,
        borderLeft: isExpanded && showExpandedStyle ? '3px solid var(--accent-main)' : undefined,
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-xs)',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        boxShadow: isExpanded && showExpandedStyle ? '0 1px 4px rgba(196, 167, 103, 0.25)' : '0 1px 3px rgba(0,0,0,0.08)',
        opacity: dimmed ? 0.5 : 1,
      }}
      onMouseOver={onClick ? e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' } : undefined}
      onMouseOut={onClick ? e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'none' } : undefined}
    >
      {/* Client type icon avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {clientType ? (
          <ClientTypeBadge type={clientType} size={40} />
        ) : (() => {
          const pc = phaseColor || { bg: 'var(--primary-50)', color: 'var(--primary-700)' }
          return (
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-full)',
              background: pc.bg, color: pc.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {PhaseIcon && <PhaseIcon size={20} />}
            </div>
          )
        })()}
      </div>

      {/* Main info */}
      <div style={{ minWidth: 0, marginRight: 'var(--space-md)' }}>
        {/* First line: client name + time (dashboard) or date/time (client page) */}
        {showClientName ? (
          <div style={{
            fontWeight: 600, fontSize: '0.929rem',
            color: session.status === 'cancelled' ? 'var(--error)' : 'var(--text-primary)',
            display: 'flex', alignItems: 'baseline', gap: 8,
            minWidth: 0, width: '100%'
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{clientName || 'Client inconnu'}</span>
            {isProspect && <span className="badge badge-prospect" style={{ fontSize: '0.643rem', padding: '1px 6px', height: 'fit-content', flexShrink: 0 }}>PROSPECT</span>}
            {(session.status !== 'scheduled' || isPast) && <span style={{ fontSize: '0.786rem', fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>{formatTime(session.date)}</span>}
          </div>
        ) : (
          <div style={{
            fontSize: '0.786rem', fontWeight: 600,
            color: session.status === 'cancelled' ? 'var(--error)' : undefined,
            display: 'flex', alignItems: 'baseline', gap: 6
          }}>
            <span>{formatDate(session.date)}</span>
            {!isPlanned && <span style={{ fontWeight: 500, color: 'var(--text-tertiary)', fontSize: '0.857rem', marginLeft: 8 }}>{formatTime(session.date)}</span>}
          </div>
        )}

        {/* Detail line: time (dashboard) or phase + badges */}
        <div style={{
          fontSize: '0.786rem',
          color: session.status === 'cancelled' ? 'var(--error)' : session.status === 'completed' ? 'var(--success)' : 'var(--text-secondary)',
          marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
          overflow: 'hidden', whiteSpace: 'nowrap', flexWrap: 'wrap'
        }}>


          {/* Phase label badge */}
          {(() => {
            if (!phaseLabel) return null
            const effectiveColor = phaseColor
            if (isPlanned) {
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {sessionNumber && <span style={{
                      minWidth: 18, height: 18, borderRadius: '50%',
                      background: effectiveColor.bg, color: effectiveColor.color,
                      fontSize: '0.643rem', fontWeight: 800,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1, padding: '0 3px'
                    }}>{sessionNumber}</span>}
                    <span style={{ fontSize: '0.571rem', fontWeight: 600, color: effectiveColor.color }}>
                      {phaseLabel}
                    </span>
                  </span>
                  {reportSummary && (
                    <span style={{
                      fontSize: '0.643rem', color: 'var(--text-secondary)',
                      marginLeft: 8, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      fontStyle: 'italic', maxWidth: 300, display: 'flex', alignItems: 'center'
                    }}>
                      {session.duration && (
                        <span style={{
                          fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-tertiary)',
                          marginRight: 4, letterSpacing: '0.02em', opacity: 0.8
                        }}>
                          {session.duration} MIN :
                        </span>
                      )}
                      {reportSummary.length > maxChars ? reportSummary.slice(0, maxChars) + '…' : reportSummary}
                    </span>
                  )}
                </div>
              )
            }
            return (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.571rem', fontWeight: 600,
                padding: '1px 5px', borderRadius: 'var(--radius-sm)',
                background: effectiveColor.bg,
                color: effectiveColor.color
              }}>
                {sessionNumber && <span style={{
                  minWidth: 14, height: 14, borderRadius: '50%',
                  background: effectiveColor.color, color: 'white',
                  fontSize: '0.5rem', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1
                }}>{sessionNumber}</span>}
                {phaseLabel}
              </span>
            )
          })()}



          {/* Cancelled badge */}
          {session.status === 'cancelled' && (
            <span style={{ color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.643rem', fontWeight: 600 }}>
              <XCircle size={10} /> {session.paymentAmount > 0 ? 'Annulation facturée' : 'Annulée'}
            </span>
          )}

          {/* Séance offerte */}
          {isOffered && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.643rem', fontWeight: 600, letterSpacing: '0.02em',
              color: 'var(--error)', opacity: 0.85
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--error)', flexShrink: 0 }} />
              Séance offerte
            </span>
          )}

          {/* Payment method */}
          {session.paymentMethod && !isOffered && (
            <PaymentBadge method={session.paymentMethod} received={session.paymentReceived} />
          )}

          {/* CONFIRMER badge (amber) */}
          {needsConfirm && <ConfirmBadge />}

          {/* Invoice badge */}
          {invoice && (
            <InvoiceBadge sent={invoice.sent} />
          )}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right side: report icon / Rédiger CR / Clock / XCircle */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        {hasReport && (isPast || session.status !== 'scheduled') ? (
          <>
            {reportSummary && (
              <span style={{
                fontSize: '0.714rem', color: 'var(--text-secondary)',
                maxWidth: showClientName ? 300 : 400,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textAlign: 'right', marginRight: 4, opacity: 0.8
              }} title={reportSummary}>
                {reportSummary.length > maxChars ? reportSummary.slice(0, maxChars) + '…' : reportSummary}
              </span>
            )}
            <ReportIcon size={showClientName ? 16 : 18} title="Compte-rendu disponible" />
            {session.status === 'scheduled' && !isPast && (
              <>
                <span style={{ fontSize: '0.786rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{formatTime(session.date)}</span>
                <Clock size={showClientName ? 16 : 18} style={{ color: 'var(--text-tertiary)' }} />
              </>
            )}
          </>
        ) : session.status === 'cancelled' ? (
          onDelete ? (
            <button
              onClick={e => { e.stopPropagation(); onDelete(session.id) }}
              title="Supprimer définitivement cette séance"
              aria-label="Supprimer définitivement cette séance"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 2, display: 'flex', alignItems: 'center',
                color: 'var(--error)', opacity: 0.7, transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            >
              <XCircle size={showClientName ? 16 : 18} />
            </button>
          ) : (
            <XCircle size={showClientName ? 16 : 18} style={{ color: 'var(--error)' }} />
          )
        ) : isPast && (session.status === 'completed' || session.status === 'scheduled') ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: '#FFF3E0', color: '#E67E22',
            borderRadius: 12, padding: '3px 8px',
            fontSize: '0.643rem', fontWeight: 600,
            border: '1px solid #E67E2240'
          }}>
            Rédiger CR
          </span>
        ) : (
          <>
            <span style={{ fontSize: '0.786rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{formatTime(session.date)}</span>
            <Clock size={showClientName ? 16 : 18} style={{ color: 'var(--text-tertiary)' }} />
          </>
        )}
      </div>
    </div>
  )
}

export default memo(SessionCard)

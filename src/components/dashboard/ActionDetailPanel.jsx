import React, { useRef } from 'react'
import { X, ChevronRight, Clock, Phone, MessageSquare, Mail, MessageCircle, Globe, Share2 } from 'lucide-react'
import ClientTypeBadge from '../ClientTypeBadge'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'

/**
 * ActionDetailPanel — slide-in right panel for viewing items related to an urgency card.
 * Matches SessionDetailModal visual pattern.
 * Each item shows a client identity card with avatar (type icon + initials).
 */
export default function ActionDetailPanel({ urgency, items, onClose, onItemClick }) {
    const panelRef = useRef(null)
    useFocusTrap(panelRef, !!urgency)
    useEscapeKey(onClose, !!urgency)

    if (!urgency) return null

    const Icon = urgency.icon

    const getContactIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'phone': case 'appel': case 'tel': return <Phone size={12} />
            case 'sms': case 'message': return <MessageSquare size={12} />
            case 'email': case 'mail': return <Mail size={12} />
            case 'social': return <MessageCircle size={12} />
            case 'web': return <Globe size={12} />
            default: return <Share2 size={12} />
        }
    }



    return (
        <>
            {/* Overlay */}
            <div onClick={onClose} style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
                zIndex: 999, animation: 'fadeIn 0.2s'
            }} />
            {/* Panel */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="action-detail-title"
                tabIndex={-1}
                style={{
                    position: 'fixed', top: 0, right: 0, bottom: 0,
                    width: '40%', minWidth: 380, maxWidth: 520,
                    background: 'white', zIndex: 1000,
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.25s ease-out'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: `3px solid ${urgency.color}20`,
                    background: urgency.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: `${urgency.color}20`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Icon size={18} style={{ color: urgency.color }} />
                        </div>
                        <div>
                            <h3 id="action-detail-title" style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                {urgency.label}
                            </h3>
                            <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>
                                {items.length} élément{items.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Fermer" style={{
                        width: 32, height: 32, borderRadius: '50%', border: 'none',
                        background: 'white', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <X size={18} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* Body — scrollable list */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md) var(--space-lg)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                        {items.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                onClick={() => onItemClick(item)}
                                style={{
                                    padding: '12px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--primary-50)',
                                    cursor: 'pointer', border: '1px solid transparent',
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.border = '1px solid var(--border-medium)'
                                    e.currentTarget.style.background = 'white'
                                    e.currentTarget.style.transform = 'translateX(4px)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.border = '1px solid transparent'
                                    e.currentTarget.style.background = 'var(--primary-50)'
                                    e.currentTarget.style.transform = 'translateX(0)'
                                }}
                            >
                                {/* Client Avatar — identity card */}
                                <ClientTypeBadge
                                    type={item.clientType}
                                    size={40}
                                    initials={item.clientInitials}
                                    isProspect={item.isProspect}
                                    showBorder
                                />

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontWeight: 600, fontSize: '0.929rem',
                                        color: 'var(--text-primary)',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {item.clientName}
                                    </div>
                                    <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                        {item.subtitle && (
                                            <span>{item.subtitle}</span>
                                        )}
                                        {item.contactInfo && (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary-600)' }}>
                                                    {getContactIcon(item.contactInfo.type)}
                                                    <span>Dernier contact :</span>
                                                </div>
                                                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                                    {item.contactInfo.date}
                                                </span>
                                            </>
                                        )}
                                        {item.inactiveInfo && (
                                            <>
                                                <Clock size={12} />
                                                <span>Inactif depuis :</span>
                                                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                                    {item.inactiveInfo}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {item.badge && (
                                    <div style={{
                                        fontSize: '0.643rem', fontWeight: 700,
                                        padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                                        background: item.badge.bg || `${urgency.color}15`,
                                        color: item.badge.color || urgency.color,
                                        border: `1px solid ${item.badge.borderColor || urgency.color + '30'}`,
                                        whiteSpace: 'nowrap', flexShrink: 0
                                    }}>
                                        {item.badge.label}
                                    </div>
                                )}
                                <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.4, flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}

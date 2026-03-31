import { memo } from 'react'
import { User, Users } from 'lucide-react'

/**
 * CLIENT_TYPE_STYLES — Centralized design tokens for client type badges.
 * 
 * Usage: import { CLIENT_TYPE_STYLES } from './ClientTypeBadge'
 *        const style = CLIENT_TYPE_STYLES[clientType]  // { color, bg, border, label }
 */
export const CLIENT_TYPE_STYLES = {
    individual: { color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', label: 'Individuel' },
    client: { color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8', label: 'Couple' },
    family: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'Famille' },
    prospect: { color: '#7C3AED', bg: '#F3E8FF', border: '#E8D8FE', label: 'Prospect' },
}

// Aliases for French-label keys used by FinancesPage
CLIENT_TYPE_STYLES.individuel = CLIENT_TYPE_STYLES.individual
CLIENT_TYPE_STYLES.couple = CLIENT_TYPE_STYLES.client
CLIENT_TYPE_STYLES.famille = CLIENT_TYPE_STYLES.family

/**
 * FamilyIcon — Custom SVG for family type.
 */
const FamilyIcon = ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="6" r="2.5" />
        <circle cx="17" cy="6" r="2.5" />
        <circle cx="12" cy="9" r="2" />
        <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20" />
        <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
    </svg>
)

/**
 * ClientTypeIcon — Renders only the icon for a given client type (no badge circle).
 */
export function ClientTypeIcon({ type, size = 18, color }) {
    const style = CLIENT_TYPE_STYLES[type] || CLIENT_TYPE_STYLES.client
    const c = color || style.color
    if (type === 'individual' || type === 'individuel') return <User size={size} color={c} />
    if (type === 'family' || type === 'famille') return <FamilyIcon size={size} color={c} />
    return <Users size={size} color={c} />
}

/**
 * ClientTypeBadge — Circular avatar badge showing client type icon or initials.
 * 
 * Props:
 * - type: 'individual' | 'client' | 'family' (or French equivalents)
 * - size: diameter in px (default 40)
 * - initials: optional string to display instead of icon
 * - isProspect: boolean — overrides colors with prospect purple
 * - showBorder: boolean — show colored border ring (default false)
 * - fallbackColor: { bg, color } — used when type is null (e.g. SessionCard phase colors)
 */
function ClientTypeBadge({ type, size = 40, initials, isProspect = false, showBorder = false, fallbackColor }) {
    const style = isProspect
        ? CLIENT_TYPE_STYLES.prospect
        : (CLIENT_TYPE_STYLES[type] || fallbackColor || CLIENT_TYPE_STYLES.client)

    const iconSize = Math.max(Math.round(size * 0.45), 12)

    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: style.bg,
            color: style.color,
            border: showBorder ? `2px solid ${style.border || style.color + '40'}` : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
        }}>
            {initials ? (
                <span style={{
                    fontSize: `${Math.max(size * 0.2, 10)}px`,
                    fontWeight: 700,
                    color: style.color,
                    letterSpacing: '-0.02em',
                    lineHeight: 1
                }}>{initials}</span>
            ) : (
                <ClientTypeIcon type={type} size={iconSize} color={style.color} />
            )}
        </div>
    )
}

export default memo(ClientTypeBadge)

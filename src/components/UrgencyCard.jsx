import { ChevronRight } from 'lucide-react'

/**
 * UrgencyCard — Carte d'action requise partagée.
 * 
 * Utilisée sur le Dashboard et le Pilotage financier pour afficher
 * les compteurs urgents (CR, séances, factures, prospects).
 * 
 * Style : fond transparent, bordure ${color}30, hover animate.
 * 
 * @param {string} id - Identifiant unique
 * @param {string} label - Texte affiché (ex: "3 CR à rédiger")
 * @param {number} count - Nombre (pour logique conditionnelle)
 * @param {React.Component} icon - Composant icône (ReportIcon, HelpCircle, etc.)
 * @param {string} color - Couleur thématique
 * @param {function} onClick - Handler de clic
 */
export default function UrgencyCard({ id, label, count, icon: Icon, color, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                padding: '12px', borderRadius: 'var(--radius-md)', background: 'transparent',
                cursor: onClick ? 'pointer' : 'default', border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.border = `1px solid ${color}`
                e.currentTarget.style.transform = 'translateX(4px)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.border = `1px solid ${color}30`
                e.currentTarget.style.transform = 'translateX(0)'
            }}
        >
            <div style={{ color, flexShrink: 0 }}><Icon size={18} /></div>
            <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{label}</span>
            <ChevronRight size={14} style={{ opacity: 0.3 }} />
        </div>
    )
}

import { FileText } from 'lucide-react'

/**
 * ReportIcon — Icône canonique pour les comptes rendus (CR).
 * 
 * Standard charte graphique : FileText bleu (#2B6CB0).
 * Utilisé partout où un CR est référencé : SessionCard, DashboardPage,
 * ClientDetailPage, SessionDetailModal.
 * 
 * @param {number} size - Taille de l'icône (default 16)
 * @param {string} color - Override couleur (default bleu charte)
 * @param {object} style - Styles additionnels
 */
export default function ReportIcon({ size = 16, color = '#2B6CB0', style, ...props }) {
    return <FileText size={size} strokeWidth={1.6} style={{ color, ...style }} {...props} />
}

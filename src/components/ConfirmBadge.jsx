import { HelpCircle } from 'lucide-react'

/**
 * ConfirmBadge — Badge « CONFIRMER » pour les séances passées sans paiement renseigné.
 *
 * Charte graphique :
 * - Icône : HelpCircle (14px)
 * - Couleur : #D97706 (ambre/moutarde)
 * - Texte : « CONFIRMER »
 * - Tooltip : « Mode de paiement non renseigné »
 */
export default function ConfirmBadge() {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: '0.643rem', fontWeight: 600,
            color: '#D97706',
            letterSpacing: '0.02em'
        }} title="Mode de paiement non renseigné">
            <HelpCircle size={14} /> CONFIRMER
        </span>
    )
}

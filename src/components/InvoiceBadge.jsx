/**
 * InvoiceBadge — Badge de statut de facturation.
 * 
 * Composant partagé obligatoire pour tout affichage du statut facture.
 * Deux états :
 *   - À émettre (sent=false) : « FACTURE » bleu marine, fond transparent
 *   - Émise (sent=true) : « FACTURE » vert, fond transparent
 * 
 * @param {boolean} sent - true = facture émise, false = à émettre
 * @param {'sm'|'md'} size - Taille du badge (default 'sm')
 */
export default function InvoiceBadge({ sent = false, size = 'sm' }) {
    const fontSize = size === 'md' ? '0.643rem' : '0.571rem'
    return (
        <span style={{
            fontSize,
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: sent ? 'var(--success)' : 'var(--primary-500)',
        }}>
            FACTURE
        </span>
    )
}

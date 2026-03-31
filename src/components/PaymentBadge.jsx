

/**
 * PaymentBadge — Badge partagé pour le mode de paiement d'une séance.
 *
 * Charte graphique :
 * - Couleur rouge (`var(--error)`) si pas encore encaissé
 * - Couleur verte (`var(--success)`) si encaissé
 * - Dot coloré + label
 *
 * @param {string}  method    - 'cheque' | 'virement' | 'especes'
 * @param {boolean} received  - true si paiement encaissé
 * @param {string}  [size]    - 'sm' (compact, pour tableaux) | 'md' (défaut, pour cartes)
 */

const PAYMENT_LABELS = {
    cheque: 'Chèque',
    virement: 'Virement',
    especes: 'Espèces'
}

export default function PaymentBadge({ method, received, size = 'md' }) {
    const label = PAYMENT_LABELS[method]
    if (!label) return null

    const color = received ? 'var(--success)' : 'var(--error)'
    const isSm = size === 'sm'

    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: isSm ? 3 : 4,
            fontSize: isSm ? '0.643rem' : '0.643rem',
            fontWeight: received ? 700 : 500,
            letterSpacing: '0.02em',
            color,
            opacity: 0.85
        }} title={received ? `${label} encaissé` : `${label} — en attente d'encaissement`}>
            <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: color, flexShrink: 0
            }} />
            {label}
        </span>
    )
}

export { PAYMENT_LABELS }

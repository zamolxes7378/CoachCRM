/**
 * InvoiceIcon — Icône canonique pour les factures.
 * 
 * SVG custom : document + symbole €.
 * Standard charte graphique — il est interdit d'utiliser FileText ou Receipt.
 * 
 * @param {number} size - Taille de l'icône (default 18)
 */
export default function InvoiceIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <text x="12" y="17" textAnchor="middle" fill="var(--primary-500)" stroke="none" fontSize="10" fontWeight="800">€</text>
        </svg>
    )
}

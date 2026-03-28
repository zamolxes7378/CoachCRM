import { Plus } from 'lucide-react'

/**
 * Bouton standardisé « Ajouter une séance » — style bleu secondaire.
 * Background : var(--primary-100), texte : var(--primary-700), bordure : var(--primary-200).
 * 
 * @param {Function} onClick - Action au clic
 * @param {string} [label='Ajouter une séance'] - Texte du bouton
 */
export default function AddSessionButton({ onClick, label = 'Séance' }) {
  return (
    <button
      className="btn"
      style={{ background: 'var(--primary-100)', color: 'var(--primary-700)', fontWeight: 600, border: '1px solid var(--primary-200)' }}
      onClick={onClick}
    >
      <Plus size={18} /> {label}
    </button>
  )
}

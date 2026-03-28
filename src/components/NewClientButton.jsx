import { UserPlus } from 'lucide-react'

/**
 * Bouton standardisé « Nouveau client » — utilisé sur Dashboard et Mes Clients.
 * Style doré (btn-accent) avec icône UserPlus blanche.
 * 
 * @param {Function} onClick - Action au clic
 * @param {string} [label='Nouveau client'] - Texte du bouton
 */
export default function NewClientButton({ onClick, label = 'Nouveau client' }) {
  return (
    <button className="btn btn-accent" onClick={onClick}>
      <UserPlus size={18} style={{ color: 'white' }} /> {label}
    </button>
  )
}

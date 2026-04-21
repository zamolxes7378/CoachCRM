import React from 'react'
import { Link } from 'react-router-dom'
import content from '../../../docs/legal/confidentialite.md?raw'

export default function ConfidentialitePage() {
  return (
    <article className="legal-page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 24, color: 'var(--primary-600)', textDecoration: 'none' }}>
        ← Retour
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 32, color: 'var(--primary-800)' }}>
        Politique de confidentialité
      </h1>
      {/* TODO: replace pre-wrap rendering with a proper markdown renderer (Track H-0.4 / Phase 1) */}
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
        {content}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 40, marginBottom: 12, color: 'var(--primary-800)' }}>
        Traitement par intelligence artificielle
      </h2>
      <p style={{ lineHeight: 1.7, color: 'var(--text-primary)' }}>
        CoachCRM peut utiliser des modèles d'intelligence artificielle pour aider à la rédaction de comptes-rendus. Tout contenu généré par IA est clairement identifié et doit être validé par le thérapeute avant utilisation. Conformément au Règlement européen sur l'IA (Art. 50), aucune décision automatique n'est prise sur les patients.
      </p>
    </article>
  )
}

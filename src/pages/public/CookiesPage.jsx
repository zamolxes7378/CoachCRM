import React from 'react'
import { Link } from 'react-router-dom'
import content from '../../../docs/legal/cookies.md?raw'

export default function CookiesPage() {
  return (
    <article className="legal-page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Link to="/" style={{ display: 'inline-block', marginBottom: 24, color: 'var(--primary-600)', textDecoration: 'none' }}>
        ← Retour
      </Link>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 32, color: 'var(--primary-800)' }}>
        Politique de gestion des cookies
      </h1>
      {/* TODO: replace pre-wrap rendering with a proper markdown renderer (Track H-0.4 / Phase 1) */}
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--text-primary)' }}>
        {content}
      </div>
    </article>
  )
}

/**
 * DataMinimisationHint.jsx
 * Petit composant de conseil sur la minimisation des données (RGPD Art.5(1)(c)).
 * S'affiche à côté des champs de saisie libre contenant des données sensibles.
 *
 * Usage :
 *   <DataMinimisationHint />
 *   <DataMinimisationHint message="Ne saisissez pas de coordonnées bancaires." />
 *   <DataMinimisationHint inline />
 */

import { useState } from 'react'

const DEFAULT_MESSAGE =
  'Minimisation des données : ne saisissez que les informations strictement nécessaires au suivi thérapeutique. Évitez les données sensibles non pertinentes (santé tiers, coordonnées personnelles non liées au suivi).'

export default function DataMinimisationHint({ message = DEFAULT_MESSAGE, inline = false }) {
  const [open, setOpen] = useState(false)

  return (
    <span
      style={{
        position: 'relative',
        display: inline ? 'inline-flex' : 'inline-block',
        verticalAlign: 'middle',
        marginLeft: 4,
      }}
    >
      <button
        type="button"
        aria-label="Conseil minimisation des données"
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: '#EBF4FF',
            border: '1px solid #BEE3F8',
            color: '#3182CE',
            fontSize: '0.6rem',
            fontWeight: 700,
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          i
        </span>
      </button>

      {open && (
        <>
          {/* Overlay to close on outside click */}
          <span
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <span
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: '120%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 260,
              background: '#2D3748',
              color: 'white',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: '0.75rem',
              lineHeight: 1.5,
              zIndex: 50,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
            }}
          >
            <strong style={{ display: 'block', marginBottom: 4, fontSize: '0.786rem' }}>
              🛡 Minimisation des données (RGPD)
            </strong>
            {message}
            <span
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #2D3748',
              }}
            />
          </span>
        </>
      )}
    </span>
  )
}

import React from 'react';
import { LayoutList, Calendar, LayoutGrid, List } from 'lucide-react';

/**
 * Sélecteur de vue standardisé (ViewSwitcher).
 * Utilisé pour basculer entre Liste, Calendrier, Cartes, etc.
 * 
 * @param {string} currentView - L'identifiant de la vue active (ex: 'list', 'calendar')
 * @param {Function} onViewChange - Callback appelé lors du changement de vue
 * @param {Array} options - Liste des options [{ id, icon, title }]
 */
export default function ViewSwitcher({ currentView, onViewChange, options = [] }) {
  if (!options || options.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = currentView === option.id;
        
        return (
          <button
            key={option.id}
            className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onViewChange(option.id)}
            title={option.title}
            style={{ 
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              minWidth: '36px',
              height: '32px'
            }}
          >
            <Icon 
              size={16} 
              color={isActive ? 'white' : 'var(--primary-600)'} 
              strokeWidth={isActive ? 2 : 1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';

export default function ClientNotesPreview({ client, setShowNotesModal }) {
  return (
    <div
      className="card"
      onClick={() => setShowNotesModal(true)}
      style={{
        marginTop: 'var(--space-md)', cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        padding: 'var(--space-sm) var(--space-md)'
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
        <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
          <BookOpen size={16} style={{ color: 'var(--primary-500)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.786rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Mes notes du dossier</div>
          <div style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {client?.notes || 'Aucune note — cliquez pour rédiger'}
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0, alignSelf: 'center' }} />
      </div>
    </div>
  );
}

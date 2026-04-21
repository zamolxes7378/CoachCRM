import React, { useState } from 'react';
import { UserPlus, Edit3, AlertTriangle, RefreshCw } from 'lucide-react';

export default function ClientCreationMarker({
  client,
  completedCount,
  updateClient,
  createTherapyCycle,
  currentRate,
  therapyPhasesData,
  formatDate,
  confirm
}) {
  const [editingStartDate, setEditingStartDate] = useState(false);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 'var(--space-sm)',
      padding: 'var(--space-xs) var(--space-sm)',
      borderTop: '1px dashed var(--border-light)',
      marginTop: 'var(--space-xs)',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <UserPlus size={16} style={{ color: '#E67E22', flexShrink: 0 }} />
          {editingStartDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Création du dossier ·</span>
              <input
                type="date"
                className="input"
                defaultValue={client.startDate?.split('T')[0]}
                autoFocus
                min="2000-01-01"
                max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d.toISOString().split('T')[0] })()}
                style={{ fontSize: '0.714rem', padding: '2px 6px', width: 130 }}
                onBlur={async (e) => {
                  const newDate = e.target.value;
                  if (!newDate) { setEditingStartDate(false); return; }
                  // Reject dates outside allowed bounds (2000 – now+3y)
                  const maxDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 3); return d.toISOString().split('T')[0] })();
                  if (newDate < '2000-01-01' || newDate > maxDate) {
                    e.target.value = client.startDate?.split('T')[0] || '';
                    setEditingStartDate(false);
                    return;
                  }
                  if (newDate !== client.startDate?.split('T')[0]) {
                    const ok = await confirm('Modifier la date de création du dossier ? Cela affecte l\'historique du client.', { variant: 'danger' });
                    if (ok) {
                      client.startDate = newDate;
                      await updateClient(client.id, { startDate: newDate });
                    }
                  }
                  setEditingStartDate(false);
                }}
                onKeyDown={e => { if (e.key === 'Escape') setEditingStartDate(false); }}
              />
            </div>
          ) : (
            <span
              style={{ fontSize: '0.714rem', fontWeight: 600, color: 'var(--text-tertiary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setEditingStartDate(true)}
              title="Cliquer pour modifier la date de création"
            >
              Création du dossier · {formatDate(client.startDate)}
              <Edit3 size={10} style={{ opacity: 0.4 }} />
            </span>
          )}
        </div>
        {editingStartDate && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 8px', marginLeft: 24,
            background: '#FFFBEB', borderRadius: 'var(--radius-sm)',
            border: '1px solid #FEF3C7'
          }}>
            <AlertTriangle size={10} style={{ color: '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: '0.571rem', color: '#D97706', fontWeight: 500 }}>
              Cette date impacte l'historique et les cycles de thérapie
            </span>
          </div>
        )}
      </div>
      {completedCount > 0 && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.643rem', padding: '3px 8px' }}
          onClick={async () => {
            if (!await confirm('Démarrer une nouvelle thérapie ? Les séances actuelles seront archivées.')) return;
            const newCycle = await createTherapyCycle({
              clientId: client.id,
              startDate: new Date().toISOString().slice(0, 10),
              rate: currentRate,
              totalSessions: 20,
              phase: therapyPhasesData[0]?.key || 'debut'
            });
            if (newCycle) {
              await updateClient(client.id, { phase: therapyPhasesData[0]?.key || 'debut', totalSessions: 20 });
            }
          }}
        >
          <RefreshCw size={12} /> Nouvelle thérapie
        </button>
      )}
    </div>
  );
}

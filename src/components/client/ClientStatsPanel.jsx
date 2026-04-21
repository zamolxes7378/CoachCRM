import React, { useState, useRef, useEffect } from 'react';
import { Calendar, AlertTriangle, Target, Edit3, Euro, RefreshCw } from 'lucide-react';
import ReportIcon from '../ReportIcon';

export default function ClientStatsPanel({
  client,
  sessions,
  allSessions,
  therapyPhasesData,
  phaseColors,
  activeCycle,
  getSessionCycle,
  getPhaseIcon,
  getPhaseLabel,
  formatDate,
  updateClient,
  updateTherapyCycle,
  updateSession,
  clientId,
  pendingReportsCount,
  totalSessions,
  completedCount
}) {
  const [editingTotal, setEditingTotal] = useState(false);
  const [tempTotal, setTempTotal] = useState(client?.totalSessions || 20);
  const totalInputRef = useRef(null);

  const [editingRate, setEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(activeCycle?.rate);
  const rateInputRef = useRef(null);

  const [editingFrequency, setEditingFrequency] = useState(false);
  const [tempFrequency, setTempFrequency] = useState(client?.sessionFrequency || 2);
  const frequencyInputRef = useRef(null);

  useEffect(() => {
    if (editingTotal && totalInputRef.current) totalInputRef.current.focus();
  }, [editingTotal]);

  const handleSaveTotal = () => {
    const val = parseInt(tempTotal);
    if (val > 0) {
      updateClient(client.id, { totalSessions: val });
    }
    setEditingTotal(false);
  };

  // Compute next/last session
  const now = new Date();
  const futureSessions = sessions.filter(s => new Date(s.date) > now && s.status !== 'cancelled');
  const pastSessions = sessions.filter(s => new Date(s.date) <= now && s.status !== 'cancelled');
  const nextSessionDate = futureSessions.length > 0 ? futureSessions.sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0].date : null;
  const lastSessionDate = pastSessions.length > 0 ? pastSessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].date : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
      {/* Left: Avancement thérapie */}
      <div className="card" style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avancement dans la thérapie</span>
          <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{completedCount}/{totalSessions} séances</span>
        </div>
        {(() => {
          const therapyPhases = therapyPhasesData.map(tp => tp.key);
          return (
            <>
              {/* Multi-segment bar — completed (vivid) + scheduled (light) — active cycle only */}
              {(() => {
                const nowIso = new Date().toISOString();
                const cycleSessions = sessions.filter(s => s.status !== 'cancelled' && getSessionCycle(s)?.id === activeCycle.id);
                const doneByPhase = {};
                const scheduledByPhase = {};
                therapyPhases.forEach(p => {
                  doneByPhase[p] = cycleSessions.filter(s => s.phase === p && s.status !== 'scheduled' && s.date <= nowIso).length;
                  scheduledByPhase[p] = cycleSessions.filter(s => s.phase === p && s.status === 'scheduled').length;
                });
                const totalAssigned = therapyPhases.reduce((s, p) => s + (doneByPhase[p] || 0) + (scheduledByPhase[p] || 0), 0);
                const barBase = Math.max(totalSessions, totalAssigned);
                return (
                  <>
                    <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 6, background: '#E2E8F0' }}>
                      {therapyPhases.map((p) => {
                        const done = doneByPhase[p] || 0;
                        const sched = scheduledByPhase[p] || 0;
                        if (done + sched === 0) return null;
                        const pc = phaseColors[p];
                        return (
                          <React.Fragment key={p}>
                            {done > 0 && <div style={{
                              width: `${(done / barBase) * 100}%`,
                              background: pc?.color || '#2B6CB0',
                              transition: 'width 0.3s'
                            }} title={`${getPhaseLabel(p)} : ${done} effectuée${done > 1 ? 's' : ''}`} />}
                            {sched > 0 && <div style={{
                              width: `${(sched / barBase) * 100}%`,
                              background: pc?.bg || '#EBF8FF',
                              borderLeft: done > 0 ? '1px solid white' : 'none',
                              transition: 'width 0.3s'
                            }} title={`${getPhaseLabel(p)} : ${sched} planifiée${sched > 1 ? 's' : ''}`} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {/* Phase labels */}
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 10, flexWrap: 'wrap' }}>
                      {therapyPhases.map(p => {
                        const done = doneByPhase[p] || 0;
                        const sched = scheduledByPhase[p] || 0;
                        const total = done + sched;
                        const pc = phaseColors[p];
                        const PhIcon = getPhaseIcon(p);
                        return (
                          <div key={p} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            fontSize: '0.643rem', color: total > 0 ? (pc?.color || '#2B6CB0') : 'var(--text-tertiary)',
                            fontWeight: total > 0 ? 600 : 400,
                            opacity: total > 0 ? 1 : 0.5
                          }}>
                            <PhIcon size={10} />
                            <span>{getPhaseLabel(p)}</span>
                            <span style={{ fontWeight: 700 }}>({done}{sched > 0 ? `+${sched}` : ''})</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          );
        })()}
        {nextSessionDate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} style={{ color: 'var(--primary-500)' }} />
            <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
              Prochain RDV : {formatDate(nextSessionDate)}
            </span>
          </div>
        ) : client.status === 'active' ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', background: '#FFFBEB',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #FEF3C7'
          }}>
            <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: '0.714rem', color: '#D97706', fontWeight: 600 }}>
              Aucun prochain RDV planifié
            </span>
          </div>
        ) : lastSessionDate ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
              Dernier RDV : {formatDate(lastSessionDate)}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)' }}>
              Aucun RDV
            </span>
          </div>
        )}
      </div>

      {/* Right: 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)' }}>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)' }}
          onClick={() => { setTempTotal(totalSessions); setEditingTotal(true); }}
          title="Cliquer pour modifier l'objectif"
        >
          <Target size={24} style={{ color: '#276749', marginBottom: 4, cursor: 'pointer' }} />
          {editingTotal ? (
            <div>
              <input
                ref={totalInputRef}
                type="number" min="1" value={tempTotal}
                onChange={e => setTempTotal(e.target.value)}
                onBlur={handleSaveTotal}
                onKeyDown={e => e.key === 'Enter' && handleSaveTotal()}
                onClick={e => e.stopPropagation()}
                style={{ width: 40, border: '2px solid #276749', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#F0FFF4', color: '#276749', outline: 'none' }}
              />
            </div>
          ) : (
            <div className="stat-value" style={{ fontSize: '1.286rem', color: '#276749', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
              {totalSessions}
              <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
          <div className="stat-label" style={{ fontSize: '0.643rem' }}>Objectif</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)', cursor: 'pointer' }}
          onClick={() => { setTempRate(activeCycle.rate); setEditingRate(true); setTimeout(() => rateInputRef.current?.focus(), 50); }}
        >
          <Euro size={24} style={{ color: '#E67E22', marginBottom: 4 }} />
          {editingRate ? (
            <div>
              <input
                ref={rateInputRef}
                type="number" min="0" step="5" value={tempRate}
                onChange={e => setTempRate(e.target.value)}
                onBlur={async () => {
                  const v = parseFloat(tempRate);
                  if (!isNaN(v) && v >= 0) {
                    const oldRate = activeCycle.rate;
                    if (v !== oldRate) {
                      const clientSessions = allSessions.filter(s => s.clientId === clientId);
                      for (const s of clientSessions) {
                        if (s.status !== 'scheduled' && (s.paymentAmount === null || s.paymentAmount === undefined)) {
                          s.paymentAmount = oldRate;
                          await updateSession(s.id, { paymentAmount: oldRate });
                        }
                      }
                    }
                    await updateClient(client.id, { sessionRate: v });
                    if (activeCycle && activeCycle.id !== 'tc_initial') {
                      await updateTherapyCycle(activeCycle.id, { rate: v });
                    }
                  }
                  setEditingRate(false);
                }}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                onClick={e => e.stopPropagation()}
                style={{ width: 50, border: '2px solid #E67E22', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#FFF3E0', color: '#E67E22', outline: 'none' }}
              />
            </div>
          ) : (
            <div className="stat-value" style={{ fontSize: '1.286rem', color: '#E67E22', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              {activeCycle.rate}€
              <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
          <div className="stat-label" style={{ fontSize: '0.643rem' }}>Tarif spécifique</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)', cursor: 'pointer' }}
          onClick={() => { setTempFrequency(client?.sessionFrequency || 2); setEditingFrequency(true); setTimeout(() => frequencyInputRef.current?.focus(), 50); }}
          title="Cliquer pour modifier la fréquence"
        >
          <RefreshCw size={24} style={{ color: '#2B6CB0', marginBottom: 4 }} />
          {editingFrequency ? (
            <div>
              <input
                ref={frequencyInputRef}
                type="number" min="1" max="8" value={tempFrequency}
                onChange={e => setTempFrequency(e.target.value)}
                onBlur={() => { const v = parseInt(tempFrequency); if (v > 0) updateClient(client.id, { sessionFrequency: v }); setEditingFrequency(false); }}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                onClick={e => e.stopPropagation()}
                style={{ width: 40, border: '2px solid #2B6CB0', borderRadius: 6, textAlign: 'center', fontSize: '1.286rem', fontWeight: 700, padding: '1px 2px', background: '#EBF8FF', color: '#2B6CB0', outline: 'none' }}
              />
            </div>
          ) : (
            <div className="stat-value" style={{ fontSize: '1.286rem', color: '#2B6CB0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
              {client?.sessionFrequency || 2}/M
              <Edit3 size={12} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
          <div className="stat-label" style={{ fontSize: '0.643rem' }}>Fréquence</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-sm)' }}>
          <ReportIcon size={24} color={pendingReportsCount > 0 ? 'var(--warning)' : 'var(--info)'} style={{ marginBottom: 4 }} />
          <div className="stat-value" style={{ fontSize: '1.286rem', color: pendingReportsCount > 0 ? 'var(--warning)' : undefined }}>{pendingReportsCount}</div>
          <div className="stat-label" style={{ fontSize: '0.643rem' }}>CR en attente</div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Euro, HelpCircle, Hourglass } from 'lucide-react';
import ConfirmBadge from '../ConfirmBadge';
import PaymentBadge from '../PaymentBadge';
import InvoiceBadge from '../InvoiceBadge';

export default function ClientFinancialPanel({
  sessions,
  client,
  therapyCycles,
  activeCycle,
  sessionNumbers,
  safeGetRate,
  getInvoiceForSession,
  formatDate,
  setExpandedSessionId,
  setContactNote,
  setShowContactForm,
  sessionRates,
  defaultPhaseKey,
  getPhaseColor
}) {
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const scheduledSessions = sessions.filter(s => s.status === 'scheduled');
  const now = new Date();
  const cancelledWithPayment = sessions.filter(s => s.status === 'cancelled' && s.paymentAmount && s.paymentAmount > 0);
  const allBillableSessions = [...completedSessions, ...scheduledSessions, ...cancelledWithPayment];
  const pAmountOf = s => s.paymentAmount ?? safeGetRate(s.id);

  const getEndTime = s => new Date(new Date(s.date).getTime() + (s.duration || 60) * 60000);
  
  const totalBilled = sessions.filter(s =>
    s.status === 'completed' ||
    (s.status === 'scheduled' && getEndTime(s) <= now) ||
    (s.status === 'cancelled' && s.paymentAmount > 0)
  ).reduce((sum, s) => sum + pAmountOf(s), 0);

  const totalPlanned = sessions.filter(s =>
    s.status === 'scheduled' && getEndTime(s) > now
  ).reduce((sum, s) => sum + pAmountOf(s), 0);

  const totalForecast = totalBilled + totalPlanned;
  const paidSessions = allBillableSessions.filter(s => s.paymentReceived && s.paymentMethod);
  const totalCollected = paidSessions.reduce((sum, s) => sum + pAmountOf(s), 0);
  const deferredSessions = allBillableSessions.filter(s => s.paymentMethod && !s.paymentReceived && pAmountOf(s) > 0 && s.status !== 'scheduled');
  const unpaid = allBillableSessions.filter(s => {
    if (s.paymentMethod) return false;
    const isCoveredByAnother = sessions.some(other =>
      other.id !== s.id && other.paymentMethod && (other.coveredSessionIds || []).includes(s.id)
    );
    return !isCoveredByAnother;
  });
  const pendingInvoices = allBillableSessions.filter(s => {
    const inv = getInvoiceForSession(s.id);
    return inv && !inv.sent;
  });

  const getSessionCycle = (session) => {
    for (let i = therapyCycles.length - 1; i >= 0; i--) {
      if (session.date >= therapyCycles[i].startDate) return therapyCycles[i];
    }
    return therapyCycles[0];
  };

  return (
    <div className="card" style={{ marginTop: 'var(--space-md)' }}>
      <div className="card-header">
        <Euro size={18} />
        <h3 style={{ fontSize: '0.929rem' }}>Suivi financier</h3>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
        <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: 'var(--primary-100)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--primary-700)' }}>{totalBilled}€</div>
          <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Honoraires dûs</div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.143rem', fontWeight: 700, color: 'var(--primary-700)' }}>{totalPlanned}€</div>
          <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Honoraires planifiés</div>
        </div>
        <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: '#F0FFF4', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '1.143rem', fontWeight: 700, color: '#276749' }}>{totalCollected}€</div>
          <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Encaissé</div>
        </div>
        {(() => {
          const resteDu = totalBilled - totalCollected;
          return (
            <div style={{ textAlign: 'center', padding: 'var(--space-xs)', background: resteDu > 0 ? '#FFF5F5' : '#F0FFF4', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.143rem', fontWeight: 700, color: resteDu > 0 ? 'var(--error)' : '#276749' }}>{resteDu}€</div>
              <div style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Restant dû</div>
            </div>
          );
        })()}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.643rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>
          <span>Taux d'encaissement</span>
          {(() => { const pct = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0; return <span style={{ fontWeight: 700, color: pct >= 100 ? '#276749' : 'var(--error)' }}>{pct}%</span> })()}
        </div>
        <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3 }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: 'var(--primary-700)',
            width: `${totalBilled > 0 ? Math.min((totalCollected / totalBilled) * 100, 100) : 0}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>

      {/* Alerts */}
      {(() => {
        const unpaidCompleted = unpaid.filter(s => s.status === 'completed' || s.isToConfirm);
        return unpaidCompleted.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', background: '#FFFBEB',
            borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
            border: '1px solid #FEF3C7'
          }}>
            <HelpCircle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
            <span style={{ fontSize: '0.714rem', color: '#D97706', fontWeight: 600 }}>
              Séances à confirmer : {unpaidCompleted.length} séance{unpaidCompleted.length > 1 ? 's' : ''}
            </span>
          </div>
        );
      })()}
      {deferredSessions.length > 0 && (() => {
        const totalDueRem = deferredSessions.reduce((sum, s) => sum + pAmountOf(s), 0);
        return (
          <div
            onClick={() => {
              const lines = deferredSessions.map(ds => {
                const dsNum = sessionNumbers?.[ds.id] || '?';
                const dsRate = safeGetRate(ds.id);
                const pmLabel = { cheque: 'chèque', virement: 'virement' }[ds.paymentMethod] || '';
                return `• Séance ${dsNum} du ${formatDate(ds.date)} – ${dsRate}€ (${pmLabel})`;
              }).join('\n');
              const reminder = `Relance paiement – ${deferredSessions.length} séance${deferredSessions.length > 1 ? 's' : ''} en attente d'encaissement.\nBonjour,\nJe me permets de vous contacter concernant les règlements suivants :\n${lines}\nMerci de procéder au règlement à votre convenance.\nBien cordialement`;
              setContactNote(reminder);
              setShowContactForm(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: '#FFF5F5',
              borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
              border: '1px solid #FED7D7', cursor: 'pointer', transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#FED7D7'}
            onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
            title="Cliquer pour relancer les paiements"
          >
            <Hourglass size={14} style={{ color: 'var(--error)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.714rem', color: 'var(--error)', fontWeight: 600 }}>
              Paiements en attente d'encaissement : {totalDueRem}€
            </span>
          </div>
        );
      })()}
      {pendingInvoices.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: '#EBF8FF',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-xs)',
          border: '1px solid #BEE3F8'
        }}>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <text x="12" y="17" textAnchor="middle" fill="var(--primary-500)" stroke="none" fontSize="10" fontWeight="800">€</text>
            </svg>
          </span>
          <span style={{ fontSize: '0.714rem', color: 'var(--primary-500)', fontWeight: 600 }}>
            Factures à émettre : {pendingInvoices.length} séance{pendingInvoices.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Per-session breakdown */}
      <div style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 'var(--space-xs)', marginBottom: 4 }}>Détail par séance</div>
      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
        {(() => {
          const sortedBillable = [...allBillableSessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          let lastFinCycleId = null;
          return sortedBillable.map((s) => {
            const sCycle = getSessionCycle(s);
            const sNum = sessionNumbers[s.id];
            const isPaid = s.paymentReceived;
            const noPayment = !s.paymentMethod;
            const isScheduled = s.status === 'scheduled';
            const isCancelled = s.status === 'cancelled';
            const isToConfirm = s.isToConfirm || (isScheduled && s.isCompleted);
            const showSep = therapyCycles.length > 1 && sCycle && lastFinCycleId !== null && sCycle.id !== lastFinCycleId;
            lastFinCycleId = sCycle?.id;
            return (
              <React.Fragment key={s.id}>
                {showSep && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--primary-200)' }} />
                    <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--primary-400)', whiteSpace: 'nowrap' }}>
                      Thérapie #{therapyCycles.indexOf(sCycle) + 1}
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'var(--primary-200)' }} />
                  </div>
                )}
                <div key={s.id}
                  onClick={() => setExpandedSessionId(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: '3px 0', borderBottom: '1px solid var(--border-light)',
                    gap: 6, cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)', transition: 'background 0.1s',
                    opacity: isScheduled && !isPaid && !isToConfirm ? 0.6 : 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  title="Ouvrir le détail de la séance"
                >
                  <span style={{ fontSize: '0.714rem', color: isCancelled ? 'var(--error)' : isScheduled ? 'var(--text-tertiary)' : 'var(--text-secondary)', flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isCancelled ? `Annulée · ${formatDate(s.date)}` : (() => {
                      if (isScheduled && !isCancelled && !isToConfirm) {
                        const spc = getPhaseColor(s.phase || defaultPhaseKey);
                        return <>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: spc.bg, color: spc.color, fontWeight: 700, fontSize: '0.643rem', padding: '1px 5px', borderRadius: 'var(--radius-sm)', minWidth: 20 }}>S{sNum}</span>
                          <span>· {formatDate(s.date)}</span>
                          <span style={{ fontSize: '0.571rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Planifiée</span>
                        </>
                      }
                      return `S${sNum} · ${formatDate(s.date)}`;
                    })()}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isScheduled && !isPaid && !isToConfirm ? null : pAmountOf(s) === 0 ? (
                      <span style={{ fontSize: '0.643rem', fontWeight: 700, color: 'var(--error)' }}>Séance offerte</span>
                    ) : noPayment && (!isScheduled || isToConfirm) ? (
                      <ConfirmBadge />
                    ) : (
                      <PaymentBadge method={s.paymentMethod} received={isPaid} size="sm" />
                    )}
                    {(() => {
                      const inv = getInvoiceForSession(s.id);
                      return inv ? (
                        <InvoiceBadge sent={inv.sent} />
                      ) : null;
                    })()}
                  </div>
                  <span style={{
                    fontSize: '0.714rem', fontWeight: 700, minWidth: 40, textAlign: 'right',
                    color: isScheduled && !isPaid && !isToConfirm ? 'var(--text-tertiary)' : (isPaid && s.paymentMethod ? 'var(--success)' : 'var(--error)')
                  }}>
                    {isCancelled ? pAmountOf(s) : safeGetRate(s.id)}€
                  </span>
                </div>
              </React.Fragment>
            );
          });
        })()}
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { RefreshCw, Clock, CheckCircle, Edit3, Trash2, HelpCircle } from 'lucide-react';
import SessionCard from '../session/SessionCard';

export default function ClientTimelinePanel({
  client,
  clients,
  contacts,
  sessions,
  therapyCycles,
  setTherapyCycles,
  getSessionCycle,
  getClientName,
  contactIcons,
  contactLabels,
  contactColors,
  showContactForm,
  setShowContactForm,
  contactType,
  setContactType,
  contactDate,
  setContactDate,
  contactNote,
  setContactNote,
  editingContactId,
  setEditingContactId,
  handleAddContact,
  handleUpdateContact,
  handleDeleteContact,
  updateContact,
  phaseFilter,
  confirmingContactId,
  setConfirmingContactId,
  confirmContactDate,
  setConfirmContactDate,
  sessionNumbers,
  sessionUpdates,
  recordingSessionId,
  safeGetRate,
  expandedSessionId,
  setExpandedSessionId,
  deleteSession,
  getPhaseColor,
  getPhaseIcon,
  getPhaseLabel,
  getClientType,
  isProspect,
  formatDate,
  formatTime,
  navigate,
  activeCycle,
  confirm,
  defaultPhaseKey
}) {
  const Phone = contactIcons.phone;

  const parrainageEvents = useMemo(() => {
    return (client.clientLinks || []).filter(l => l.type === 'parrainage' || l.type === 'parrainage-pro').map(link => {
      const isPro = link.type === 'parrainage-pro';
      const linkedName = isPro ? link.proName : (() => { const c = clients.find(c => c.id === link.clientId); return c ? getClientName(c) : link.clientId })();
      const isParrain = link.role === 'parrain';
      return {
        id: `parrainage-link-${link.clientId || link.proId}`,
        itemType: 'contact',
        type: 'parrainage',
        date: (client.createdAt || client.startDate || new Date().toISOString()).split('T')[0],
        note: isParrain ? `A parrainé ${linkedName}` : `Parrainé par ${linkedName}`,
        linkedClientId: isPro ? null : link.clientId,
        linkedClientName: linkedName,
        done: true
      };
    });
  }, [client, clients, getClientName]);

  const timelineItems = useMemo(() => {
    const rawTimelineItems = [
      ...sessions.map(s => ({ ...s, itemType: 'session' })),
      ...contacts.filter(c => c.type !== 'parrainage').map(c => ({ ...c, itemType: 'contact' })),
      ...parrainageEvents
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const items = [];
    let lastCycleId = null;
    rawTimelineItems.forEach(item => {
      if (therapyCycles.length > 1) {
        const itemDate = item.date;
        let itemCycle = null;
        if (item.itemType === 'session') {
          itemCycle = getSessionCycle(item);
        } else {
          for (let i = therapyCycles.length - 1; i >= 0; i--) {
            if (itemDate >= therapyCycles[i].startDate) { itemCycle = therapyCycles[i]; break; }
          }
          if (!itemCycle) itemCycle = therapyCycles[0];
        }
        if (itemCycle && lastCycleId !== null && itemCycle.id !== lastCycleId) {
          const cycleIdx = therapyCycles.findIndex(c => c.id === itemCycle.id);
          const nextCycleIdx = cycleIdx + 1;
          const nextCycleStartDate = therapyCycles[nextCycleIdx]?.startDate || '';
          const cyclesWithSessions = therapyCycles.slice(0, nextCycleIdx + 1).filter(c => sessions.some(s => s.date >= c.startDate && getSessionCycle(s)?.id === c.id)).length;
          items.push({ itemType: 'cycleSeparator', cycleIndex: cyclesWithSessions || 1, startDate: nextCycleStartDate, cycleId: therapyCycles[nextCycleIdx]?.id, id: `sep_${itemCycle.id}` });
        }
        lastCycleId = itemCycle?.id;
      }
      items.push(item);
    });
    return items;
  }, [sessions, contacts, parrainageEvents, therapyCycles, getSessionCycle]);

  return (
    <>
      {/* Add Contact Form */}
      {showContactForm && !editingContactId && (
        <div style={{
          padding: 'var(--space-sm)',
          background: '#FAFAFA',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-sm)',
          border: '1px solid var(--border-light)'
        }}>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
            {['phone', 'email', 'sms', 'social', 'web'].map(t => {
              const Icon = contactIcons[t];
              const cc = contactColors[t];
              return (
                <button
                  key={t}
                  onClick={() => setContactType(t)}
                  style={{
                    padding: '4px 10px', borderRadius: 'var(--radius-md)',
                    border: '2px solid transparent',
                    background: contactType === t ? cc.bg : 'white',
                    color: cc.color, fontSize: '0.714rem', fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <Icon size={12} /> {contactLabels[t]}
                </button>
              );
            })}
          </div>
          <input
            type="datetime-local"
            className="input"
            value={contactDate}
            onChange={e => setContactDate(e.target.value)}
            style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)', width: '100%' }}
          />
          <textarea
            className="input"
            placeholder="Note sur le contact…"
            value={contactNote}
            onChange={e => setContactNote(e.target.value)}
            rows={6}
            style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)', width: '100%', resize: 'vertical', lineHeight: 1.6 }}
          />
          <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" style={{ fontSize: '0.714rem', padding: '4px 8px' }} onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactNote(''); }}>Annuler</button>
            <button className="btn btn-primary" style={{ fontSize: '0.714rem', padding: '4px 10px' }} onClick={editingContactId ? handleUpdateContact : handleAddContact}>
              {editingContactId ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Merged Timeline — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
        {timelineItems.filter(item => !phaseFilter || item.itemType !== 'session' || item.phase === phaseFilter).map(item => {
          if (item.itemType === 'cycleSeparator') {
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-md)',
                margin: 'var(--space-xs) 0'
              }}>
                <div style={{ flex: 1, height: 2, background: 'var(--primary-200)' }} />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.714rem', fontWeight: 700, color: 'var(--primary-700)',
                  whiteSpace: 'nowrap',
                  padding: '4px 12px', background: 'transparent', borderRadius: 'var(--radius-full)',
                  border: 'none'
                }}>
                  <RefreshCw size={11} />
                  Thérapie #{item.cycleIndex} démarrée le
                  <input
                    type="date"
                    key={item.cycleId + '-' + item.startDate}
                    defaultValue={item.startDate}
                    min={client?.startDate || '2020-01-01'}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={e => {
                      const newDate = e.target.value;
                      if (!newDate) return;
                      const minDate = client?.startDate || '2020-01-01';
                      const today = new Date().toISOString().slice(0, 10);
                      if (newDate < minDate || newDate > today) {
                        e.target.value = item.startDate;
                        return;
                      }
                      setTherapyCycles(prev => prev.map(c => c.id === item.cycleId ? { ...c, startDate: newDate } : c));
                    }}
                    style={{
                      border: 'none', background: 'transparent', fontWeight: 700,
                      color: 'var(--primary-700)', fontSize: '0.714rem',
                      cursor: 'pointer', padding: 0, fontFamily: 'inherit'
                    }}
                  />
                </div>
                <div style={{ flex: 1, height: 2, background: 'var(--primary-200)' }} />
              </div>
            );
          }
          if (item.itemType === 'contact') {
            const ContactIcon = contactIcons[item.type] || Phone;
            const cc = contactColors[item.type] || contactColors.phone;
            const isContactFuture = new Date(item.date) > new Date();
            return (
              <React.Fragment key={item.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  padding: 'var(--space-sm)',
                  background: 'white',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: `3px solid ${cc.color}`,
                  width: '70%',
                  marginLeft: 'auto',
                  opacity: isContactFuture && !item.done ? 0.7 : 1
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 'var(--radius-full)',
                    background: 'white', color: cc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: `1px solid ${cc.color}20`
                  }}>
                    <ContactIcon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.714rem', fontWeight: 600, color: cc.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {contactLabels[item.type]} · {formatDate(item.date)} · {formatTime(item.date)}
                      {item.type !== 'parrainage' && isContactFuture && !item.done && (
                        <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <Clock size={10} /> Planifié
                        </span>
                      )}
                      {item.type !== 'parrainage' && item.done && (
                        <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <CheckCircle size={10} /> Effectué
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {item.type === 'parrainage' && item.linkedClientId ? (
                        <>
                          {item.note.replace(item.linkedClientName, '').trim()}{' '}
                          <span
                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${item.linkedClientId}`); }}
                            style={{ color: '#8B5CF6', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 2 }}
                          >
                            {item.linkedClientName}
                          </span>
                        </>
                      ) : item.note}
                    </div>
                  </div>
                  {item.type !== 'parrainage' && (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                      {(isContactFuture || item.done) && (
                        <button onClick={async () => {
                          if (item.done) {
                            await updateContact(item.id, { done: false });
                          } else {
                            setConfirmingContactId(confirmingContactId === item.id ? null : item.id);
                            setConfirmContactDate(new Date().toISOString().slice(0, 16));
                          }
                        }} style={{
                          width: 26, height: 26, borderRadius: 'var(--radius-full)',
                          background: item.done ? 'var(--success)' : 'transparent',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: item.done ? 'white' : 'var(--success)',
                          transition: 'all 0.2s',
                          border: item.done ? '2px solid var(--success)' : '1.5px solid var(--success)'
                        }}
                          onMouseEnter={e => { if (!item.done) { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; } }}
                          onMouseLeave={e => { if (!item.done) { e.currentTarget.style.background = item.done ? 'var(--success)' : 'transparent'; e.currentTarget.style.color = item.done ? 'white' : 'var(--success)'; } }}
                          title={item.done ? 'Marquer comme non effectué' : 'Confirmer comme effectué'}
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => {
                          setEditingContactId(item.id);
                          setContactType(item.type);
                          setContactDate(item.date);
                          setContactNote(item.note);
                          setShowContactForm(true);
                      }} style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                        transition: 'all 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary-600)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                        title="Modifier">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleDeleteContact(item.id)} style={{
                        width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)',
                        transition: 'all 0.15s'
                      }} onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--error)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                        title="Supprimer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
                {confirmingContactId === item.id && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', marginTop: 4,
                    background: 'white', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    width: '70%', marginLeft: 'auto',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    animation: 'fadeIn 0.15s ease-out'
                  }}>
                    <span style={{ fontSize: '0.714rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Date de réalisation :</span>
                    <input
                      type="datetime-local"
                      value={confirmContactDate}
                      onChange={e => setConfirmContactDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 16)}
                      style={{ fontSize: '0.714rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', fontFamily: 'inherit', flex: 1 }}
                    />
                    <button
                      onClick={async () => {
                        await updateContact(item.id, { done: true, date: confirmContactDate });
                        setConfirmingContactId(null);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--success)', color: 'white', border: 'none',
                        fontSize: '0.714rem', fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', whiteSpace: 'nowrap'
                      }}
                    >
                      <CheckCircle size={12} /> Confirmer
                    </button>
                    <button
                      onClick={() => setConfirmingContactId(null)}
                      style={{
                        padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                        background: 'transparent', color: 'var(--text-tertiary)', border: '1px solid var(--border-light)',
                        fontSize: '0.714rem', cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                )}
                {editingContactId === item.id && showContactForm && (
                  <div style={{
                    padding: 'var(--space-sm)', marginTop: 4,
                    background: '#FAFAFA', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    width: '70%', marginLeft: 'auto',
                    animation: 'fadeIn 0.15s ease-out'
                  }}>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      {['phone', 'email', 'sms', 'social', 'web'].map(t => {
                        const Icon = contactIcons[t];
                        const ctc = contactColors[t];
                        return (
                          <button key={t} onClick={() => setContactType(t)} style={{
                            padding: '4px 8px', borderRadius: 'var(--radius-md)',
                            border: '2px solid transparent',
                            background: contactType === t ? ctc.bg : 'white',
                            color: ctc.color, fontSize: '0.643rem', fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3
                          }}>
                            <Icon size={11} /> {contactLabels[t]}
                          </button>
                        );
                      })}
                    </div>
                    <input type="datetime-local" className="input" value={contactDate}
                      onChange={e => setContactDate(e.target.value)}
                      style={{ fontSize: '0.714rem', marginBottom: 'var(--space-xs)', width: '100%' }}
                    />
                    <textarea className="input" placeholder="Note sur le contact…" value={contactNote}
                      onChange={e => setContactNote(e.target.value)} rows={3}
                      onKeyDown={e => e.stopPropagation()}
                      style={{ fontSize: '0.714rem', marginBottom: 'var(--space-xs)', width: '100%', resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: 'var(--space-xs)', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost" style={{ fontSize: '0.643rem', padding: '3px 6px' }} onClick={() => { setShowContactForm(false); setEditingContactId(null); setContactNote(''); }}>Annuler</button>
                      <button className="btn btn-primary" style={{ fontSize: '0.643rem', padding: '3px 8px' }} onClick={handleUpdateContact}>Modifier</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          }

          const session = item;
          const effectivePhase = (session.phase === 'prospect' ? defaultPhaseKey : session.phase) || client?.phase || defaultPhaseKey;
          const sessionNum = sessionNumbers[session.id];
          const update = sessionUpdates[session.id];
          const hasReport = session.hasReport || update?.hasReport;
          const summary = update?.summary || session.summary;
          const sessionRate = safeGetRate(session.id);
          
          return (
            <div key={session.id} id={`session-${session.id}`}>
              <SessionCard
                session={session}
                sessionNumber={sessionNum}
                phaseColor={getPhaseColor(effectivePhase)}
                PhaseIcon={getPhaseIcon(effectivePhase)}
                phaseLabel={getPhaseLabel(effectivePhase)}
                showClientName={false}
                clientType={getClientType(client)}
                maxChars={35}
                sessionRate={sessionRate}
                isExpanded={expandedSessionId === session.id}
                showExpandedStyle={true}
                hasReport={hasReport}
                reportSummary={summary}
                formatDate={formatDate}
                formatTime={formatTime}
                onClick={() => setExpandedSessionId(session.id)}
                dimmed={therapyCycles.length > 1 && getSessionCycle(session)?.id !== activeCycle.id}
                isProspect={isProspect(client)}
                onDelete={session.status === 'cancelled' ? async (sid) => {
                  const ok = await confirm('Supprimer définitivement cette séance annulée ?\nElle disparaîtra du timeline et du calendrier.', { variant: 'destructive' });
                  if (!ok) return;
                  await deleteSession(sid);
                } : undefined}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

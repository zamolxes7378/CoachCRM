import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, User, Award, Link2, CheckSquare, Square, Archive } from 'lucide-react'
import { useConfirm } from '../../context/ConfirmContext'

export default function ClientsList({
  filtered,
  clients,
  activeTab,
  sessionsByClient,
  getPhaseColor,
  getPhaseIcon,
  getComputedStatus,
  getClientName,
  getClientInitials,
  getPhaseLabel,
  getClientType,
  formatDate,
  recruitmentSources,
  updateClient,
}) {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const [selected, setSelected] = useState(new Set())
  const [archiving, setArchiving] = useState(false)

  const getLastSession = (clientId) => {
    const s = sessionsByClient.get(clientId)
    if (!s || s.past.length === 0) return null
    return s.past.sort((a, b) => b.date.localeCompare(a.date))[0].date
  }
  const getNextSession = (clientId) => {
    const s = sessionsByClient.get(clientId)
    if (!s || s.future.length === 0) return null
    return s.future.sort((a, b) => a.date.localeCompare(b.date))[0].date
  }

  return (
    <>
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        <table className="table-standard">
          <caption className="sr-only">{activeTab === 'clients' ? 'Liste des clients' : 'Liste des prospects'}</caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 36 }}>
                <button
                  onClick={() => {
                    if (selected.size === filtered.length) setSelected(new Set())
                    else setSelected(new Set(filtered.map(c => c.id)))
                  }}
                  aria-label={selected.size === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: selected.size === filtered.length && filtered.length > 0 ? 'var(--error)' : 'var(--text-tertiary)' }}
                >
                  {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
              </th>
              <th scope="col">Nom</th>
              {activeTab === 'clients' ? (<>
                <th scope="col">Phase</th>
                <th scope="col">Séances</th>
                <th scope="col">Dernier RDV</th>
                <th scope="col">Prochain RDV</th>
                <th scope="col">Parrain de</th>
              </>) : (<>
                <th scope="col">Premier contact</th>
                <th scope="col">Source</th>
                <th scope="col">Recommandé par</th>
              </>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => {
              const PhaseIcon = getPhaseIcon(client.phase)
              const pc = getPhaseColor(client.phase)?.color || 'var(--primary-600)'
              const referrals = clients.filter(c => c.referredBy === client.id)
              const referrer = client.referredBy ? clients.find(c => c.id === client.referredBy) : null
              const isChecked = selected.has(client.id)
              return (
                <tr key={client.id} style={{ cursor: 'pointer', background: isChecked ? 'var(--primary-50)' : 'transparent', transition: 'background 0.1s' }}
                  onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = 'var(--primary-50)' }}
                  onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={{ width: 36 }}>
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); s.has(client.id) ? s.delete(client.id) : s.add(client.id); return s }) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: isChecked ? 'var(--error)' : 'var(--text-tertiary)' }}
                    >
                      {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                  </td>
                  <th scope="row" style={{ fontWeight: 600 }} onClick={() => navigate(`/clients/${client.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="client-avatar" style={{ width: 32, height: 32, fontSize: '0.714rem', ...(getComputedStatus(client) === 'inactive' || client.phase === 'completed' ? { background: 'var(--primary-200)', color: 'white' } : client.phase === 'prospect' ? { background: '#E8D8FE', color: '#6B46C1' } : {}) }}>
                        {getClientInitials(client)}
                      </div>
                      {getClientName(client)}
                      {!client.partnerB && <User size={14} style={{ color: 'var(--text-tertiary)' }} />}
                    </div>
                  </th>
                  {activeTab === 'clients' ? (<>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PhaseIcon size={14} style={{ color: pc }} />
                        <span style={{ color: pc, fontWeight: 500, fontSize: '0.786rem' }}>{client.phase === 'completed' ? 'Terminé' : getPhaseLabel(client.phase)}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{client.sessionsCount}/{client.totalSessions}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{getLastSession(client.id) ? formatDate(getLastSession(client.id)) : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{getNextSession(client.id) ? formatDate(getNextSession(client.id)) : '—'}</td>
                    <td>
                      {referrals.length > 0 ? (
                        <span style={{ color: '#6B46C1', fontWeight: 500, fontSize: '0.786rem' }}>
                          <Award size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                          {referrals.map(r => getClientName(r)).join(', ')}
                        </span>
                      ) : '—'}
                    </td>
                  </>) : (<>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(client.startDate)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{(() => {
                      if (client.referrerType === 'particulier') return 'Parrain externe'
                      const hasExternalParrain = (client.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul' && (() => { const ref = clients.find(c => c.id === l.clientId); return ref?.referrerType === 'particulier' })())
                      return hasExternalParrain ? 'Parrain externe' : (recruitmentSources.find(s => s.key === client.source) || {}).label || client.source || '—'
                    })()}</td>
                    <td>
                      {referrer ? (
                        <span style={{ color: '#6B46C1', fontWeight: 500, fontSize: '0.786rem' }}>
                          <Link2 size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                          {getClientName(referrer)}
                        </span>
                      ) : '—'}
                    </td>
                  </>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
          padding: '12px 24px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid var(--border-light)',
          zIndex: 100,
          animation: 'bulkBarIn 0.2s ease-out'
        }}>
          <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--error)' }}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
          <div style={{ width: 1, height: 20, background: 'var(--border-light)' }} />
          <button onClick={() => setSelected(new Set())} className="btn btn-ghost" style={{ fontSize: '0.786rem', padding: '5px 10px' }}>
            Désélectionner
          </button>
          <button
            onClick={async () => {
              const count = selected.size
              if (!await confirm(`Archiver ${count} client${count > 1 ? 's' : ''} ?\n\nIls seront déplacés dans « Clients archivés » et pourront être restaurés.`)) return
              setArchiving(true)
              try {
                for (const id of selected) {
                  await updateClient(id, { deletedAt: new Date().toISOString() })
                }
                setSelected(new Set())
              } catch (err) {
                console.error('Bulk archive error:', err)
                await confirm('Erreur lors de l\'archivage.', { variant: 'alert' })
              } finally {
                setArchiving(false)
              }
            }}
            disabled={archiving}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '0.857rem', fontWeight: 700,
              background: 'var(--error)', color: 'white',
              border: 'none', cursor: archiving ? 'wait' : 'pointer',
              transition: 'all 0.15s',
              opacity: archiving ? 0.6 : 1
            }}
          >
            <Archive size={15} />
            {archiving ? 'Archivage...' : 'Archiver'}
          </button>
        </div>
      )}
      <style>{`@keyframes bulkBarIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
    </>
  )
}

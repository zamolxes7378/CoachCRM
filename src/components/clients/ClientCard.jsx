import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, User, Globe, Phone, UserCheck, CheckCircle, HelpCircle, Calendar, Award, Link2 } from 'lucide-react'

const sourceIcons = { website: Globe, phone: Phone, referral: UserCheck }

export default function ClientCard({
  client,
  clients,
  therapyPhasesData,
  sessions,
  getPhaseColor,
  getPhaseIcon,
  getComputedStatus,
  getClientName,
  getClientInitials,
  getPhaseLabel,
  getStatusLabel,
  getClientType,
  formatDate,
  recruitmentSources,
  sessionsByClient,
}) {
  const navigate = useNavigate()

  const getNextSession = (clientId) => {
    const s = sessionsByClient.get(clientId)
    if (!s || s.future.length === 0) return null
    return s.future.sort((a, b) => a.date.localeCompare(b.date))[0].date
  }
  const getLastSession = (clientId) => {
    const s = sessionsByClient.get(clientId)
    if (!s || s.past.length === 0) return null
    return s.past.sort((a, b) => b.date.localeCompare(a.date))[0].date
  }

  const PhaseIcon = getPhaseIcon(client.phase)
  const cType = getClientType(client)

  return (
    <div
      className={`card card-clickable ${getComputedStatus(client) === 'inactive' || getComputedStatus(client) === 'completed' ? 'card-inactive' : ''}`}
      onClick={() => navigate(`/clients/${client.id}`)}
      style={{ position: 'relative' }}
    >
      {cType === 'individual'
        ? <User size={20} style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-tertiary)', opacity: 0.5 }} title="Individuel" />
        : cType === 'family'
          ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: 12, right: 12, opacity: 0.5 }} title="Famille">
              <circle cx="7" cy="6" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="12" cy="9" r="2" />
              <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20" />
              <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20" />
            </svg>
          )
          : <Users size={20} style={{ position: 'absolute', top: 12, right: 12, color: 'var(--text-tertiary)', opacity: 0.5 }} title="Couple" />
      }

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div className="client-avatar" style={{ width: 48, height: 48, fontSize: '1rem', ...(getComputedStatus(client) === 'inactive' || client.phase === 'completed' ? { background: 'var(--primary-200)', color: 'var(--text-inverse)' } : client.phase === 'prospect' ? { background: '#E8D8FE', color: '#6B46C1' } : {}) }}>
          {getClientInitials(client)}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 2 }}>{getClientName(client)}</h3>
          <p style={{ fontSize: '0.786rem', color: 'var(--text-secondary)' }}>
            {`Premier contact : ${formatDate(client.startDate)}`}
          </p>
        </div>
      </div>

      {client.phase !== 'prospect' && client.phase !== 'completed' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
            {(() => {
              const pc = getPhaseColor(client.phase)
              return (<>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: pc.bg, color: pc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PhaseIcon size={16} />
                </div>
                <span style={{ fontSize: '0.786rem', fontWeight: 600, color: pc.color }}>{getPhaseLabel(client.phase)}</span>
              </>)
            })()}
            {(getComputedStatus(client) === 'completed' || client.status === 'completed') && (
              <span className="badge badge-status-completed">
                <CheckCircle size={12} />
                {getStatusLabel('completed')}
              </span>
            )}
          </div>
          <span className="caption" style={{ color: 'var(--text-secondary)' }}>
            {`${client.sessionsCount}/${client.totalSessions} séances`}
          </span>
        </div>
      )}

      {client.phase !== 'prospect' && (() => {
        const phases = therapyPhasesData.map(tp => tp.key)
        const nowStr = new Date().toISOString()
        const clientSessions = sessions.filter(s => s.clientId === client.id && s.status !== 'cancelled')
        const doneByPhase = {}
        const schedByPhase = {}
        phases.forEach(p => {
          doneByPhase[p] = clientSessions.filter(s => s.phase === p && s.status !== 'scheduled' && s.date <= nowStr).length
          schedByPhase[p] = clientSessions.filter(s => s.phase === p && s.status === 'scheduled').length
        })
        const totalAssigned = phases.reduce((sum, p) => sum + (doneByPhase[p] || 0) + (schedByPhase[p] || 0), 0)
        const barBase = Math.max(client.totalSessions || 1, totalAssigned)
        return (
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: '#E2E8F0' }}>
            {phases.map(p => {
              const done = doneByPhase[p] || 0
              const sched = schedByPhase[p] || 0
              if (done + sched === 0) return null
              const pc = getPhaseColor(p)
              return (
                <React.Fragment key={p}>
                  {done > 0 && <div style={{ width: `${(done / barBase) * 100}%`, background: pc?.color || '#2B6CB0', transition: 'width 0.3s' }} title={`${getPhaseLabel(p)} : ${done} effectuée${done > 1 ? 's' : ''}`} />}
                  {sched > 0 && <div style={{ width: `${(sched / barBase) * 100}%`, background: pc?.bg || '#EBF8FF', borderLeft: done > 0 ? '1px solid white' : 'none', transition: 'width 0.3s' }} title={`${getPhaseLabel(p)} : ${sched} planifiée${sched > 1 ? 's' : ''}`} />}
                </React.Fragment>
              )
            })}
          </div>
        )
      })()}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 'var(--space-sm)' }}>
        {client.phase === 'prospect' && client.source ? (() => {
          const SourceIcon = sourceIcons[client.source] || Globe
          return (<>
            <SourceIcon size={14} style={{ color: '#6B46C1' }} />
            <span className="caption" style={{ color: 'var(--text-secondary)' }}>
              Source : {(() => {
                if (client.referrerType === 'particulier') return 'Parrain externe'
                const hasExternalParrain = (client.clientLinks || []).some(l => l.type === 'parrainage' && l.role === 'filleul' && (() => { const ref = clients.find(c => c.id === l.clientId); return ref?.referrerType === 'particulier' })())
                return hasExternalParrain ? 'Parrain externe' : (recruitmentSources.find(s => s.key === client.source) || {}).label || client.source
              })()}
            </span>
          </>)
        })() : client.phase === 'prospect' && !client.source ? (<>
          <HelpCircle size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span className="caption" style={{ color: 'var(--text-tertiary)' }}>
            Source non renseignée
          </span>
        </>) : (<>
          <Calendar size={14} style={{ color: getComputedStatus(client) === 'inactive' || client.phase === 'completed' ? 'var(--text-tertiary)' : 'var(--primary-500)' }} />
          <span className="caption" style={{ color: getComputedStatus(client) === 'inactive' || client.phase === 'completed' ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}>
            {getComputedStatus(client) === 'inactive' || client.phase === 'completed'
              ? (getLastSession(client.id) ? `Dernier RDV : ${formatDate(getLastSession(client.id))}` : 'Aucun RDV')
              : (getNextSession(client.id) ? `Prochain RDV : ${formatDate(getNextSession(client.id))}` : getLastSession(client.id) ? `Dernier RDV : ${formatDate(getLastSession(client.id))}` : 'Aucun RDV')
            }
          </span>
        </>)}
      </div>

      {(client.clientLinks || []).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
          {(client.clientLinks || []).map((link, idx) => {
            const linked = clients.find(c => c.id === link.clientId)
            if (!linked) return null
            const isDossier = link.type === 'dossier'
            const color = isDossier ? '#6366F1' : '#8B5CF6'
            const bg = isDossier ? '#EEF2FF' : '#F5F0FF'
            const roleLabel = link.type === 'parrainage' && link.role ? (link.role === 'parrain' ? 'Parrain de' : 'Filleul de') : 'Lié à'
            const Icon = isDossier ? Link2 : Award
            return (
              <div key={idx}
                onClick={e => { e.stopPropagation(); navigate(`/clients/${linked.id}`) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 'var(--radius-sm)', background: bg, fontSize: '0.643rem', fontWeight: 500, color, cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${color}15` }}
                onMouseEnter={e => e.currentTarget.style.background = color + '25'}
                onMouseLeave={e => e.currentTarget.style.background = bg}
                title={`${roleLabel} ${getClientName(linked)} — cliquer pour ouvrir`}
              >
                <Icon size={10} />
                {roleLabel} {getClientName(linked)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

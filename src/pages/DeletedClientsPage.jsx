import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, RotateCcw, Users, User, Home as Family } from 'lucide-react'
import { useData } from '../context/DataContext'

export default function DeletedClientsPage() {
  const navigate = useNavigate()
  const { clients: mockCouples, getCoupleName, formatDate } = useData()

  const deletedClients = mockCouples.filter(c => c.deleted)

  const handleRestore = (client) => {
    client.deleted = false
    client.deletedAt = null
    navigate('/admin/deleted-clients')
    // Force re-render
    window.dispatchEvent(new Event('storage'))
  }

  const typeConfig = {
    individual: { icon: User, label: 'Individuel' },
    couple: { icon: Users, label: 'Couple' },
    family: { icon: Family, label: 'Famille' }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="page-header">
        <h1 className="page-title">Clients archivés</h1>
      </div>

      {deletedClients.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--radius-full)',
            background: 'var(--primary-50)', color: 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-md)'
          }}>
            <Archive size={28} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Aucun client archivé
          </h3>
          <p style={{ fontSize: '0.857rem', color: 'var(--text-tertiary)' }}>
            Les clients archivés apparaîtront ici avec la possibilité de les restaurer.
          </p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Client</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Créé le</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Dernier RDV</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Archivé le</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '0.714rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-light)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {deletedClients.map(client => (
                <tr key={client.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-full)',
                        background: 'var(--primary-100)', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.786rem', fontWeight: 700
                      }}>
                        {client.type === 'individual' ? <User size={16} /> : <Users size={16} />}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.929rem' }}>
                        {getCoupleName(client)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.857rem', fontWeight: 600, padding: '3px 0',
                      color: 'var(--text-tertiary)',
                      display: 'inline-flex', alignItems: 'center', gap: 5
                    }}>
                      {(() => { const TC = (typeConfig[client.type] || typeConfig.couple).icon; return <TC size={16} /> })()}
                      {(typeConfig[client.type] || typeConfig.couple).label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>
                    {client.startDate ? formatDate(client.startDate) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>
                    {client.lastSession ? formatDate(client.lastSession) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>
                    {client.deletedAt ? formatDate(client.deletedAt) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.786rem', padding: '5px 12px', color: 'var(--accent-main)' }}
                      onClick={() => handleRestore(client)}
                    >
                      <RotateCcw size={14} /> Restaurer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

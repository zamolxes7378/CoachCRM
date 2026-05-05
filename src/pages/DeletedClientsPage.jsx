import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, RotateCcw, Users, User, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'

export default function DeletedClientsPage() {
  const navigate = useNavigate()
  const { clients, getClientName, formatDate, updateClient, deleteClient } = useData()
  const confirm = useConfirm()
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)

  const deletedClients = clients.filter(c => c.deleted)

  const handleRestore = async (client) => {
    // H-04: use DataContext API instead of direct mutation
    if (updateClient) {
      await updateClient(client.id, { deletedAt: null })
    }
    setSelected(prev => { const s = new Set(prev); s.delete(client.id); return s })
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleAll = () => {
    if (selected.size === deletedClients.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(deletedClients.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    const count = selected.size
    if (count === 0) return
    if (!await confirm(`Vous êtes sur le point de supprimer définitivement ${count} client${count > 1 ? 's' : ''} et toutes leurs données associées (séances, comptes rendus, contacts).\n\nCette action est IRRÉVERSIBLE.`, { title: '⚠️ SUPPRESSION DÉFINITIVE', variant: 'danger' })) return
    setDeleting(true)
    try {
      for (const id of selected) {
        await deleteClient(id)
      }
      setSelected(new Set())
    } catch (err) {
      console.error('Bulk delete error:', err)
      await confirm('Erreur lors de la suppression. Certains clients n\'ont peut-être pas été supprimés.', { variant: 'alert' })
    } finally {
      setDeleting(false)
    }
  }

  const allSelected = deletedClients.length > 0 && selected.size === deletedClients.length

  const typeConfig = {
    individual: { icon: User, label: 'Individuel' },
    client: { icon: Users, label: 'Client' },
    family: { icon: null, label: 'Famille' }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ marginBottom: 'var(--space-md)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="page-title">Clients archivés</h1>
        {deletedClients.length > 0 && (
          <span style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {deletedClients.length} client{deletedClients.length > 1 ? 's' : ''} archivé{deletedClients.length > 1 ? 's' : ''}
          </span>
        )}
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
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table-standard">
              <caption className="sr-only">Clients archivés</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 44 }}>
                    <button
                      onClick={toggleAll}
                      aria-label={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: allSelected ? 'var(--error)' : 'var(--text-tertiary)' }}
                    >
                      {allSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </th>
                  <th scope="col">Client</th>
                  <th scope="col">Type</th>
                  <th scope="col">Créé le</th>
                  <th scope="col">Archivé le</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedClients.map(client => {
                  const isChecked = selected.has(client.id)
                  return (
                    <tr key={client.id} style={{
                      background: isChecked ? 'var(--primary-50)' : 'transparent',
                      transition: 'background 0.1s'
                    }}>
                      <td style={{ width: 44 }}>
                        <button
                          onClick={() => toggleSelect(client.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: isChecked ? 'var(--error)' : 'var(--text-tertiary)' }}
                        >
                          {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <th scope="row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-full)',
                            background: 'var(--primary-100)', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.786rem', fontWeight: 700
                          }}>
                            {client.type === 'individual' ? <User size={16} /> : client.type === 'family' ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="9" r="2"/>
                                <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                                <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                              </svg>
                            ) : <Users size={16} />}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.929rem' }}>
                            {getClientName(client)}
                          </span>
                        </div>
                      </th>
                      <td>
                        <span style={{
                          fontSize: '0.857rem', fontWeight: 600, padding: '3px 0',
                          color: 'var(--text-tertiary)',
                          display: 'inline-flex', alignItems: 'center', gap: 5
                        }}>
                          {(() => {
                            if (client.type === 'family') return (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="7" cy="6" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="12" cy="9" r="2"/>
                                <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                                <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
                              </svg>
                            )
                            const TC = client.type === 'individual' ? User : Users
                            return <TC size={16} />
                          })()}
                          {(typeConfig[client.type] || typeConfig.client).label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>
                        {client.startDate ? formatDate(client.startDate) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>
                        {client.deletedAt ? formatDate(client.deletedAt) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.786rem', padding: '5px 12px', color: 'var(--accent-main)' }}
                          onClick={() => handleRestore(client)}
                        >
                          <RotateCcw size={14} /> Restaurer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Floating bulk action bar */}
          {selected.size > 0 && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
              padding: '12px 24px',
              background: 'var(--error-bg)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid var(--error)',
              zIndex: 100,
              animation: 'ncFadeIn 0.2s ease-out'
            }}>
              <span style={{ fontSize: '0.857rem', fontWeight: 600, color: 'var(--error)' }}>
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </span>
              <div style={{ width: 1, height: 20, background: '#F87171', opacity: 0.3 }} />
              <button
                onClick={() => setSelected(new Set())}
                className="btn btn-ghost"
                style={{ fontSize: '0.786rem', padding: '5px 10px', color: 'var(--error)' }}
              >
                Désélectionner
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  fontSize: '0.857rem', fontWeight: 700,
                  background: 'var(--error)', color: 'white',
                  border: 'none', cursor: deleting ? 'wait' : 'pointer',
                  transition: 'all 0.15s',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                <Trash2 size={15} />
                {deleting ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          )}

          <style>{`@keyframes ncFadeIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
        </>
      )}
    </div>
  )
}

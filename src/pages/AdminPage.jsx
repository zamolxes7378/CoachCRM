import { useState, useEffect } from 'react'
import { Crown, Users, Ear, ShieldCheck, XCircle, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AdminPage() {
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        console.log('[AdminPage] Fetching users via RPC...')
        // S-04: use the server-side gated RPC (Track C: 20260421_admin_rpc.sql)
        // instead of a raw SELECT on users.
        const { data, error: supabaseError } = await supabase
          .rpc('get_admin_user_list')

        if (supabaseError) {
          console.error('[AdminPage] Supabase error:', supabaseError)
          throw supabaseError
        }

        console.log('[AdminPage] Users fetched:', data?.length || 0)
        setAllUsers(data || [])
      } catch (err) {
        console.error('[AdminPage] Fetch error:', err)
        setError(err.message || 'Erreur lors du chargement des utilisateurs')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const admins = allUsers.filter(u => u.role === 'admin')
  const therapists = allUsers.filter(u => u.role !== 'admin')

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return 'Date invalide'
      return d.toLocaleDateString('fr-FR')
    } catch (e) {
      return '—'
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        Chargement de la console d'administration...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <div style={{ color: 'var(--error)', marginBottom: 'var(--space-md)' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Erreur de chargement</h2>
          <p>{error}</p>
        </div>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Crown size={24} style={{ color: 'var(--accent-main)' }} /> Administration
        </h1>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#F0FFF4', color: '#38A169' }}><CheckCircle size={24} /></div>
            <div>
              <div className="stat-value">{therapists.length}</div>
              <div className="stat-label">thérapeutes actifs</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--error-bg, #FEF2F2)', color: 'var(--error, #E53E3E)' }}><XCircle size={24} /></div>
            <div>
              <div className="stat-value">0</div>
              <div className="stat-label">thérapeutes inactifs</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="stat-card">
            <div className="stat-icon primary"><Users size={24} /></div>
            <div>
              <div className="stat-value">{allUsers.length}</div>
              <div className="stat-label">utilisateurs total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Section */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="card-header">
          <Crown size={22} style={{ color: 'var(--accent-main)' }} />
          <h3>Administrateur(s)</h3>
        </div>
        <table className="table-standard">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {a.photo_url && <img src={a.photo_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                  {a.name || 'Sans nom'}
                </td>
                <td className="caption" style={{ color: 'var(--text-secondary)' }}>{a.email}</td>
                <td>
                  <span className="badge" style={{ background: '#FEF5E7', color: 'var(--accent-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Crown size={12} /> Admin
                  </span>
                </td>
                <td className="caption" style={{ color: 'var(--text-secondary)' }}>{formatDate(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Thérapeutes */}
      <div className="card">
        <div className="card-header">
          <Ear size={22} style={{ color: 'var(--text-secondary)' }} />
          <h3>Thérapeutes inscrits</h3>
        </div>
        {therapists.length === 0 ? (
          <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            Aucun thérapeute inscrit pour le moment
          </div>
        ) : (
          <table className="table-standard">
            <thead>
              <tr>
                <th>Thérapeute</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Inscrit le</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name || 'Sans nom'}</td>
                  <td className="caption" style={{ color: 'var(--text-secondary)' }}>{t.email}</td>
                  <td><span className="badge badge-inactive">Thérapeute</span></td>
                  <td className="caption" style={{ color: 'var(--text-secondary)' }}>{formatDate(t.created_at)}</td>
                  <td>
                    <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={12} /> Actif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}


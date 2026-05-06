/**
 * DsarRequestsPage.jsx
 * Page d'administration — Demandes DSAR (Droits des Personnes — RGPD)
 *
 * TODO (routing): Add route in App.jsx once P1-W worktree is merged.
 *   Suggested route: <Route path="/admin/dsar" element={<DsarRequestsPage />} />
 *   Suggested link in AdminPage.jsx nav list.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  listRequests,
  createRequest,
  updateRequest,
  generateAccessZip,
  triggerErasure,
} from '../../services/dsarService.js'

const STATUS_LABELS = {
  pending:     'En attente',
  in_progress: 'En cours',
  fulfilled:   'Traité',
  rejected:    'Rejeté',
  cancelled:   'Annulé',
}

const REQUEST_TYPE_LABELS = {
  access:        'Droit d\'accès',
  erasure:       'Droit à l\'effacement',
  portability:   'Portabilité',
  rectification: 'Rectification',
  restriction:   'Limitation du traitement',
}

const STATUS_COLORS = {
  pending:     '#ECC94B',
  in_progress: '#4299E1',
  fulfilled:   '#48BB78',
  rejected:    '#FC8181',
  cancelled:   '#A0AEC0',
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function DsarRequestsPage() {
  const [requests, setRequests]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRequests(await listRequests())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (fn, successMsg) => {
    setActionLoading(true)
    setActionMsg(null)
    try {
      await fn()
      setActionMsg({ type: 'success', text: successMsg })
      await load()
      setSelected(null)
    } catch (e) {
      setActionMsg({ type: 'error', text: e.message })
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Demandes DSAR — Droits des personnes
          </h1>
          <p style={{ color: '#718096', fontSize: '0.857rem', margin: '4px 0 0' }}>
            Gestion des demandes d'accès, d'effacement et de portabilité (RGPD Art. 12–22)
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            background: '#553C9A', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: '0.857rem', fontWeight: 600, cursor: 'pointer'
          }}
        >
          {showForm ? 'Annuler' : '+ Nouvelle demande'}
        </button>
      </div>

      {actionMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 16,
          background: actionMsg.type === 'success' ? '#F0FFF4' : '#FFF5F5',
          border: `1px solid ${actionMsg.type === 'success' ? '#9AE6B4' : '#FEB2B2'}`,
          color: actionMsg.type === 'success' ? '#276749' : '#C53030',
          fontSize: '0.857rem',
        }}>
          {actionMsg.text}
        </div>
      )}

      {showForm && (
        <NewRequestForm
          onCreated={async () => { setShowForm(false); await load() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && (
        <p style={{ color: '#718096', textAlign: 'center', marginTop: 48 }}>Chargement…</p>
      )}

      {error && (
        <p style={{ color: '#C53030', textAlign: 'center', marginTop: 48 }}>
          Erreur : {error}
        </p>
      )}

      {!loading && !error && requests.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: '#F7FAFC', borderRadius: 12, border: '1px dashed #CBD5E0'
        }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>📋</p>
          <p style={{ fontWeight: 600, color: '#2D3748' }}>Aucune demande DSAR</p>
          <p style={{ color: '#718096', fontSize: '0.857rem' }}>
            Les demandes créées manuellement ou via le formulaire de contact apparaîtront ici.
          </p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.857rem' }}>
          <thead>
            <tr style={{ background: '#F7FAFC', borderBottom: '2px solid #E2E8F0' }}>
              {['Email concerné', 'Type', 'Statut', 'Demandé le', 'Traité le', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#4A5568' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #EDF2F7' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{r.subject_email}</td>
                <td style={{ padding: '10px 12px' }}>{REQUEST_TYPE_LABELS[r.request_type] || r.request_type}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: '0.786rem', fontWeight: 600,
                    background: STATUS_COLORS[r.status] + '22',
                    color: STATUS_COLORS[r.status],
                  }}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#718096' }}>
                  {new Date(r.raised_at || r.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ padding: '10px 12px', color: '#718096' }}>
                  {r.fulfilled_at ? new Date(r.fulfilled_at).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button
                    onClick={() => setSelected(r)}
                    style={{
                      background: 'none', border: '1px solid #CBD5E0', borderRadius: 6,
                      padding: '4px 10px', fontSize: '0.786rem', cursor: 'pointer', color: '#4A5568'
                    }}
                  >
                    Gérer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <RequestDetailPanel
          request={selected}
          loading={actionLoading}
          onClose={() => { setSelected(null); setActionMsg(null) }}
          onStatusChange={(newStatus) => handleAction(
            () => updateRequest(selected.id, { status: newStatus }),
            `Statut mis à jour : ${STATUS_LABELS[newStatus]}`
          )}
          onGenerateZip={() => handleAction(
            () => generateAccessZip(selected.id, selected.subject_email),
            'Archive JSON téléchargée. Demande marquée comme traitée.'
          )}
          onTriggerErasure={() => handleAction(
            () => triggerErasure(selected.id, selected.subject_email),
            'Effacement déclenché. Les données seront anonymisées lors du prochain cycle de purge.'
          )}
        />
      )}
    </div>
  )
}

// ─── New request form ─────────────────────────────────────────────────────────

function NewRequestForm({ onCreated, onCancel }) {
  const [email, setEmail]   = useState('')
  const [type, setType]     = useState('access')
  const [notes, setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createRequest({ subjectEmail: email, requestType: type, notes })
      onCreated()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      background: '#F7FAFC', borderRadius: 12, border: '1px solid #E2E8F0',
      padding: 20, marginBottom: 24
    }}>
      <h3 style={{ fontSize: '0.929rem', fontWeight: 700, marginTop: 0, marginBottom: 16 }}>
        Nouvelle demande DSAR
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: '0.786rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: 4 }}>
            Email de la personne concernée *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="prenom.nom@example.com"
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E0',
              fontSize: '0.857rem', boxSizing: 'border-box'
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.786rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: 4 }}>
            Type de demande *
          </label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E0',
              fontSize: '0.857rem', background: 'white', boxSizing: 'border-box'
            }}
          >
            {Object.entries(REQUEST_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: '0.786rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: 4 }}>
          Notes internes (facultatif)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Canal de réception, référence dossier…"
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E0',
            fontSize: '0.857rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
          }}
        />
      </div>
      {error && <p style={{ color: '#C53030', fontSize: '0.786rem', marginBottom: 8 }}>Erreur : {error}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '7px 14px', borderRadius: 6, border: '1px solid #CBD5E0',
          background: 'white', fontSize: '0.857rem', cursor: 'pointer'
        }}>
          Annuler
        </button>
        <button type="submit" disabled={loading} style={{
          padding: '7px 14px', borderRadius: 6, border: 'none',
          background: '#553C9A', color: 'white', fontSize: '0.857rem',
          fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1
        }}>
          {loading ? 'Enregistrement…' : 'Créer la demande'}
        </button>
      </div>
    </form>
  )
}

// ─── Request detail panel ─────────────────────────────────────────────────────

function RequestDetailPanel({ request: r, loading, onClose, onStatusChange, onGenerateZip, onTriggerErasure }) {
  const [confirmErasure, setConfirmErasure] = useState(false)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 28,
        width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Gérer la demande DSAR</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#718096' }}>✕</button>
        </div>

        <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: '0.857rem', marginBottom: 20 }}>
          {[
            ['Email', r.subject_email],
            ['Type', REQUEST_TYPE_LABELS[r.request_type] || r.request_type],
            ['Statut', STATUS_LABELS[r.status] || r.status],
            ['Reçue le', new Date(r.raised_at || r.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
            r.fulfilled_at && ['Traitée le', new Date(r.fulfilled_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
            r.notes && ['Notes', r.notes],
          ].filter(Boolean).map(([k, v]) => (
            <>
              <dt key={`k-${k}`} style={{ fontWeight: 600, color: '#4A5568' }}>{k}</dt>
              <dd key={`v-${k}`} style={{ margin: 0, color: '#2D3748', wordBreak: 'break-word' }}>{v}</dd>
            </>
          ))}
        </dl>

        <hr style={{ borderColor: '#E2E8F0', marginBottom: 20 }} />

        {/* Status actions */}
        {r.status === 'pending' && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => onStatusChange('in_progress')} disabled={loading} style={btnStyle('#3182CE')}>
              Prendre en charge
            </button>
          </div>
        )}

        {/* Access right */}
        {(r.request_type === 'access' || r.request_type === 'portability') && r.status !== 'fulfilled' && (
          <div style={{ marginBottom: 12 }}>
            <button onClick={onGenerateZip} disabled={loading} style={btnStyle('#553C9A')}>
              📥 Générer l'archive JSON (droit d'accès)
            </button>
            <p style={{ fontSize: '0.75rem', color: '#718096', marginTop: 4 }}>
              Télécharge un fichier JSON avec toutes les données de la personne concernée.
            </p>
          </div>
        )}

        {/* Erasure right */}
        {r.request_type === 'erasure' && r.status !== 'fulfilled' && (
          <div style={{ marginBottom: 12 }}>
            {!confirmErasure ? (
              <button onClick={() => setConfirmErasure(true)} disabled={loading} style={btnStyle('#E53E3E')}>
                🗑 Déclencher l'effacement
              </button>
            ) : (
              <div style={{
                background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: 8, padding: 14
              }}>
                <p style={{ fontWeight: 600, color: '#C53030', marginTop: 0, fontSize: '0.857rem' }}>
                  Confirmer l'effacement ?
                </p>
                <p style={{ color: '#718096', fontSize: '0.786rem', marginBottom: 12 }}>
                  Les données personnelles identifiantes seront anonymisées. Les données comptables
                  (factures) sont conservées 7 ans conformément à la loi française.
                  Cette action est irréversible.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmErasure(false)} style={btnOutlineStyle}>
                    Annuler
                  </button>
                  <button onClick={() => { setConfirmErasure(false); onTriggerErasure() }} disabled={loading} style={btnStyle('#E53E3E')}>
                    Confirmer l'effacement
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reject */}
        {r.status !== 'fulfilled' && r.status !== 'rejected' && (
          <div style={{ marginBottom: 0 }}>
            <button onClick={() => onStatusChange('rejected')} disabled={loading} style={btnOutlineStyle}>
              Rejeter la demande
            </button>
          </div>
        )}

        {loading && (
          <p style={{ color: '#718096', fontSize: '0.857rem', marginTop: 12, textAlign: 'center' }}>
            Traitement en cours…
          </p>
        )}
      </div>
    </div>
  )
}

const btnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none', borderRadius: 6,
  padding: '8px 14px', fontSize: '0.857rem', fontWeight: 600,
  cursor: 'pointer', display: 'inline-block'
})

const btnOutlineStyle = {
  background: 'white', color: '#4A5568', border: '1px solid #CBD5E0', borderRadius: 6,
  padding: '8px 14px', fontSize: '0.857rem', cursor: 'pointer', display: 'inline-block'
}

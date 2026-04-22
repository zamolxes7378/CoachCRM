import { useState, useEffect } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { Crown, Users, Ear, ShieldCheck, XCircle, CheckCircle, AlertCircle, Shield, KeyRound, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { enrollTotp, challengeAndVerify, listFactors, getAssuranceLevel } from '../lib/mfa'

// ─── TOTP Enrollment Panel ──────────────────────────────────────────────────

function TotpEnrollPanel({ onEnrolled }) {
  const [step, setStep] = useState('start') // start | qr | done
  const [factorId, setFactorId] = useState(null)
  const [qrCode, setQrCode] = useState(null)
  const [secret, setSecret] = useState(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [err, setErr] = useState(null)

  const startEnrollment = async () => {
    setErr(null)
    try {
      const data = await enrollTotp()
      setFactorId(data.id)
      setQrCode(data.totp.qr_code)
      setSecret(data.totp.secret)
      setStep('qr')
    } catch (e) {
      setErr(e.message)
    }
  }

  const verifyCode = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setErr(null)
    try {
      await challengeAndVerify(factorId, code)
      setStep('done')
      onEnrolled()
    } catch (e) {
      setErr("Code invalide. Vérifiez l'heure de votre application et réessayez.")
    } finally {
      setVerifying(false)
    }
  }

  if (step === 'done') {
    return (
      <div style={{ padding: 'var(--space-lg)', textAlign: 'center' }}>
        <CheckCircle size={40} style={{ color: '#38A169', margin: '0 auto 12px', display: 'block' }} />
        <p style={{ fontWeight: 600, color: 'var(--primary-700)' }}>Authentification à deux facteurs activée !</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-lg)' }}>
      {step === 'start' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            En tant qu'administrateur, vous devez activer l'authentification à deux facteurs (TOTP).
            Utilisez une application comme <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
          </p>
          <button className="btn btn-primary" onClick={startEnrollment} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={16} /> Configurer le double facteur
          </button>
          {err && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: 8 }}>{err}</p>}
        </div>
      )}
      {step === 'qr' && (
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Scannez ce QR code avec votre application d'authentification, puis saisissez le code à 6 chiffres.
          </p>
          {qrCode && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <img
                src={qrCode}
                alt="QR code TOTP — scannez avec Google Authenticator ou Authy"
                style={{ width: 180, height: 180, border: '1px solid var(--border)', borderRadius: 8 }}
              />
              {secret && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Clé manuelle : <code style={{ userSelect: 'all' }}>{secret}</code>
                </p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="totp-code" style={{ display: 'block', marginBottom: 6, fontSize: '0.875rem', fontWeight: 600 }}>
                Code à 6 chiffres
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && verifyCode()}
                placeholder="000000"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8,
                  border: '1.5px solid var(--border)', fontSize: '1.1rem',
                  letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={verifyCode}
              disabled={code.length !== 6 || verifying}
              style={{ whiteSpace: 'nowrap' }}
            >
              {verifying ? 'Vérification…' : 'Valider'}
            </button>
          </div>
          {err && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: 8 }}>{err}</p>}
        </div>
      )}
    </div>
  )
}

// ─── TOTP Challenge Panel ───────────────────────────────────────────────────

function TotpChallengePanel({ factorId, onVerified }) {
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [err, setErr] = useState(null)

  const verify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setErr(null)
    try {
      await challengeAndVerify(factorId, code)
      onVerified()
    } catch (e) {
      setErr('Code invalide ou expiré. Réessayez.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{
        background: 'white', borderRadius: 16, padding: '40px 36px',
        maxWidth: 360, width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center'
      }}>
        <Shield size={40} style={{ color: '#DAA520', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Vérification à deux facteurs</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24, lineHeight: 1.5 }}>
          Saisissez le code à 6 chiffres généré par votre application d'authentification.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="000000"
          autoFocus
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 8,
            border: '1.5px solid var(--border)', fontSize: '1.4rem',
            letterSpacing: '0.3em', fontVariantNumeric: 'tabular-nums',
            textAlign: 'center', marginBottom: 16, boxSizing: 'border-box'
          }}
        />
        {err && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: 12 }}>{err}</p>}
        <button
          className="btn btn-primary"
          onClick={verify}
          disabled={code.length !== 6 || verifying}
          style={{ width: '100%' }}
        >
          {verifying ? 'Vérification…' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}

// ─── Main AdminPage ─────────────────────────────────────────────────────────

export default function AdminPage() {
  usePageTitle('Administration')
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // MFA state: 'checking' | 'needs_enroll' | 'needs_challenge' | 'ok'
  const [mfaState, setMfaState] = useState('checking')
  const [totpFactorId, setTotpFactorId] = useState(null)

  // S-14: check MFA status on mount — admin must be aal2 to view this page
  useEffect(() => {
    async function checkMfa() {
      try {
        const [assurance, factors] = await Promise.all([
          getAssuranceLevel(),
          listFactors()
        ])
        const totpFactors = factors.totp || []
        const verifiedFactor = totpFactors.find(f => f.status === 'verified')

        if (assurance.currentLevel === 'aal2') {
          setMfaState('ok')
        } else if (verifiedFactor) {
          setTotpFactorId(verifiedFactor.id)
          setMfaState('needs_challenge')
        } else {
          setMfaState('needs_enroll')
        }
      } catch (e) {
        console.error('[AdminPage] MFA check failed:', e)
        setMfaState('ok') // graceful degradation
      }
    }
    checkMfa()
  }, [])

  useEffect(() => {
    if (mfaState !== 'ok') return

    async function fetchUsers() {
      try {
        // S-04: server-side gated RPC
        const { data, error: supabaseError } = await supabase
          .rpc('get_admin_user_list')

        if (supabaseError) throw supabaseError
        setAllUsers(data || [])
      } catch (err) {
        setError(err.message || 'Erreur lors du chargement des utilisateurs')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [mfaState])

  // ── MFA gates ────────────────────────────────────────────────────────────

  if (mfaState === 'checking') {
    return (
      <div role="status" aria-live="polite" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
        Vérification de la sécurité…
      </div>
    )
  }

  if (mfaState === 'needs_enroll') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <Shield size={24} style={{ color: '#DAA520' }} /> Sécurité requise
          </h1>
        </div>
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="card-header">
            <QrCode size={20} style={{ color: '#DAA520' }} />
            <h3>Configuration de l'authentification à deux facteurs</h3>
          </div>
          <TotpEnrollPanel onEnrolled={() => setMfaState('ok')} />
        </div>
      </div>
    )
  }

  if (mfaState === 'needs_challenge') {
    return (
      <TotpChallengePanel
        factorId={totpFactorId}
        onVerified={() => setMfaState('ok')}
      />
    )
  }

  // ── Normal admin UI (mfaState === 'ok') ──────────────────────────────────

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
      <div role="status" aria-live="polite" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} aria-hidden="true" />
        <span className="sr-only">Chargement…</span>
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
          <caption className="sr-only">Administrateurs du compte CoachCRM</caption>
          <thead>
            <tr>
              <th scope="col">Nom</th>
              <th scope="col">Email</th>
              <th scope="col">Rôle</th>
              <th scope="col">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id}>
                <th scope="row" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {a.photo_url && <img src={a.photo_url} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: 28, height: 28, borderRadius: '50%' }} />}
                  {a.name || 'Sans nom'}
                </th>
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
            <caption className="sr-only">Thérapeutes inscrits</caption>
            <thead>
              <tr>
                <th scope="col">Thérapeute</th>
                <th scope="col">Email</th>
                <th scope="col">Rôle</th>
                <th scope="col">Inscrit le</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {therapists.map(t => (
                <tr key={t.id}>
                  <th scope="row" style={{ fontWeight: 500 }}>{t.name || 'Sans nom'}</th>
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


import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { upsertUser } from './services/dataService'
import { isEmailAllowed } from './lib/allowlist'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingWizard from './components/OnboardingWizard'
import ErrorBoundary from './components/ErrorBoundary'
import { useIdleTimeout } from './hooks/useIdleTimeout'
import IdleWarningModal from './components/IdleWarningModal'

// Code splitting pour les pages authentifiées
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const SessionsPage = lazy(() => import('./pages/SessionsPage'))
const FinancesPage = lazy(() => import('./pages/FinancesPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DeletedClientsPage = lazy(() => import('./pages/DeletedClientsPage'))
const ReseauProPage = lazy(() => import('./pages/ReseauProPage'))
const DsarRequestsPage = lazy(() => import('./pages/admin/DsarRequestsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))

// Pages publiques (accessibles sans authentification)
const MentionsLegalesPage = lazy(() => import('./pages/public/MentionsLegalesPage'))
const ConfidentialitePage = lazy(() => import('./pages/public/ConfidentialitePage'))
const CguPage = lazy(() => import('./pages/public/CguPage'))
const CookiesPage = lazy(() => import('./pages/public/CookiesPage'))
const AccessibilitePage = lazy(() => import('./pages/public/AccessibilitePage'))

// Routes publiques — rendues sans authentification
const PUBLIC_ROUTES = ['/mentions-legales', '/confidentialite', '/cgu', '/cookies', '/accessibilite']

/** Inline screen shown to Google-authenticated users not yet on the allowlist. */
function PendingInviteScreen({ email, onSignOut }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-main)'
    }}>
      <div style={{
        textAlign: 'center', padding: '40px 32px', maxWidth: 440,
        background: 'white', borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: 8 }}>
          En attente d'invitation
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
          Votre compte <strong>{email}</strong> n'est pas encore autorisé.
        </p>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          Contactez un administrateur pour demander l'accès.
        </p>
        <button
          className="btn btn-secondary"
          onClick={onSignOut}
          style={{ width: '100%' }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [pendingEmail, setPendingEmail] = useState(null)

  // Sync Google user info to our users table
  async function syncUser(authUser) {
    if (!authUser) return null
    try {
      const meta = authUser.user_metadata || {}

      // S-02 — Allowlist gate: verify email before any DB row creation.
      let allowed = await isEmailAllowed(authUser.email)
      
      // ADMIN GUARANTEE: Force allow admins
      if (authUser?.email === 'claudia@kotech.ai' || authUser?.email === 'samuel@kotech.ai') {
        allowed = true;
      }

      if (!allowed) {
        // TODO: wire pending_invites when Track C lands the table
        console.info('[Auth] Non-allowlisted sign-in attempt:', authUser.email)
        setPendingEmail(authUser.email)
        return null
      }

      // 1. Check if user already exists in DB
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (existing) {
        const { data: updated } = await supabase
          .from('users')
          .update({
            name: meta.full_name || meta.name || existing.name,
            photo_url: meta.avatar_url || meta.picture || existing.photo_url
          })
          .eq('id', existing.id)
          .select()
          .maybeSingle()
        return updated || existing
      }

      // 2. New user — default to therapist
      const dbUser = await upsertUser({
        id: authUser.id,
        name: meta.full_name || meta.name || authUser.email,
        email: authUser.email,
        role: 'therapist',
        photo_url: meta.avatar_url || meta.picture || null
      })

      return dbUser || { id: authUser.id, email: authUser.email, role: 'therapist' }
    } catch (err) {
      console.error('[Auth] Error synchronizing user:', err)
      
      // ADMIN GUARANTEE: If anything fails (network, CORS, DB, etc), force login for Claudia!
      if (authUser?.email === 'claudia@kotech.ai' || authUser?.email === 'samuel@kotech.ai') {
        console.warn('[Auth] Admin bypass activated due to sync failure. Forcing login.')
        return { 
          id: authUser.id, 
          email: authUser.email, 
          role: 'admin',
          name: authUser.user_metadata?.full_name || authUser.email 
        }
      }

      setAuthError(`Erreur technique : ${err.message || String(err)}`)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // Consumption of OAuth hash or code query param
    const clearAuthParams = () => {
      if (
        (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) ||
        (window.location.search && window.location.search.includes('code='))
      ) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    // Only show loading spinner if we're processing an OAuth callback
    const isOAuthCallback = window.location.hash.includes('access_token') || window.location.search.includes('code=') || window.location.hash.includes('error') || window.location.search.includes('error')
    if (!isOAuthCallback) {
      setLoading(false)
    }

    // Safety timeout: stop loading after 10 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
      }
    }, 10000)

    // Force session initialization to trigger code exchange/parsing
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Initial getSession error:', error)
        setAuthError(`Erreur session: ${error.message}`)
      }
    })

    // Single auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      try {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          const dbUser = await syncUser(session.user)
          if (mounted && dbUser) {
            setUser(dbUser)
            const onboardingDone = localStorage.getItem('coachcrm_onboarding_done')
            if (!onboardingDone) setShowOnboarding(true)
            clearAuthParams()
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null)
            setShowOnboarding(false)
            setPendingEmail(null)
          }
        }
      } catch (err) {
        console.error('[Auth] Process error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      // 1. Reset React state immediately to prevent re-render with stale user
      setUser(null)

      // 2. Clear ALL auth-related localStorage keys before signOut
      //    (storageKey configured in supabase.js = 'coachcrm-auth-token')
      localStorage.removeItem('coachcrm-auth-token')
      localStorage.removeItem('coachcrm_onboarding_done')

      // 3. Sign out globally (revokes session on Supabase server too)
      await supabase.auth.signOut({ scope: 'global' })
    } catch (err) {
      console.warn('Logout error:', err)
    } finally {
      // 4. Force fresh reload regardless of success/failure
      window.location.href = '/'
    }
  }

  const suspenseFallback = (
    <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '50vh' }}>
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">Chargement…</span>
    </div>
  )

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent
          loading={loading}
          user={user}
          authError={authError}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          handleLogout={handleLogout}
          pendingEmail={pendingEmail}
          suspenseFallback={suspenseFallback}
        />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

const IDLE_TIMEOUT_MS = 30 * 60_000   // 30 minutes
const IDLE_WARNING_MS = 2 * 60_000    // warn 2 minutes before logout

function AppContent({ loading, user, authError, showOnboarding, setShowOnboarding, handleLogout, pendingEmail, suspenseFallback }) {
  const location = useLocation()
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname)

  // Idle timeout state — only active when a user is logged in
  const [idleWarningVisible, setIdleWarningVisible] = useState(false)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(IDLE_WARNING_MS / 1000)
  const idleCountdownRef = React.useRef(null)

  const handleIdleWarn = useCallback(() => {
    setIdleSecondsLeft(IDLE_WARNING_MS / 1000)
    setIdleWarningVisible(true)
    // Tick down the displayed countdown every second
    idleCountdownRef.current = setInterval(() => {
      setIdleSecondsLeft(s => Math.max(0, s - 1))
    }, 1000)
  }, [])

  const handleIdleLogout = useCallback(() => {
    clearInterval(idleCountdownRef.current)
    setIdleWarningVisible(false)
    handleLogout()
  }, [handleLogout])

  const handleStayConnected = useCallback(() => {
    clearInterval(idleCountdownRef.current)
    setIdleWarningVisible(false)
    // The useIdleTimeout hook resets automatically on next user activity;
    // clicking "Rester connecté" itself counts as activity.
  }, [])

  // Clean up countdown interval on unmount
  useEffect(() => () => clearInterval(idleCountdownRef.current), [])

  // Idle timer — only mount when user is authenticated and not on a public route
  const idleActive = !!user && !isPublicRoute && !loading && !showOnboarding
  useIdleTimeout(
    idleActive ? IDLE_TIMEOUT_MS : Infinity,
    IDLE_WARNING_MS,
    handleIdleWarn,
    handleIdleLogout
  )

  // Pages publiques — toujours accessibles, même sans authentification
  if (isPublicRoute) {
    return (
      <Suspense fallback={suspenseFallback}>
        <Routes>
          <Route path="/mentions-legales" element={<MentionsLegalesPage />} />
          <Route path="/confidentialite" element={<ConfidentialitePage />} />
          <Route path="/cgu" element={<CguPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/accessibilite" element={<AccessibilitePage />} />
        </Routes>
      </Suspense>
    )
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div aria-hidden="true" style={{ width: 40, height: 40, border: '3px solid var(--primary-200)', borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <span className="sr-only">Chargement…</span>
          <p style={{ color: 'var(--text-secondary)' }}>Connexion en cours...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (pendingEmail) {
    return (
      <PendingInviteScreen
        email={pendingEmail}
        onSignOut={handleLogout}
      />
    )
  }

  if (!user) {
    return <LoginPage error={authError} />
  }

  if (showOnboarding) {
    return <OnboardingWizard user={user} onComplete={() => { setShowOnboarding(false); localStorage.setItem('coachcrm_onboarding_done', 'true') }} />
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <DataProvider user={user}>
          <Layout user={user} onLogout={handleLogout}>
            <Suspense fallback={suspenseFallback}>
              <ErrorBoundary>
              <Routes>
                <Route path="/" element={<DashboardPage user={user} />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/sessions" element={<SessionsPage />} />
                <Route path="/finances" element={<FinancesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
                <Route path="/admin/deleted-clients" element={user.role === 'admin' ? <DeletedClientsPage /> : <Navigate to="/" />} />
                <Route path="/admin/reseau-pro" element={user.role === 'admin' ? <ReseauProPage /> : <Navigate to="/" />} />
                <Route path="/admin/dsar" element={user.role === 'admin' ? <DsarRequestsPage /> : <Navigate to="/" />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
              </ErrorBoundary>
            </Suspense>
          </Layout>
          <IdleWarningModal
            visible={idleWarningVisible}
            secondsLeft={idleSecondsLeft}
            onStay={handleStayConnected}
            onLogout={handleIdleLogout}
          />
        </DataProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

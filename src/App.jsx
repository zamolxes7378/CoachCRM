import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { upsertUser } from './services/dataService'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingWizard from './components/OnboardingWizard'

// Code splitting pour les pages authentifiées
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ClientsPage = lazy(() => import('./pages/ClientsPage'))
const ClientDetailPage = lazy(() => import('./pages/ClientDetailPage'))
const SessionsPage = lazy(() => import('./pages/SessionsPage'))
const FinancesPage = lazy(() => import('./pages/FinancesPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const DeletedClientsPage = lazy(() => import('./pages/DeletedClientsPage'))
const ReseauProPage = lazy(() => import('./pages/ReseauProPage'))
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

/**
 * GlobalErrorBoundary — Capture les erreurs de rendu React pour éviter la page blanche.
 */
class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    console.error('[Fatal Error]', error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--primary-700)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Une erreur est survenue</h2>
          <p>L'application a rencontré un blocage inattendu.</p>
          <pre style={{ textAlign: 'left', margin: '0 auto', maxWidth: 600, fontSize: '0.75rem', background: '#f8f8f8', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, color: '#C53030' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.errorInfo?.componentStack}
          </pre>
          <button className="btn btn-primary" onClick={() => window.location.href = '/'} style={{ alignSelf: 'center' }}>
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [authError, setAuthError] = useState(null)

  // Sync Google user info to our users table
  async function syncUser(authUser) {
    if (!authUser) return null
    try {
      const meta = authUser.user_metadata || {}

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
      setAuthError("Impossible de synchroniser votre compte. Veuillez réessayer.")
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // Consumption of OAuth hash
    const clearHash = () => {
      if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('error'))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }

    // Only show loading spinner if we're processing an OAuth callback
    const isOAuthCallback = window.location.hash.includes('access_token')
    if (!isOAuthCallback) {
      setLoading(false)
    }

    // Safety timeout: stop loading after 10 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false)
      }
    }, 10000)

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
            clearHash()
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null)
            setShowOnboarding(false)
          }
        }
      } catch (err) {
        console.error('[Auth] Process error:', err)
      } finally {
        if (mounted) setLoading(false)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '50vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <GlobalErrorBoundary>
      <BrowserRouter>
        <AppContent
          loading={loading}
          user={user}
          authError={authError}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          handleLogout={handleLogout}
          suspenseFallback={suspenseFallback}
        />
      </BrowserRouter>
    </GlobalErrorBoundary>
  )
}

function AppContent({ loading, user, authError, showOnboarding, setShowOnboarding, handleLogout, suspenseFallback }) {
  const location = useLocation()
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname)

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-200)', borderTopColor: 'var(--primary-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Connexion en cours...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
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
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </Layout>
        </DataProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

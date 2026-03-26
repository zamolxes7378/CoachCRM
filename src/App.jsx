import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { upsertUser } from './services/dataService'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import OnboardingWizard from './components/OnboardingWizard'
import DashboardPage from './pages/DashboardPage'
import CouplesPage from './pages/CouplesPage'
import CoupleDetailPage from './pages/CoupleDetailPage'
import SessionsPage from './pages/SessionsPage'
import FinancesPage from './pages/FinancesPage'

import AdminPage from './pages/AdminPage'
import DeletedClientsPage from './pages/DeletedClientsPage'
import ReseauProPage from './pages/ReseauProPage'
import SettingsPage from './pages/SettingsPage'
import HelpPage from './pages/HelpPage'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Sync Google user info to our users table
  async function syncUser(authUser) {
    const meta = authUser.user_metadata || {}
    console.log('[Auth] syncUser called for:', authUser.email, meta)

    // Check if user already exists in DB
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single()

    if (existing) {
      // User exists — update name/photo but keep their role
      console.log('[Auth] existing user found, role:', existing.role)
      const { data: updated } = await supabase
        .from('users')
        .update({
          name: meta.full_name || meta.name || existing.name,
          photo_url: meta.avatar_url || meta.picture || existing.photo_url
        })
        .eq('id', existing.id)
        .select()
        .single()
      return updated || existing
    }

    // New user — default to therapist
    console.log('[Auth] creating new user as therapist')
    const dbUser = await upsertUser({
      id: authUser.id,
      name: meta.full_name || meta.name || authUser.email,
      email: authUser.email,
      role: 'therapist',
      photo_url: meta.avatar_url || meta.picture || null
    })
    console.log('[Auth] upsertUser result:', dbUser)
    if (!dbUser) {
      return {
        id: authUser.id,
        name: meta.full_name || meta.name || authUser.email,
        email: authUser.email,
        role: 'therapist',
        photo_url: meta.avatar_url || meta.picture || null
      }
    }
    return dbUser
  }

  useEffect(() => {
    let mounted = true

    // Only show loading spinner if we're processing an OAuth callback
    const isOAuthCallback = window.location.hash.includes('access_token')
    if (!isOAuthCallback) {
      setLoading(false)
    }

    // Safety timeout for OAuth callbacks: max 3 seconds
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 3000)

    // Single auth state listener — handles both initial session and sign-in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event, session?.user?.email)
      if (!mounted) return

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const dbUser = await syncUser(session.user)
        if (mounted) {
          setUser(dbUser)
          // Only show onboarding for genuinely new users
          const onboardingDone = localStorage.getItem('coachcrm_onboarding_done')
          if (!onboardingDone) {
            setShowOnboarding(true)
          }
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null)
          setShowOnboarding(false)
        }
      } else if (event === 'INITIAL_SESSION' && !session) {
        // No session — just stop loading
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
    await supabase.auth.signOut()
    setUser(null)
    setShowOnboarding(false)
  }

  // Show loading spinner while checking auth (max 5 seconds)
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-main, #f5f6fa)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--primary-200, #ddd)', borderTopColor: 'var(--primary-600, #2563eb)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary, #666)' }}>Chargement...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }


  if (!user) {
    return <LoginPage />
  }

  if (showOnboarding) {
    return <OnboardingWizard user={user} onComplete={() => { window.history.replaceState(null, '', '/'); setShowOnboarding(false) }} />
  }

  return (
    <ToastProvider>
    <DataProvider user={user}>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<DashboardPage user={user} />} />
            <Route path="/couples" element={<CouplesPage />} />
            <Route path="/couples/:id" element={<CoupleDetailPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/finances" element={<FinancesPage />} />


            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
            <Route path="/admin/deleted-clients" element={user.role === 'admin' ? <DeletedClientsPage /> : <Navigate to="/" />} />
            <Route path="/admin/reseau-pro" element={user.role === 'admin' ? <ReseauProPage /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </DataProvider>
    </ToastProvider>
  )
}

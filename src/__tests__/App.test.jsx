/**
 * Smoke test — unauthenticated render.
 *
 * App.jsx uses supabase.auth.getSession() on mount to decide whether to show
 * LoginPage or the authenticated shell. We mock the supabase module so:
 *   - getSession() resolves with no session  →  LoginPage renders
 *   - onAuthStateChange() returns a no-op unsubscribe  →  no real-time setup
 *
 * The bar is "the component tree mounts without throwing", verified by asserting
 * the login button is present.
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock supabase before importing anything that depends on it
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}))

import App from '../App'

describe('App — unauthenticated', () => {
  it('renders the login page when there is no active session', async () => {
    render(<App />)

    // LoginPage shows a Google login button — reliable text anchor
    const loginButton = await screen.findByText(/Se connecter avec Google/i)
    expect(loginButton).toBeInTheDocument()
  })
})

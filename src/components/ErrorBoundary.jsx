import React from 'react'

const defaultFallback = (error, errorInfo) => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--primary-700)', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Une erreur est survenue</h2>
    <p>L'application a rencontré un blocage inattendu.</p>
    <pre style={{ textAlign: 'left', margin: '0 auto', maxWidth: 600, fontSize: '0.75rem', background: '#f8f8f8', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 300, color: '#C53030' }}>
      {error?.toString()}
      {'\n\n'}
      {errorInfo?.componentStack}
    </pre>
    <button className="btn btn-primary" onClick={() => window.location.href = '/'} style={{ alignSelf: 'center' }}>
      Recharger l'application
    </button>
  </div>
)

/**
 * ErrorBoundary — Reusable React error boundary.
 *
 * Usage:
 *   <ErrorBoundary>...</ErrorBoundary>
 *   <ErrorBoundary fallback={(error, info) => <MyFallback />}>...</ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (fallback) {
        return typeof fallback === 'function'
          ? fallback(this.state.error, this.state.errorInfo)
          : fallback
      }
      return defaultFallback(this.state.error, this.state.errorInfo)
    }
    return this.props.children
  }
}

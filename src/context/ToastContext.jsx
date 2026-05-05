import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}

const COLORS = {
  success: { bg: '#F0FFF4', border: '#C6F6D5', color: '#276749', icon: '#38A169' },
  error:   { bg: '#FFF5F5', border: '#FED7D7', color: '#9B2C2C', icon: '#E53E3E' },
  warning: { bg: '#FFFAF0', border: '#FEEBC8', color: '#7B341E', icon: '#DD6B20' },
  info:    { bg: '#EBF8FF', border: '#BEE3F8', color: '#2A4365', icon: '#3182CE' }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = ++counterRef.current
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — aria-live region so AT announces new toasts (A-10) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Notifications"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
          display: 'flex', flexDirection: 'column-reverse', gap: 8,
          maxWidth: 400, pointerEvents: toasts.length > 0 ? 'auto' : 'none'
        }}
      >
        {toasts.map(toast => {
          const scheme = COLORS[toast.type] || COLORS.info
          const Icon = ICONS[toast.type] || Info
          const isUrgent = toast.type === 'error' || toast.type === 'warning'
          return (
            <div
              key={toast.id}
              role={isUrgent ? 'alert' : 'status'}
              aria-live={isUrgent ? 'assertive' : 'polite'}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px',
                background: scheme.bg, border: `1px solid ${scheme.border}`,
                borderRadius: 'var(--radius-lg, 12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                animation: 'toastSlideIn 0.3s ease-out',
                pointerEvents: 'auto'
              }}>
              <Icon size={18} style={{ color: scheme.icon, flexShrink: 0, marginTop: 1 }} />
              <span style={{
                fontSize: '0.857rem', fontWeight: 500, color: scheme.color,
                lineHeight: 1.4, flex: 1
              }}>
                {toast.message}
              </span>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Fermer la notification"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: scheme.color, opacity: 0.5, padding: 2, flexShrink: 0
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

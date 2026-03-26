import { createContext, useContext, useState, useCallback } from 'react'
import { Heart, AlertTriangle, X } from 'lucide-react'

const ConfirmContext = createContext(null)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)

  const confirm = useCallback((message, { title, variant = 'confirm' } = {}) => {
    return new Promise((resolve) => {
      setState({ message, title, variant, resolve })
    })
  }, [])

  const handleClose = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => handleClose(false)}>
          <div
            className="confirm-dialog"
            onClick={e => e.stopPropagation()}
          >
            {/* Header with logo */}
            <div className="confirm-dialog-header">
              <div className="confirm-dialog-brand">
                <Heart size={18} />
                <span>Coach<strong>CRM</strong></span>
              </div>
              <button className="confirm-dialog-close" onClick={() => handleClose(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Icon */}
            <div className="confirm-dialog-body">
              <div className={`confirm-dialog-icon ${state.variant === 'danger' ? 'danger' : ''}`}>
                <AlertTriangle size={24} />
              </div>

              {/* Title */}
              {state.title && <h3 className="confirm-dialog-title">{state.title}</h3>}

              {/* Message */}
              <p className="confirm-dialog-message">{state.message}</p>
            </div>

            {/* Buttons */}
            <div className="confirm-dialog-footer">
              {state.variant !== 'alert' && (
                <button className="btn btn-secondary" onClick={() => handleClose(false)}>
                  Annuler
                </button>
              )}
              <button
                className={`btn ${state.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => handleClose(true)}
              >
                {state.variant === 'alert' ? 'Compris' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

import { useEffect } from 'react'

/**
 * Module-level stack: only the topmost registered handler fires on Escape.
 * This prevents simultaneous close when nested dialogs (e.g. DeleteConfirmModal
 * on top of EditIdentityModal) are both open — document-level stopPropagation
 * has no effect on other document-level listeners, so a shared stack is needed.
 */
const escapeStack = []

function handleGlobalEscape(e) {
  if (e.key !== 'Escape') return
  const top = escapeStack[escapeStack.length - 1]
  if (top) {
    e.preventDefault()
    top()
  }
}

// Install the single global listener once.
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', handleGlobalEscape)
}

/**
 * useEscapeKey(handler, isOpen)
 * Pushes handler onto the shared Escape stack while isOpen is true.
 * Only the topmost handler fires; nested dialogs are safe.
 */
export function useEscapeKey(handler, isOpen) {
  useEffect(() => {
    if (!isOpen) return
    escapeStack.push(handler)
    return () => {
      const idx = escapeStack.lastIndexOf(handler)
      if (idx !== -1) escapeStack.splice(idx, 1)
    }
  }, [handler, isOpen])
}

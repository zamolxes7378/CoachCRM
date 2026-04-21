import { useEffect } from 'react'

/**
 * useEscapeKey(handler, isOpen)
 * Binds a document-level keydown listener that calls handler when
 * the Escape key is pressed, but only while isOpen is true.
 */
export function useEscapeKey(handler, isOpen) {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handler])
}

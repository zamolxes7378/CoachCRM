import { useEffect } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * useFocusTrap(ref, isOpen)
 * Traps Tab / Shift+Tab inside ref.current when isOpen is true.
 * On open: moves focus into the container.
 * On close: restores focus to the previously-focused element.
 */
export function useFocusTrap(ref, isOpen) {
  useEffect(() => {
    if (!isOpen) return

    const previouslyFocused = document.activeElement

    // Move focus into the container on next tick so the element is painted.
    const raf = requestAnimationFrame(() => {
      if (ref.current) {
        const focusable = ref.current.querySelectorAll(FOCUSABLE_SELECTORS)
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          ref.current.focus()
        }
      }
    })

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab' || !ref.current) return

      const focusable = Array.from(ref.current.querySelectorAll(FOCUSABLE_SELECTORS))
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [isOpen, ref])
}

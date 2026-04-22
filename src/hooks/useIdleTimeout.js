import { useEffect, useRef, useCallback } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll']

/**
 * useIdleTimeout — fires a warning callback before the idle deadline,
 * then forces logout when the deadline is reached.
 *
 * @param {number} timeoutMs     — total idle timeout in ms (e.g. 30 * 60_000)
 * @param {number} warningMs     — how early to show warning before logout (e.g. 2 * 60_000)
 * @param {() => void} onWarn    — called when warning period starts
 * @param {() => void} onLogout  — called when idle period expires (should redirect to '/')
 */
export function useIdleTimeout(timeoutMs, warningMs, onWarn, onLogout) {
  const logoutTimerRef = useRef(null)
  const warnTimerRef = useRef(null)
  const onWarnRef = useRef(onWarn)
  const onLogoutRef = useRef(onLogout)

  // Keep refs current so timer callbacks always call the latest version
  useEffect(() => { onWarnRef.current = onWarn }, [onWarn])
  useEffect(() => { onLogoutRef.current = onLogout }, [onLogout])

  const reset = useCallback(() => {
    clearTimeout(logoutTimerRef.current)
    clearTimeout(warnTimerRef.current)

    warnTimerRef.current = setTimeout(() => {
      onWarnRef.current()
    }, timeoutMs - warningMs)

    logoutTimerRef.current = setTimeout(() => {
      onLogoutRef.current()
    }, timeoutMs)
  }, [timeoutMs, warningMs])

  useEffect(() => {
    // Debounce activity resets — only reset at most every 500 ms
    let debounceTimer = null
    const handleActivity = () => {
      if (debounceTimer) return
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        reset()
      }, 500)
    }

    ACTIVITY_EVENTS.forEach(ev =>
      window.addEventListener(ev, handleActivity, { passive: true })
    )

    // Start the first timers
    reset()

    return () => {
      ACTIVITY_EVENTS.forEach(ev =>
        window.removeEventListener(ev, handleActivity)
      )
      clearTimeout(logoutTimerRef.current)
      clearTimeout(warnTimerRef.current)
    }
  }, [reset])
}

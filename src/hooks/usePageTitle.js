import { useEffect } from 'react'

/**
 * usePageTitle(title)
 * Sets document.title to "<title> — CoachCRM" on mount / when title changes.
 * Restores "CoachCRM" on unmount.
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = `${title} — CoachCRM`
    return () => {
      document.title = 'CoachCRM'
    }
  }, [title])
}

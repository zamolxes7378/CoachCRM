// ═══════════════════════════════════════════════════════
// CoachCRM — Utilitaires date centralisés
// ═══════════════════════════════════════════════════════

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const MONTHS_FR_SHORT = [
  'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'
]

/** Returns a new Date representing today. */
export function today() {
  return new Date()
}

/** Returns today's date as an ISO string (YYYY-MM-DD). */
export function todayIso() {
  return new Date().toISOString().split('T')[0]
}

/** Formats a date string as "12 jan." */
export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS_FR_SHORT[d.getMonth()]}`
}

/** Formats a date string as "12 janvier 2026" */
export function formatDateLong(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()} ${d.getFullYear()}`
}

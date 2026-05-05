// ═══════════════════════════════════════════════════════
// CoachCRM — Constantes métier de production
// ═══════════════════════════════════════════════════════

// Re-exports from canonical lib files — existing call sites unchanged
export { MONTHS_FR } from '../lib/date'
export { PHASES } from '../lib/phases'

// therapyPhases is the legacy export name for PHASES
export { PHASES as therapyPhases } from '../lib/phases'

export const defaultTherapyConfig = {
  totalSessions: 20
}

export const prospectStages = [
  { key: 'first_contact', label: 'Premier contact', percent: 25, color: '#D6BCFA' },
  { key: 'discovery_call', label: 'Appel découverte', percent: 50, color: '#B794F4' },
  { key: 'appointment_set', label: 'RDV découverte fixé', percent: 75, color: '#9F7AEA' },
  { key: 'converted', label: 'Converti', percent: 100, color: '#6B46C1' }
]

export const recruitmentSources = [
  { key: 'website', label: 'Site web' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'referral', label: 'Parrainage' },
  { key: 'email', label: 'Email' },
  { key: 'social', label: 'Réseaux sociaux' }
]

export const sessionRates = {
  client: 75,   // legacy key for couple-type clients (DB type='client')
  individual: 60,
  family: 75
}

export const clientTypeLabels = {
  individual: 'Individuel',
  client: 'Couple',
  family: 'Famille'
}

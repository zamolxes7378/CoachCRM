// ═══════════════════════════════════════════════════════
// CoachCRM — Constantes métier de production
// ═══════════════════════════════════════════════════════

export const therapyPhases = [
  { key: 'debut', label: 'Début', color: '#2B6CB0', bg: '#EBF8FF' },
  { key: 'analyse', label: 'Analyse', color: '#E67E22', bg: '#FFF3E0' },
  { key: 'integration', label: 'Intégration', color: '#276749', bg: '#F0FFF4' },
  { key: 'bilan_final', label: 'Bilan final', color: '#6B46C1', bg: '#FAF5FF' }
]

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

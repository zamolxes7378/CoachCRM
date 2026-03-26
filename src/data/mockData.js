// ═══════════════════════════════════════════════════════
// CoachCRM — Ré-exports pour rétrocompatibilité
// ═══════════════════════════════════════════════════════
// Ce fichier ne contient plus de données mock.
// Les constantes et helpers sont dans leurs modules dédiés.

export {
  therapyPhases, defaultTherapyConfig,
  prospectStages, recruitmentSources,
  sessionRates, clientTypeLabels
} from './constants'

export {
  getCoupleName, getCoupleInitials,
  getPhaseLabel, getStatusLabel,
  getComputedStatus, getProspectStageInfo,
  getClientType,
  formatDate, formatTime, formatRelativeDate,
  getTodaySessions
} from './helpers'

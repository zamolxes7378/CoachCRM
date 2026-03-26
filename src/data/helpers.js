// ═══════════════════════════════════════════════════════
// CoachCRM — Fonctions utilitaires pures
// ═══════════════════════════════════════════════════════

import { therapyPhases, prospectStages } from './constants'

// ── Noms & initiales ──

export function getCoupleName(couple) {
  if (!couple?.partnerA) return 'Client inconnu'
  const fnA = (couple.partnerA.firstName || '').trim() || '...'
  if (!couple.partnerB) return `${fnA} ${(couple.partnerA.lastName || '').toUpperCase()}`
  const fnB = (couple.partnerB.firstName || '').trim() || '...'
  if (couple.partnerA.lastName.toLowerCase() !== couple.partnerB.lastName.toLowerCase()) {
    return `${fnA} ${couple.partnerA.lastName.toUpperCase()} et ${fnB} ${couple.partnerB.lastName.toUpperCase()}`
  }
  return `${fnA} et ${fnB} ${couple.partnerA.lastName.toUpperCase()}`
}

export function getCoupleInitials(couple) {
  if (!couple?.partnerA) return '?'
  const fnA = (couple.partnerA.firstName || '').trim()
  const lnA = (couple.partnerA.lastName || '').trim()
  if (!couple.partnerB) {
    const init = fnA && lnA ? `${fnA[0]}${lnA[0]}` : lnA ? lnA[0] : fnA ? fnA[0] : '?'
    return init.toUpperCase()
  }
  const fnB = (couple.partnerB.firstName || '').trim()
  const lnB = (couple.partnerB.lastName || '').trim()
  const initA = fnA ? fnA[0] : lnA ? lnA[0] : '?'
  const initB = fnB ? fnB[0] : lnB ? lnB[0] : '?'
  return `${initA}${initB}`.toUpperCase()
}

// ── Labels & lookups ──

export function getPhaseLabel(phase) {
  if (phase === 'prospect') return 'Prospect'
  if (phase === 'bilan_final') return 'Bilan final'
  const found = therapyPhases.find(p => p.key === phase)
  return found ? found.label : phase
}

export function getStatusLabel(status) {
  const labels = { active: 'Actif', inactive: 'Inactif' }
  return labels[status] || status
}

export function getProspectStageInfo(stage) {
  return prospectStages.find(s => s.key === stage) || prospectStages[0]
}

// ── Type client ──

export function getClientType(client) {
  const hasChildren = client.children && client.children.length > 0
  const hasPartnerB = !!client.partnerB
  if (client.type === 'family') return 'family'
  if (client.type === 'individual' && !hasPartnerB) return 'individual'
  if (hasChildren) return 'family'
  if (hasPartnerB) return 'couple'
  return client.type || 'individual'
}

// ── Statut calculé ──

export function getComputedStatus(couple) {
  if (couple.status === 'inactive') return 'inactive'
  if (couple.status === 'active') return 'active'
  if (couple.nextSession && new Date(couple.nextSession) > new Date()) return 'active'
  if (!couple.lastSession && !couple.startDate) return 'active'
  const refDate = new Date(couple.lastSession || couple.startDate)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  return refDate < threeMonthsAgo ? 'inactive' : 'active'
}

// ── Formatage dates ──

export function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function formatRelativeDate(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffHours < 1) return 'il y a quelques minutes'
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays}j`
  return formatDate(dateStr)
}

// ── Sessions du jour ──

export function getTodaySessions(sessions, couples) {
  const today = new Date().toISOString().split('T')[0]
  return sessions
    .filter(s => s.date.startsWith(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      ...s,
      couple: couples.find(c => c.id === s.coupleId)
    }))
}

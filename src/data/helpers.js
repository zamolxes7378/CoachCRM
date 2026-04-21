// ═══════════════════════════════════════════════════════
// CoachCRM — Fonctions utilitaires pures
// ═══════════════════════════════════════════════════════

import { therapyPhases, prospectStages } from './constants'
import { todayIso } from '../lib/date'

// ── Noms & initiales ──

export function getClientName(client) {
  if (!client?.partnerA) return 'Client inconnu'
  const fnA = (client.partnerA.firstName || '').trim() || '...'
  if (!client.partnerB) return `${fnA} ${(client.partnerA.lastName || '').toUpperCase()}`
  const fnB = (client.partnerB.firstName || '').trim() || '...'
  if (client.partnerA.lastName.toLowerCase() !== client.partnerB.lastName.toLowerCase()) {
    return `${fnA} ${client.partnerA.lastName.toUpperCase()} et ${fnB} ${client.partnerB.lastName.toUpperCase()}`
  }
  return `${fnA} et ${fnB} ${client.partnerA.lastName.toUpperCase()}`
}

export function getClientInitials(client) {
  if (!client?.partnerA) return '?'
  const fnA = (client.partnerA.firstName || '').trim()
  const lnA = (client.partnerA.lastName || '').trim()
  if (!client.partnerB) {
    const init = fnA && lnA ? `${fnA[0]}${lnA[0]}` : lnA ? lnA[0] : fnA ? fnA[0] : '?'
    return init.toUpperCase()
  }
  const fnB = (client.partnerB.firstName || '').trim()
  const lnB = (client.partnerB.lastName || '').trim()
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
  if (hasPartnerB) return 'client'
  return client.type || 'individual'
}

// ── Statut calculé ──

export function getComputedStatus(client) {
  if (client.status === 'inactive') return 'inactive'
  if (client.status === 'active') return 'active'
  if (client.nextSession && new Date(client.nextSession) > new Date()) return 'active'
  if (!client.lastSession && !client.startDate) return 'active'
  const refDate = new Date(client.lastSession || client.startDate)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  return refDate < threeMonthsAgo ? 'inactive' : 'active'
}

// ── Formatage dates ──

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDashboardDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  const now = new Date()
  const nowStr = todayIso()
  if (dateStr === nowStr) {
    const todayFull = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    return `Aujourd'hui – ${todayFull}`
  }
  // Show year if more than 6 months away (past or future)
  const diffMs = Math.abs(date.getTime() - now.getTime())
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000
  const includeYear = diffMs > sixMonthsMs
  const opts = includeYear
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    : { weekday: 'long', day: 'numeric', month: 'long' }
  const formatted = date.toLocaleDateString('fr-FR', opts)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function formatTime(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
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

export function getTodaySessions(sessions, clients) {
  const today = todayIso()
  return sessions
    .filter(s => s.date?.startsWith(today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      ...s,
      client: clients.find(c => c.id === s.clientId)
    }))
}

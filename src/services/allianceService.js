// ═══════════════════════════════════════════════════════
// CoachCRM — Logique d'alliance thérapeutique
// ═══════════════════════════════════════════════════════
// Gère les transitions automatiques prospect ↔ client
// basées sur la complétion des séances et le choix du paiement.

import * as ds from './dataService'

/**
 * Vérifie si une session valide l'alliance thérapeutique.
 * Alliance = séance completed + (mode de paiement choisi OU montant = 0)
 */
function isAllianceValidated(session, sessionRates, clientType) {
  if (session.status !== 'completed') return false
  const effectiveAmount = session.payment_amount ?? sessionRates[clientType] ?? null
  return !!session.payment_method || effectiveAmount === 0
}

/**
 * Compte les séances qui valident l'alliance pour un client donné,
 * en excluant optionnellement une séance spécifique (celle en cours de modification).
 */
function countValidatedSessions(rawSessions, clientId, excludeSessionId, sessionRates, clientType) {
  return rawSessions.filter(
    s => s.client_id === clientId &&
         s.id !== excludeSessionId &&
         isAllianceValidated(s, sessionRates, clientType)
  ).length
}

/**
 * Applique les transitions d'alliance thérapeutique après une mise à jour de séance.
 *
 * Règles :
 * - Prospect → Client : quand une séance est completed ET un mode de paiement est choisi (ou montant = 0)
 * - Client → Prospect : quand plus aucune séance ne valide l'alliance
 *   (annulation, suppression du mode de paiement, ou changement de montant)
 *
 * @param {Object} result - Résultat de la mise à jour (format snake_case)
 * @param {Object} updates - Updates demandés (format camelCase)
 * @param {Array} rawClients - Clients bruts (snake_case)
 * @param {Array} rawSessions - Sessions brutes (snake_case)
 * @param {Object} sessionRates - Tarifs par type { couple: 75, individual: 60 }
 * @param {string} defaultPhaseKey - Phase par défaut pour les nouveaux clients
 */
export async function checkAllianceTransition(result, updates, rawClients, rawSessions, sessionRates, defaultPhaseKey) {
  if (!result?.client_id) return

  const client = rawClients.find(c => c.id === result.client_id)
  if (!client) return

  const sessionId = result.id

  // ── Transition prospect → client ──
  if (client.phase === 'prospect') {
    const effectiveStatus = result.status || updates.status
    const effectivePM = result.payment_method || updates.paymentMethod || updates.payment_method
    const effectiveAmount = result.payment_amount ?? sessionRates[client.type] ?? null
    const isFreeOrPaid = effectivePM || effectiveAmount === 0

    if (effectiveStatus === 'completed' && isFreeOrPaid) {
      await ds.updateClient(client.id, { phase: defaultPhaseKey })
      return
    }
  }

  // ── Transitions client → prospect (3 cas) ──
  if (client.phase === 'prospect') return // Déjà prospect, rien à faire

  const shouldCheckReverse =
    (updates.status && updates.status !== 'completed') ||
    (('paymentMethod' in updates || 'payment_method' in updates) && !result.payment_method) ||
    (('paymentAmount' in updates || 'payment_amount' in updates) && result.payment_amount > 0 && !result.payment_method)

  if (shouldCheckReverse) {
    const validCount = countValidatedSessions(rawSessions, client.id, sessionId, sessionRates, client.type)
    if (validCount === 0) {
      await ds.updateClient(client.id, { phase: 'prospect' })
    }
  }
}

/**
 * Vérifie l'alliance thérapeutique après suppression groupée de séances.
 * Pour chaque client affecté : si aucune séance restante ne valide l'alliance,
 * le client redevient prospect.
 *
 * @param {string[]} deletedSessionIds - IDs des séances supprimées
 * @param {Array} rawSessionsBeforeDelete - Snapshot des sessions AVANT suppression
 * @param {Array} rawClients - Clients bruts (snake_case)
 * @param {Object} sessionRates - Tarifs par type
 */
export async function checkAllianceAfterBatchDelete(deletedSessionIds, rawSessionsBeforeDelete, rawClients, sessionRates) {
  // 1. Find unique clientIds from deleted sessions
  const deletedSet = new Set(deletedSessionIds)
  const affectedClientIds = [...new Set(
    rawSessionsBeforeDelete
      .filter(s => deletedSet.has(s.id))
      .map(s => s.client_id)
      .filter(Boolean)
  )]

  // 2. Remaining sessions = all sessions minus deleted ones
  const remainingSessions = rawSessionsBeforeDelete.filter(s => !deletedSet.has(s.id))

  // 3. For each affected client, check if alliance is still valid
  for (const clientId of affectedClientIds) {
    const client = rawClients.find(c => c.id === clientId)
    if (!client || client.phase === 'prospect') continue // Already prospect, skip

    const validCount = remainingSessions.filter(
      s => s.client_id === clientId && isAllianceValidated(s, sessionRates, client.type)
    ).length

    if (validCount === 0) {
      await ds.updateClient(clientId, { phase: 'prospect' })
    }
  }
}

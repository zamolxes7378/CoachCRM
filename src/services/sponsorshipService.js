/**
 * sponsorshipService.js — Logique métier du parrainage
 * 
 * Vocabulaire :
 * - "Parrainage" = entre particuliers (clients ou externes)
 * - "Recommandation" = par un professionnel externe
 * 
 * 3 niveaux de référencement :
 * 1. Client particulier → Client (type: 'parrainage', role: 'parrain'/'filleul')
 * 2. Externe particulier → Client (via externalReferrer)
 * 3. Professionnel externe → Client (type: 'parrainage-pro')
 */

import { recruitmentSources as defaultSources } from '../data/constants'



/**
 * Validate a sponsorship link before creation
 * @param {Object} client - The client being sponsored (filleul)
 * @param {Object} referrer - The sponsoring client (parrain)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSponsorship(client, referrer) {
  // Anti auto-parrainage
  if (client.id === referrer.id) {
    return { valid: false, error: 'Un client ne peut pas se parrainer lui-même.' }
  }

  // Détection de boucle : le filleul ne peut pas déjà être parrain du parrain
  if (client.clientLinks && client.clientLinks.some(
    l => l.type === 'parrainage' && l.role === 'parrain' && l.clientId === referrer.id
  )) {
    return { valid: false, error: 'Ce client est déjà parrain du parrain sélectionné (boucle détectée).' }
  }

  // Vérifier que le lien n'existe pas déjà
  if (client.clientLinks && client.clientLinks.some(
    l => l.type === 'parrainage' && l.role === 'filleul' && l.clientId === referrer.id
  )) {
    return { valid: false, error: 'Ce lien de parrainage existe déjà.' }
  }

  return { valid: true }
}

/**
 * Create a bidirectional sponsorship link between two clients
 * @param {Object} client - The client being sponsored (filleul)
 * @param {Object} referrer - The sponsoring client (parrain)
 * @returns {{ success: boolean, error?: string }}
 */
export function createSponsorshipLink(client, referrer) {
  const validation = validateSponsorship(client, referrer)
  if (!validation.valid) return { success: false, error: validation.error }

  // Build new arrays without mutating the originals
  const clientLinks = client.clientLinks || []
  const referrerLinks = referrer.clientLinks || []

  const newClientLinks = clientLinks.some(l => l.type === 'parrainage' && l.clientId === referrer.id)
    ? clientLinks
    : [...clientLinks, { clientId: referrer.id, type: 'parrainage', role: 'filleul' }]

  const newReferrerLinks = referrerLinks.some(l => l.type === 'parrainage' && l.clientId === client.id)
    ? referrerLinks
    : [...referrerLinks, { clientId: client.id, type: 'parrainage', role: 'parrain' }]

  // Return the new link arrays for callers to persist via updateClient
  return { success: true, clientLinks: newClientLinks, referrerLinks: newReferrerLinks }
}

/**
 * Remove a sponsorship link and clean up the reverse link
 * @param {Object} client - The client from which to remove the link
 * @param {Object} link - The link object to remove
 * @param {Array} allClients - All clients array for reverse link cleanup
 */
/**
 * Remove a sponsorship link and compute new link arrays (immutable).
 * Returns { clientLinks, otherClientId?, otherClientLinks? } for callers
 * to persist via updateClient — does NOT mutate any object.
 */
export function removeSponsorshipLink(client, link, allClients) {
  if (!client.clientLinks) return { clientLinks: [] }

  const newClientLinks = client.clientLinks.filter(
    l => !(l.type === link.type && l.clientId === link.clientId)
  )

  const result = { clientLinks: newClientLinks }

  if (link.type === 'parrainage') {
    const other = allClients.find(c => c.id === link.clientId)
    if (other && other.clientLinks) {
      result.otherClientId = other.id
      result.otherClientLinks = other.clientLinks.filter(
        l => !(l.type === 'parrainage' && l.clientId === client.id)
      )
    }
  }

  // If removing a parrain link (filleul side), also clear externalReferrer
  if ((link.type === 'parrainage' && link.role === 'filleul') || link.type === 'parrainage-pro') {
    const hasOtherParrainage = newClientLinks.some(
      l => l.type === 'parrainage' || l.type === 'parrainage-pro'
    )
    if (!hasOtherParrainage) {
      result.clearExternalReferrer = true
    }
  }

  return result
}

/**
 * Clean up all sponsorship links when source changes away from parrainage
 * @param {Object} client - The client whose source changed
 * @param {string} newSource - The new source value
 * @param {Array} allClients - All clients for reverse link cleanup
 */
/**
 * Compute new link arrays when source changes away from parrainage (immutable).
 * Returns { clientLinks, clearedOthers: [{id, clientLinks}] } for callers
 * to persist via updateClient — does NOT mutate any object.
 */
export function clearSponsorshipOnSourceChange(client, newSource, allClients) {
  if (newSource === 'parrainage' || newSource === 'referral') return null

  if (!client.clientLinks) return { clientLinks: [], clearedOthers: [] }

  const parrainageLinks = client.clientLinks.filter(l => l.type === 'parrainage')
  const clearedOthers = []
  parrainageLinks.forEach(link => {
    const other = allClients.find(c => c.id === link.clientId)
    if (other && other.clientLinks) {
      clearedOthers.push({
        id: other.id,
        clientLinks: other.clientLinks.filter(
          l => !(l.type === 'parrainage' && l.clientId === client.id)
        )
      })
    }
  })

  const newClientLinks = client.clientLinks.filter(
    l => l.type !== 'parrainage' && l.type !== 'parrainage-pro'
  )

  return { clientLinks: newClientLinks, clearedOthers }
}

/**
 * Create a timeline event for a new sponsorship
 * @param {string} referrerName - Name of the parrain
 * @returns {Object} The timeline contact event
 */
export function createSponsorshipTimelineEvent(referrerName) {
  return {
    id: window.crypto.randomUUID(),
    type: 'parrainage',
    date: new Date().toISOString(),
    note: `Parrainé par ${referrerName}`,
    done: true
  }
}

/**
 * Check if a client has an active sponsorship
 * @param {Object} client - The client to check
 * @returns {boolean}
 */
export function hasActiveSponsorship(client) {
  if (!client.clientLinks) return false
  return client.clientLinks.some(
    l => l.type === 'parrainage' || l.type === 'parrainage-pro'
  )
}

/**
 * Get the parrain (sponsor) of a client
 * @param {Object} client - The filleul
 * @param {Array} allClients - All clients
 * @returns {Object|null} The parrain client or null
 */
export function getParrain(client, allClients) {
  if (!client.clientLinks) return null
  const link = client.clientLinks.find(l => l.type === 'parrainage' && l.role === 'filleul')
  if (!link) return null
  return allClients.find(c => c.id === link.clientId) || null
}

/**
 * Get all filleuls (sponsored clients) of a parrain
 * @param {Object} parrain - The parrain client
 * @param {Array} allClients - All clients
 * @returns {Array} List of filleul clients
 */
export function getFilleuls(parrain, allClients) {
  if (!parrain.clientLinks) return []
  const filleulLinks = parrain.clientLinks.filter(l => l.type === 'parrainage' && l.role === 'parrain')
  return filleulLinks
    .map(l => allClients.find(c => c.id === l.clientId))
    .filter(Boolean)
}

/**
 * Count sponsorship referrals by source for a given year
 * @param {Array} clients - All clients
 * @param {number} year - The year to filter
 * @returns {Object} Counts by source key
 */
export function countClientsBySource(clients, year, sources = []) {
  // Build reverse map: label → key (e.g. 'Site web' → 'site_web')
  const labelToKey = {}
  sources.forEach(s => { labelToKey[s.label.toLowerCase()] = s.key })

  // Build old-key → new-key map using default constants as bridge
  // e.g. old key 'website' has label 'Site web' in defaults → new key 'site_web' in context
  const oldKeyToNew = {}
  defaultSources.forEach(def => {
    const newKey = labelToKey[def.label.toLowerCase()]
    if (newKey && newKey !== def.key) oldKeyToNew[def.key] = newKey
  })

  const counts = {}
  clients.forEach(c => {
    if (year) {
      if (!c.startDate) return
      if (new Date(c.startDate).getFullYear() !== year) return
    }
    let src = c.source || 'unknown'
    // Normalize: label → key
    const fromLabel = labelToKey[src.toLowerCase()]
    if (fromLabel) src = fromLabel
    // Normalize: old default key → new context key
    if (oldKeyToNew[src]) src = oldKeyToNew[src]
    counts[src] = (counts[src] || 0) + 1
  })
  return counts
}

/**
 * Export sponsorship data as CSV rows
 * @param {Array} clients - All clients
 * @param {Function} getClientName - Function to get client display name
 * @param {{ startDate?: string, endDate?: string }} options - Optional period filter
 * @returns {string} CSV string
 */
export function exportSponsorshipCSV(clients, getClientName, { startDate, endDate } = {}) {
  const rows = [
    ['Client', 'Source', 'Parrain/Recommandeur', 'Type', 'Date début'].join(';')
  ]

  clients.forEach(c => {
    if (!c.source || (c.source !== 'referral' && c.source !== 'parrainage')) return

    // Period filter
    if (startDate && c.startDate && c.startDate < startDate) return
    if (endDate && c.startDate && c.startDate > endDate) return

    const name = getClientName(c)
    const source = c.source

    // Find parrain
    let parrainName = '—'
    let type = '—'
    if (c.clientLinks) {
      const parrainLink = c.clientLinks.find(l => l.type === 'parrainage' && l.role === 'filleul')
      if (parrainLink) {
        const parrain = clients.find(p => p.id === parrainLink.clientId)
        parrainName = parrain ? getClientName(parrain) : '—'
        type = 'Parrainage client'
      }
      const proLink = c.clientLinks.find(l => l.type === 'parrainage-pro')
      if (proLink) {
        parrainName = proLink.proName || '—'
        type = 'Recommandation pro'
      }
    }
    if (c.externalReferrer) {
      parrainName = `${c.externalReferrer.firstName || ''} ${c.externalReferrer.lastName || ''}`.trim() || parrainName
      if (c.externalReferrer.referrerType === 'professionnel') {
        type = 'Recommandation pro'
      } else {
        type = type === '—' ? 'Parrainage externe' : type
      }
    }

    rows.push([name, source, parrainName, type, c.startDate || '—'].join(';'))
  })

  return '\ufeff' + rows.join('\n')
}

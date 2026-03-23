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

/**
 * Validate a sponsorship link before creation
 * @param {Object} couple - The client being sponsored (filleul)
 * @param {Object} referrer - The sponsoring client (parrain)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSponsorship(couple, referrer) {
  // Anti auto-parrainage
  if (couple.id === referrer.id) {
    return { valid: false, error: 'Un client ne peut pas se parrainer lui-même.' }
  }

  // Détection de boucle : le filleul ne peut pas déjà être parrain du parrain
  if (couple.clientLinks && couple.clientLinks.some(
    l => l.type === 'parrainage' && l.role === 'parrain' && l.clientId === referrer.id
  )) {
    return { valid: false, error: 'Ce client est déjà parrain du parrain sélectionné (boucle détectée).' }
  }

  // Vérifier que le lien n'existe pas déjà
  if (couple.clientLinks && couple.clientLinks.some(
    l => l.type === 'parrainage' && l.role === 'filleul' && l.clientId === referrer.id
  )) {
    return { valid: false, error: 'Ce lien de parrainage existe déjà.' }
  }

  return { valid: true }
}

/**
 * Create a bidirectional sponsorship link between two clients
 * @param {Object} couple - The client being sponsored (filleul)
 * @param {Object} referrer - The sponsoring client (parrain)
 * @returns {{ success: boolean, error?: string }}
 */
export function createSponsorshipLink(couple, referrer) {
  const validation = validateSponsorship(couple, referrer)
  if (!validation.valid) return { success: false, error: validation.error }

  // Initialize clientLinks arrays if needed
  if (!couple.clientLinks) couple.clientLinks = []
  if (!referrer.clientLinks) referrer.clientLinks = []

  // Add link on filleul side
  if (!couple.clientLinks.some(l => l.type === 'parrainage' && l.clientId === referrer.id)) {
    couple.clientLinks.push({ clientId: referrer.id, type: 'parrainage', role: 'filleul' })
  }

  // Add link on parrain side
  if (!referrer.clientLinks.some(l => l.type === 'parrainage' && l.clientId === couple.id)) {
    referrer.clientLinks.push({ clientId: couple.id, type: 'parrainage', role: 'parrain' })
  }

  return { success: true }
}

/**
 * Remove a sponsorship link and clean up the reverse link
 * @param {Object} couple - The client from which to remove the link
 * @param {Object} link - The link object to remove
 * @param {Array} allClients - All clients array for reverse link cleanup
 */
export function removeSponsorshipLink(couple, link, allClients) {
  if (!couple.clientLinks) return

  // Remove the link from this couple
  couple.clientLinks = couple.clientLinks.filter(
    l => !(l.type === link.type && l.clientId === link.clientId)
  )

  // Remove the reverse link from the other client
  if (link.type === 'parrainage') {
    const other = allClients.find(c => c.id === link.clientId)
    if (other && other.clientLinks) {
      other.clientLinks = other.clientLinks.filter(
        l => !(l.type === 'parrainage' && l.clientId === couple.id)
      )
    }
  }

  // If removing a parrain link (filleul side), also clear source/externalReferrer
  if ((link.type === 'parrainage' && link.role === 'filleul') || link.type === 'parrainage-pro') {
    // Check if any other parrainage links remain
    const hasOtherParrainage = couple.clientLinks.some(
      l => l.type === 'parrainage' || l.type === 'parrainage-pro'
    )
    if (!hasOtherParrainage) {
      couple.externalReferrer = null
    }
  }
}

/**
 * Clean up all sponsorship links when source changes away from parrainage
 * @param {Object} couple - The client whose source changed
 * @param {string} newSource - The new source value
 * @param {Array} allClients - All clients for reverse link cleanup
 */
export function clearSponsorshipOnSourceChange(couple, newSource, allClients) {
  if (newSource === 'parrainage' || newSource === 'referral') return

  // Clear external referrer
  couple.externalReferrer = null

  if (!couple.clientLinks) return

  // Remove all parrainage links
  const parrainageLinks = couple.clientLinks.filter(l => l.type === 'parrainage')
  parrainageLinks.forEach(link => {
    const other = allClients.find(c => c.id === link.clientId)
    if (other && other.clientLinks) {
      other.clientLinks = other.clientLinks.filter(
        l => !(l.type === 'parrainage' && l.clientId === couple.id)
      )
    }
  })

  // Remove all parrainage-pro links
  couple.clientLinks = couple.clientLinks.filter(
    l => l.type !== 'parrainage' && l.type !== 'parrainage-pro'
  )
}

/**
 * Create a timeline event for a new sponsorship
 * @param {string} referrerName - Name of the parrain
 * @returns {Object} The timeline contact event
 */
export function createSponsorshipTimelineEvent(referrerName) {
  return {
    id: `contact-parrainage-${Date.now()}`,
    type: 'parrainage',
    date: new Date().toISOString(),
    note: `Parrainé par ${referrerName}`,
    done: true
  }
}

/**
 * Check if a client has an active sponsorship
 * @param {Object} couple - The client to check
 * @returns {boolean}
 */
export function hasActiveSponsorship(couple) {
  if (!couple.clientLinks) return false
  return couple.clientLinks.some(
    l => l.type === 'parrainage' || l.type === 'parrainage-pro'
  )
}

/**
 * Get the parrain (sponsor) of a client
 * @param {Object} couple - The filleul
 * @param {Array} allClients - All clients
 * @returns {Object|null} The parrain client or null
 */
export function getParrain(couple, allClients) {
  if (!couple.clientLinks) return null
  const link = couple.clientLinks.find(l => l.type === 'parrainage' && l.role === 'filleul')
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
export function countClientsBySource(clients, year) {
  const counts = {}
  clients.forEach(c => {
    if (year && c.startDate && new Date(c.startDate).getFullYear() !== year) return
    const src = c.source || 'unknown'
    counts[src] = (counts[src] || 0) + 1
  })
  return counts
}

/**
 * Export sponsorship data as CSV rows
 * @param {Array} clients - All clients
 * @param {Function} getCoupleName - Function to get client display name
 * @returns {string} CSV string
 */
export function exportSponsorshipCSV(clients, getCoupleName) {
  const rows = [
    ['Client', 'Source', 'Parrain/Recommandeur', 'Type', 'Date début'].join(';')
  ]

  clients.forEach(c => {
    if (!c.source || (c.source !== 'referral' && c.source !== 'parrainage')) return
    const name = getCoupleName(c)
    const source = c.source

    // Find parrain
    let parrainName = '—'
    let type = '—'
    if (c.clientLinks) {
      const parrainLink = c.clientLinks.find(l => l.type === 'parrainage' && l.role === 'filleul')
      if (parrainLink) {
        const parrain = clients.find(p => p.id === parrainLink.clientId)
        parrainName = parrain ? getCoupleName(parrain) : '—'
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

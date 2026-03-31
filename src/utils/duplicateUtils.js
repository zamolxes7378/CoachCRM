/**
 * Duplicate detection utilities for CoachCRM
 * Provides fuzzy matching for clients and professionals
 */

/** Normalize a string: lowercase, trim, remove accents */
export function normalize(str) {
  if (!str) return ''
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Levenshtein distance between two strings */
export function levenshtein(a, b) {
  a = normalize(a)
  b = normalize(b)
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Find duplicate clients matching the query
 * @param {{ firstName?: string, lastName?: string, email?: string, phone?: string }} query
 * @param {Array} clients - clients array
 * @param {Function} getClientName - name helper
 * @param {string} [excludeId] - ID to exclude (e.g. current client)
 * @returns {Array<{ client: object, score: number, reason: string }>}
 */
export function findDuplicateClients(query, clients, getClientName, excludeId) {
  if (!query.lastName || normalize(query.lastName).length < 2) return []

  const results = []
  const qFirst = normalize(query.firstName || '')
  const qLast = normalize(query.lastName || '')
  const qEmail = normalize(query.email || '')
  const qPhone = (query.phone || '').replace(/\s/g, '')

  for (const client of clients) {
    if (client.id === excludeId || client.deleted) continue

    let bestScore = 0
    let reason = ''

    // Check partnerA and partnerB
    const partners = [client.partnerA, client.partnerB].filter(Boolean)
    for (const p of partners) {
      const pFirst = normalize(p.firstName || '')
      const pLast = normalize(p.lastName || '')
      const pEmail = normalize(p.email || '')
      const pPhone = (p.phone || '').replace(/\s/g, '')

      // Email match (strongest)
      if (qEmail && pEmail && qEmail === pEmail) {
        if (100 > bestScore) { bestScore = 100; reason = `Email identique : ${p.email}` }
      }

      // Phone match
      if (qPhone && pPhone && qPhone.length >= 6 && pPhone.includes(qPhone)) {
        if (90 > bestScore) { bestScore = 90; reason = `Téléphone identique : ${p.phone}` }
      }

      // Exact name match (case insensitive)
      if (qLast === pLast && qFirst === pFirst && qLast.length > 0) {
        if (95 > bestScore) { bestScore = 95; reason = 'Nom et prénom identiques' }
      }

      // Last name exact + first name partial
      if (qLast === pLast && qFirst && pFirst && (qFirst.startsWith(pFirst.charAt(0)) || pFirst.startsWith(qFirst.charAt(0)))) {
        if (80 > bestScore) { bestScore = 80; reason = 'Nom identique, prénom similaire' }
      }

      // Fuzzy last name (Levenshtein ≤ 2)
      if (qLast.length >= 3) {
        const dist = levenshtein(qLast, pLast)
        if (dist > 0 && dist <= 2) {
          const fuzzyScore = 70 - (dist * 10)
          if (fuzzyScore > bestScore) { bestScore = fuzzyScore; reason = `Nom similaire : ${p.lastName}` }
        }
      }
    }

    if (bestScore >= 50) {
      results.push({ client, score: bestScore, reason, name: getClientName(client) })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}

/**
 * Find duplicate professionals matching the query
 * @param {{ firstName?: string, lastName?: string, email?: string, phone?: string }} query
 * @param {Array} professionals - professionals array
 * @param {string} [excludeId] - ID to exclude
 * @returns {Array<{ pro: object, score: number, reason: string }>}
 */
export function findDuplicatePros(query, professionals, excludeId) {
  if (!query.lastName || normalize(query.lastName).length < 2) return []

  const results = []
  const qFirst = normalize(query.firstName || '')
  const qLast = normalize(query.lastName || '')
  const qEmail = normalize(query.email || '')
  const qPhone = (query.phone || '').replace(/\s/g, '')

  for (const pro of professionals) {
    if (pro.id === excludeId) continue

    let bestScore = 0
    let reason = ''
    const pFirst = normalize(pro.firstName || '')
    const pLast = normalize(pro.lastName || '')
    const pEmail = normalize(pro.email || '')
    const pPhone = (pro.phone || '').replace(/\s/g, '')

    if (qEmail && pEmail && qEmail === pEmail) {
      if (100 > bestScore) { bestScore = 100; reason = `Email identique : ${pro.email}` }
    }
    if (qPhone && pPhone && qPhone.length >= 6 && pPhone.includes(qPhone)) {
      if (90 > bestScore) { bestScore = 90; reason = `Téléphone identique : ${pro.phone}` }
    }
    if (qLast === pLast && qFirst === pFirst && qLast.length > 0) {
      if (95 > bestScore) { bestScore = 95; reason = 'Nom et prénom identiques' }
    }
    if (qLast === pLast && qFirst && pFirst && (qFirst.startsWith(pFirst.charAt(0)) || pFirst.startsWith(qFirst.charAt(0)))) {
      if (80 > bestScore) { bestScore = 80; reason = 'Nom identique, prénom similaire' }
    }
    if (qLast.length >= 3) {
      const dist = levenshtein(qLast, pLast)
      if (dist > 0 && dist <= 2) {
        const fuzzyScore = 70 - (dist * 10)
        if (fuzzyScore > bestScore) { bestScore = fuzzyScore; reason = `Nom similaire : ${pro.lastName}` }
      }
    }

    if (bestScore >= 50) {
      const name = `${pro.firstName || ''} ${pro.lastName || ''}`.trim()
      results.push({ pro, score: bestScore, reason, name })
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}

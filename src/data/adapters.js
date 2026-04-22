// ═══════════════════════════════════════════════════════
// CoachCRM — Adaptateurs camelCase ↔ snake_case
// ═══════════════════════════════════════════════════════
// Maps between Supabase (snake_case) and React app (camelCase)

// ── Helpers ──

const capitalizeWords = (str) => {
  if (typeof str !== 'string' || !str) return str
  return str.split(/(\s+|-)/).map(word => {
    if (word.length === 0) return word
    if (/^\s+$/.test(word) || word === '-') return word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  }).join('')
}

const normalizePartner = (p) => {
  if (!p) return p
  return { ...p, firstName: capitalizeWords(p.firstName) }
}

const normalizePartnerDB = (p) => {
  if (!p) return p
  return { ...p, firstName: capitalizeWords(p.firstName || p.first_name) }
}

// ── Supabase → App (reads) ──

export function adaptClient(c) {
  if (!c) return c
  return {
    ...c,
    partnerA: normalizePartnerDB(c.partner_a),
    partnerB: normalizePartnerDB(c.partner_b),
    startDate: c.start_date,
    sessionsCount: c.sessions_count,
    totalSessions: c.total_sessions,
    nextSession: c.next_session,
    lastSession: c.last_session,
    emotionalMaturity: c.emotional_maturity,
    prospectStage: c.prospect_stage,
    referredBy: c.referred_by,
    billingAddress: c.billing_address || (c.partner_a?.billingAddress) || '',
    clientLinks: c.client_links || c.clientLinks || [],
    externalReferrer: c.external_referrer || c.externalReferrer || null,
    deletedAt: c.deleted_at,
    deleted: !!c.deleted_at,
    sessionRate: c.session_rate,
    sessionFrequency: c.session_frequency,
    aiSynthesis: (typeof c.ai_synthesis === 'string' && (c.ai_synthesis.startsWith('{') || c.ai_synthesis.startsWith('[')))
      ? JSON.parse(c.ai_synthesis)
      : { text: c.ai_synthesis || '' },
    noteDynamique: c.note_dynamique,
    noteAxes: c.note_axes,
    noteVigilance: c.note_vigilance,
    noteObjectifs: c.note_objectifs,
  }
}

export function adaptTherapyCycle(tc) {
  if (!tc) return tc
  return {
    ...tc,
    clientId: tc.client_id,
    userId: tc.user_id,
    startDate: tc.start_date,
    totalSessions: tc.total_sessions,
  }
}

export function adaptSession(s) {
  if (!s) return s
  return {
    ...s,
    date: s.date,
    clientId: s.client_id,
    hasReport: s.has_report,
    paymentMethod: s.payment_method,
    paymentReceived: s.payment_received,
    paymentStatus: s.payment_status,
    paymentAmount: s.payment_amount,
    paymentDate: s.payment_date,
    cancellationReason: s.cancellation_reason,
    needsInvoice: s.needs_invoice,
    invoiceSent: s.invoice_sent,
    invoiceDate: s.invoice_date,
    invoiceCoveredSessionIds: s.invoice_covered_session_ids,
    coveredSessionIds: s.covered_session_ids,
    duration: s.duration,
  }
}

export function adaptReport(r) {
  if (!r) return r
  return {
    ...r,
    sessionId: r.session_id,
    clientId: r.client_id,
    clientName: r.client_name,
    sessionNumber: r.session_number,
    pedagogicalContent: r.pedagogical_content || [],
    emotionsA: r.emotions_a || [],
    emotionsB: r.emotions_b || [],
    themes: r.themes || [],
    patterns: r.patterns || [],
    progress: r.progress || [],
    vigilance: r.vigilance || [],
    exercises: r.exercises || [],
  }
}

export function adaptProfessional(p) {
  if (!p) return p
  return {
    ...p,
    firstName: p.first_name,
    lastName: p.last_name,
    createdAt: p.created_at,
  }
}

export function adaptContact(c) {
  if (!c) return c
  return {
    ...c,
    clientId: c.client_id,
    userId: c.user_id,
    date: c.date ? c.date.slice(0, 16) : c.date
  }
}

export function adaptInvoice(inv) {
  if (!inv) return inv
  return {
    id: inv.id,
    userId: inv.user_id,
    clientId: inv.client_id,
    invoiceDate: inv.invoice_date,
    sent: inv.sent,
    sentAt: inv.sent_at,
    createdAt: inv.created_at,
    sessionIds: (inv.invoice_sessions || []).map(is => is.session_id),
  }
}

// ── App → Supabase (writes) ──

export function unadaptClient(c) {
  const out = { ...c }
  if ('partnerA' in c) { out.partner_a = normalizePartner(c.partnerA); delete out.partnerA }
  if ('partnerB' in c) { out.partner_b = normalizePartner(c.partnerB); delete out.partnerB }
  if ('startDate' in c) { out.start_date = c.startDate; delete out.startDate }
  if ('sessionsCount' in c) { out.sessions_count = c.sessionsCount; delete out.sessionsCount }
  if ('totalSessions' in c) { out.total_sessions = c.totalSessions; delete out.totalSessions }
  if ('nextSession' in c) { out.next_session = c.nextSession; delete out.nextSession }
  if ('lastSession' in c) { out.last_session = c.lastSession; delete out.lastSession }
  if ('emotionalMaturity' in c) { out.emotional_maturity = c.emotionalMaturity; delete out.emotionalMaturity }
  if ('prospectStage' in c) { out.prospect_stage = c.prospectStage; delete out.prospectStage }
  if ('referredBy' in c) { out.referred_by = c.referredBy; delete out.referredBy }
  if ('billingAddress' in c) { out.billing_address = c.billingAddress; delete out.billingAddress }
  if ('clientLinks' in c) { out.client_links = c.clientLinks; delete out.clientLinks }
  if ('externalReferrer' in c) { out.external_referrer = c.externalReferrer; delete out.externalReferrer }
  if ('deletedAt' in c) { out.deleted_at = c.deletedAt; delete out.deletedAt }
  if ('sessionRate' in c) { out.session_rate = c.sessionRate; delete out.sessionRate }
  if ('sessionFrequency' in c) { out.session_frequency = c.sessionFrequency; delete out.sessionFrequency }
  if ('aiSynthesis' in c) {
    out.ai_synthesis = typeof c.aiSynthesis === 'object' ? JSON.stringify(c.aiSynthesis) : c.aiSynthesis;
    delete out.aiSynthesis
  }
  if ('noteDynamique' in c) { out.note_dynamique = c.noteDynamique; delete out.noteDynamique }
  if ('noteAxes' in c) { out.note_axes = c.noteAxes; delete out.noteAxes }
  if ('noteVigilance' in c) { out.note_vigilance = c.noteVigilance; delete out.noteVigilance }
  if ('noteObjectifs' in c) { out.note_objectifs = c.noteObjectifs; delete out.noteObjectifs }
  delete out.deleted
  delete out.children
  return out
}

export function unadaptTherapyCycle(tc) {
  const out = { ...tc }
  if ('clientId' in tc) { out.client_id = tc.clientId; delete out.clientId }
  if ('userId' in tc) { out.user_id = tc.userId; delete out.userId }
  if ('startDate' in tc) { out.start_date = tc.startDate; delete out.startDate }
  if ('totalSessions' in tc) { out.total_sessions = tc.totalSessions; delete out.totalSessions }
  return out
}

export function unadaptSession(s) {
  const out = { ...s }
  if ('clientId' in s) { out.client_id = s.clientId; delete out.clientId }
  if ('hasReport' in s) { out.has_report = s.hasReport; delete out.hasReport }
  if ('paymentMethod' in s) { out.payment_method = s.paymentMethod; delete out.paymentMethod }
  if ('paymentReceived' in s) { out.payment_received = s.paymentReceived; delete out.paymentReceived }
  if ('paymentStatus' in s) { out.payment_status = s.paymentStatus; delete out.paymentStatus }
  if ('paymentAmount' in s) { out.payment_amount = s.paymentAmount; delete out.paymentAmount }
  if ('paymentDate' in s) { out.payment_date = s.paymentDate; delete out.paymentDate }
  if ('cancellationReason' in s) { out.cancellation_reason = s.cancellationReason; delete out.cancellationReason }
  if ('needsInvoice' in s) { out.needs_invoice = s.needsInvoice; delete out.needsInvoice }
  if ('invoiceSent' in s) { out.invoice_sent = s.invoiceSent; delete out.invoiceSent }
  if ('invoiceDate' in s) { out.invoice_date = s.invoiceDate; delete out.invoiceDate }
  if ('invoiceCoveredSessionIds' in s) { out.invoice_covered_session_ids = s.invoiceCoveredSessionIds; delete out.invoiceCoveredSessionIds }
  if ('coveredSessionIds' in s) { out.covered_session_ids = s.coveredSessionIds; delete out.coveredSessionIds }
  if ('duration' in s) { out.duration = s.duration }
  return out
}

export function unadaptProfessional(p) {
  const out = { ...p }
  if ('firstName' in p) { out.first_name = p.firstName; delete out.firstName }
  if ('lastName' in p) { out.last_name = p.lastName; delete out.lastName }
  if ('createdAt' in p) { out.created_at = p.createdAt; delete out.createdAt }
  return out
}

export function unadaptContact(c) {
  const out = { ...c }
  if ('clientId' in c) { out.client_id = c.clientId; delete out.clientId }
  if ('userId' in c) { out.user_id = c.userId; delete out.userId }
  // Note: date remains as-is (Supabase accepts ISO or YYYY-MM-DDTHH:mm)
  return out
}

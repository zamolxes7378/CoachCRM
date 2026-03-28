// ═══════════════════════════════════════════════════════
// CoachCRM — Adaptateurs camelCase ↔ snake_case
// ═══════════════════════════════════════════════════════
// Maps between Supabase (snake_case) and React app (camelCase)

// ── Supabase → App (reads) ──

export function adaptClient(c) {
  if (!c) return c
  return {
    ...c,
    partnerA: c.partner_a,
    partnerB: c.partner_b,
    startDate: c.start_date,
    sessionsCount: c.sessions_count,
    totalSessions: c.total_sessions,
    nextSession: c.next_session,
    lastSession: c.last_session,
    emotionalMaturity: c.emotional_maturity,
    prospectStage: c.prospect_stage,
    referredBy: c.referred_by,
    clientLinks: c.client_links || c.clientLinks || [],
    externalReferrer: c.external_referrer || c.externalReferrer || null,
    deletedAt: c.deleted_at,
    deleted: !!c.deleted_at,
  }
}

const stripTz = (d) => d ? d.replace(/([+-]\d{2}:\d{2}|Z)$/, '') : d

export function adaptSession(s) {
  if (!s) return s
  return {
    ...s,
    date: stripTz(s.date),
    coupleId: s.client_id,
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
    coupleId: r.client_id,
    coupleName: r.client_name,
    sessionNumber: r.session_number,
    pedagogicalContent: r.pedagogical_content || [],
    emotionsA: r.emotions_a || [],
    emotionsB: r.emotions_b || [],
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

// ── App → Supabase (writes) ──

export function unadaptClient(c) {
  const out = { ...c }
  if ('partnerA' in c) { out.partner_a = c.partnerA; delete out.partnerA }
  if ('partnerB' in c) { out.partner_b = c.partnerB; delete out.partnerB }
  if ('startDate' in c) { out.start_date = c.startDate; delete out.startDate }
  if ('sessionsCount' in c) { out.sessions_count = c.sessionsCount; delete out.sessionsCount }
  if ('totalSessions' in c) { out.total_sessions = c.totalSessions; delete out.totalSessions }
  if ('nextSession' in c) { out.next_session = c.nextSession; delete out.nextSession }
  if ('lastSession' in c) { out.last_session = c.lastSession; delete out.lastSession }
  if ('emotionalMaturity' in c) { out.emotional_maturity = c.emotionalMaturity; delete out.emotionalMaturity }
  if ('prospectStage' in c) { out.prospect_stage = c.prospectStage; delete out.prospectStage }
  if ('referredBy' in c) { out.referred_by = c.referredBy; delete out.referredBy }
  if ('clientLinks' in c) { out.client_links = c.clientLinks; delete out.clientLinks }
  if ('externalReferrer' in c) { out.external_referrer = c.externalReferrer; delete out.externalReferrer }
  if ('deletedAt' in c) { out.deleted_at = c.deletedAt; delete out.deletedAt }
  delete out.deleted
  return out
}

export function unadaptSession(s) {
  const out = { ...s }
  if ('coupleId' in s) { out.client_id = s.coupleId; delete out.coupleId }
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

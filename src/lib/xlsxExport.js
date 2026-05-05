import { todayIso } from './date'
import { downloadBlob } from './fileDownload'

/**
 * Returns an 8-char hex prefix of the SHA-256 hash of the given string.
 * Used to include a non-reversible therapist identifier in the filename.
 */
async function shortHash(str) {
  const encoded = new TextEncoder().encode(str)
  const buf = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8)
}

/**
 * Builds and downloads a watermarked XLSX dossier for a client.
 *
 * @param {object} client
 * @param {Array}  sessions
 * @param {Array}  reports
 * @param {Function} formatDate
 * @param {Function} getPhaseLabel
 * @param {object} opts
 * @param {string} opts.therapistEmail  — used in watermark header
 * @param {string} opts.therapistId     — hashed for filename
 * @param {string|null} opts.password   — TODO: exceljs OSS does not expose
 *   workbook-level password encryption for .xlsx; the password field is
 *   accepted by the UI but not applied to the file. Implement via a server-side
 *   conversion step (e.g. LibreOffice or a dedicated service) if required.
 */
export async function buildAndDownloadXlsx(client, sessions, reports, formatDate, getPhaseLabel, opts = {}) {
  const { therapistEmail = '', therapistId = '', password = null } = opts

  const { default: ExcelJS } = await import('exceljs')

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CoachCRM'
  workbook.created = new Date()

  const exportTimestamp = new Date().toISOString()
  const watermarkText =
    `Document confidentiel — Art. 9 RGPD. Usage restreint au professionnel destinataire. | ${therapistEmail} | ${exportTimestamp}`

  // ── Helper: add watermark row as first row of a sheet ──────────────────────
  function insertWatermark(ws, colCount) {
    ws.spliceRows(1, 0, [watermarkText])
    const wRow = ws.getRow(1)
    wRow.getCell(1).value = watermarkText
    wRow.getCell(1).font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 }
    wRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
    if (colCount > 1) {
      ws.mergeCells(1, 1, 1, colCount)
    }
    wRow.commit()
  }

  // ── 1. Fiche Identité ──────────────────────────────────────────────────────
  const wsInfo = workbook.addWorksheet('Identité & Infos', { properties: { tabColor: { argb: 'FF1E3A8A' } } })
  wsInfo.columns = [
    { header: 'Champ', key: 'champ', width: 25 },
    { header: 'Valeur', key: 'valeur', width: 50 },
  ]

  insertWatermark(wsInfo, 2)

  const infoRows = [
    { champ: 'ID Client', valeur: client.id },
    { champ: 'Prénom', valeur: client.firstName },
    { champ: 'Nom', valeur: client.lastName },
    { champ: 'Email', valeur: client.email || '—' },
    { champ: 'Téléphone', valeur: client.phone || '—' },
    { champ: 'Date de création', valeur: formatDate(client.startDate || client.createdAt) },
    { champ: 'Phase actuelle', valeur: getPhaseLabel ? getPhaseLabel(client.phase) : client.phase },
    { champ: 'Tarif par défaut', valeur: `${client.sessionRate || 0} €` },
    { champ: 'Notes globales', valeur: client.notes || '—' },
  ]
  wsInfo.addRows(infoRows)

  // Header row is now row 2 (row 1 = watermark)
  wsInfo.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsInfo.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
  wsInfo.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.getCell(1).font = { bold: true, color: { argb: 'FF4B5563' } }
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    }
  })

  // ── 2. Séances ─────────────────────────────────────────────────────────────
  const wsSessions = workbook.addWorksheet('Séances & Notes', { properties: { tabColor: { argb: 'FF059669' } } })
  wsSessions.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Phase', key: 'phase', width: 20 },
    { header: 'Statut', key: 'status', width: 15 },
    { header: 'Tarif', key: 'rate', width: 10 },
    { header: 'Paiement', key: 'payment', width: 15 },
    { header: 'Note Préparation', key: 'prep', width: 40 },
    { header: 'Compte-rendu (CR)', key: 'cr', width: 50 },
    { header: 'Tags CR', key: 'tags', width: 30 },
  ]

  insertWatermark(wsSessions, 8)

  const sortedSessions = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  sortedSessions.forEach(session => {
    const report = reports.find(r => r.sessionId === session.id)
    let statusText = 'Planifiée'
    if (session.status === 'cancelled') statusText = 'Annulée'
    else if (session.status === 'completed') statusText = 'Réalisée'
    let paymentText = 'Non renseigné'
    if (session.paymentReceived && session.paymentMethod) paymentText = `Encaissé (${session.paymentMethod})`
    else if (session.status === 'completed') paymentText = 'À régler'
    wsSessions.addRow({
      date: formatDate(session.date),
      phase: getPhaseLabel ? getPhaseLabel(session.phase) : session.phase,
      status: statusText,
      rate: `${session.paymentAmount || session.rate || client.sessionRate || 0} €`,
      payment: paymentText,
      prep: session.preparationNote || '—',
      cr: report ? report.content : '—',
      tags: report && report.tags ? report.tags.join(', ') : '—',
    })
  })

  wsSessions.getRow(2).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsSessions.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }
  wsSessions.eachRow((row, rowNumber) => {
    row.alignment = { wrapText: true, vertical: 'top' }
    if (rowNumber > 2 && rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    }
  })

  // ── Build filename (no full client name — PII) ─────────────────────────────
  const initials = [client.firstName, client.lastName]
    .filter(Boolean)
    .map(n => n[0].toUpperCase())
    .join('')
  const dateStr = todayIso()
  const idHash = await shortHash(therapistId || therapistEmail || 'unknown')
  const fileName = `dossier_${initials}_${dateStr}_${idHash}.xlsx`

  // TODO: password-protected XLSX requires server-side tooling (e.g. LibreOffice
  // UNO API or a dedicated conversion microservice). The `password` option from
  // the UI is accepted but not applied here because exceljs OSS does not expose
  // workbook-level encryption for the .xlsx format.
  if (password) {
    console.warn('[xlsxExport] Password protection requested but not yet implemented — file will be unencrypted.')
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  downloadBlob(blob, fileName)
}

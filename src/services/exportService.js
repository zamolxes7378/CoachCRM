import { todayIso } from '../lib/date'

export async function exportClientDossierExcel(client, sessions, reports, formatDate, getPhaseLabel) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver')
  ])
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'CoachCRM'
  workbook.created = new Date()

  // 1. Fiche Identité
  const wsInfo = workbook.addWorksheet('Identité & Infos', { properties: { tabColor: { argb: 'FF1E3A8A' } } })
  wsInfo.columns = [
    { header: 'Champ', key: 'champ', width: 25 },
    { header: 'Valeur', key: 'valeur', width: 50 }
  ]

  // Add data
  const infoRows = [
    { champ: 'ID Client', valeur: client.id },
    { champ: 'Prénom', valeur: client.firstName },
    { champ: 'Nom', valeur: client.lastName },
    { champ: 'Email', valeur: client.email || '—' },
    { champ: 'Téléphone', valeur: client.phone || '—' },
    { champ: 'Date de création', valeur: formatDate(client.startDate || client.createdAt) },
    { champ: 'Phase actuelle', valeur: getPhaseLabel ? getPhaseLabel(client.phase) : client.phase },
    { champ: 'Tarif par défaut', valeur: `${client.sessionRate || 0} €` },
    { champ: 'Notes globales', valeur: client.notes || '—' }
  ]
  wsInfo.addRows(infoRows)

  // Styling Info Sheet
  wsInfo.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsInfo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
  wsInfo.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell(1).font = { bold: true, color: { argb: 'FF4B5563' } }
      row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    }
  })

  // 2. Historique des Séances
  const wsSessions = workbook.addWorksheet('Séances & Notes', { properties: { tabColor: { argb: 'FF059669' } } })
  wsSessions.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Phase', key: 'phase', width: 20 },
    { header: 'Statut', key: 'status', width: 15 },
    { header: 'Tarif', key: 'rate', width: 10 },
    { header: 'Paiement', key: 'payment', width: 15 },
    { header: 'Note Préparation', key: 'prep', width: 40 },
    { header: 'Compte-rendu (CR)', key: 'cr', width: 50 },
    { header: 'Tags CR', key: 'tags', width: 30 }
  ]

  const sortedSessions = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  sortedSessions.forEach(session => {
    const report = reports.find(r => r.sessionId === session.id)
    
    // Status Logic
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
      tags: report && report.tags ? report.tags.join(', ') : '—'
    })
  })

  // Styling Sessions Sheet
  wsSessions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  wsSessions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } }
  wsSessions.eachRow((row, rowNumber) => {
    row.alignment = { wrapText: true, vertical: 'top' }
    if (rowNumber % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
    }
  })

  // Export File
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `Dossier_Client_${client.firstName}_${client.lastName}_${todayIso()}.xlsx`
  saveAs(blob, fileName)
}

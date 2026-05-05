import { emitAuditLog } from '../lib/auditLog'
import { buildAndDownloadXlsx } from '../lib/xlsxExport'

/**
 * Export confirmed, watermarked XLSX dossier for a client.
 *
 * Call this AFTER the user has confirmed in ExportConfirmModal.
 *
 * @param {object} client
 * @param {Array}  sessions
 * @param {Array}  reports
 * @param {Function} formatDate
 * @param {Function} getPhaseLabel
 * @param {object} opts
 * @param {string} opts.therapistEmail
 * @param {string} opts.therapistId
 * @param {string|null} opts.password
 */
export async function exportClientDossierExcel(client, sessions, reports, formatDate, getPhaseLabel, opts = {}) {
  await buildAndDownloadXlsx(client, sessions, reports, formatDate, getPhaseLabel, opts)

  await emitAuditLog({
    entity: 'client',
    entity_id: client.id,
    action: 'export_client_dossier',
    metadata: {
      therapist_email: opts.therapistEmail || null,
      password_protected: !!(opts.password),
    },
  })
}

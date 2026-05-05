import { supabase } from '../lib/supabase.js'

// =============================================================================
// audioService.js — session audio upload, signed URL, and deletion
//
// All three operations emit an access_log row via the logAccess helper.
// Upload requires explicit consent confirmation (consentGranted === true).
//
// Bucket: audio_recordings (private, see 20260422103300_audio_bucket.sql)
// Path convention: {user_id}/{client_id}/{session_id}/{filename}
//
// French UI strings are used for user-facing errors and consent messages.
// =============================================================================

/**
 * Emit an access_log row for a sensitive operation.
 * Uses service_role insert path — on the client this falls through to the
 * authenticated user's insert (RLS on access_log allows service_role only;
 * in production this should be called from a server-side function/edge function).
 *
 * Failures are logged to console but do not throw — the primary operation
 * should not be blocked by an audit write failure.
 *
 * @param {string} entity      - e.g. 'audio'
 * @param {string} entity_id   - UUID of the session
 * @param {string} action      - e.g. 'upload_audio', 'read_audio', 'delete_audio'
 */
async function logAccess(entity, entity_id, action) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('access_log')
    .insert({
      user_id: user.id,
      entity,
      entity_id,
      action,
    })

  if (error) {
    // Non-fatal — audit trail failure should not block the primary operation
    console.warn('[audioService] access_log write failed:', error.message)
  }
}

/**
 * Build the storage path for a session audio file.
 * Path: {user_id}/{client_id}/{session_id}/{filename}
 *
 * @param {string} userId
 * @param {string} clientId
 * @param {string} sessionId
 * @param {string} filename
 * @returns {string}
 */
function buildStoragePath(userId, clientId, sessionId, filename) {
  // Sanitise filename: strip directory traversal attempts
  const safeName = filename.replace(/[/\\]/g, '_')
  return `${userId}/${clientId}/${sessionId}/${safeName}`
}

/**
 * Upload a session audio recording.
 *
 * Rejects if consentGranted !== true — consent is a hard prerequisite for
 * audio recording under RGPD Art. 9 (données sensibles).
 *
 * On success:
 *   - Uploads the file to the audio_recordings bucket
 *   - Stores the storage path in sessions.audio_file (encrypted)
 *   - Records consent timestamp in sessions.audio_consent_granted_at
 *   - Emits an access_log row with action='upload_audio'
 *
 * @param {File} file                     - the audio File object
 * @param {{ clientId: string, sessionId: string, consentGranted: boolean }} opts
 * @returns {Promise<{ path: string, session: object }>}
 * @throws {Error} if consentGranted is not true, or upload fails
 */
export async function uploadAudio(file, { clientId, sessionId, consentGranted }) {
  // ── Consent check (hard gate) ─────────────────────────────────────────────
  if (consentGranted !== true) {
    throw new Error(
      'Consentement requis : le client doit avoir donné son accord explicite ' +
      'avant l\'enregistrement audio. L\'enregistrement n\'a pas été effectué.'
    )
  }

  if (!file || !(file instanceof File)) {
    throw new Error('Fichier audio invalide.')
  }

  if (!clientId || !sessionId) {
    throw new Error('clientId et sessionId sont requis pour l\'enregistrement audio.')
  }

  // ── Get current user ──────────────────────────────────────────────────────
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    throw new Error('Utilisateur non authentifié.')
  }

  const storagePath = buildStoragePath(user.id, clientId, sessionId, file.name)

  // ── Upload to storage ─────────────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from('audio_recordings')
    .upload(storagePath, file, {
      upsert: false,           // never silently overwrite an existing recording
      contentType: file.type,
    })

  if (uploadError) {
    throw new Error(`Échec de l'enregistrement audio : ${uploadError.message}`)
  }

  // ── Update session: store path + consent timestamp ───────────────────────
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .update({
      audio_file: storagePath,
      audio_consent_granted_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (sessionError) {
    // Upload succeeded but session update failed — log and surface
    console.error('[audioService] session update failed after upload:', sessionError.message)
    throw new Error(
      `Fichier audio téléchargé mais mise à jour de la séance échouée : ${sessionError.message}`
    )
  }

  // ── Emit access log ───────────────────────────────────────────────────────
  await logAccess('audio', sessionId, 'upload_audio')

  return { path: storagePath, session }
}

/**
 * Generate a signed URL for a session's audio recording.
 *
 * Signed URLs expire in 5 minutes (300 seconds) — sufficient for playback
 * initiation but limits exposure if the URL leaks.
 *
 * Emits an access_log row with action='read_audio'.
 *
 * @param {string} sessionId
 * @returns {Promise<string>} signed URL
 * @throws {Error} if the session has no audio or URL generation fails
 */
export async function getSignedAudioUrl(sessionId) {
  if (!sessionId) throw new Error('sessionId requis.')

  // Retrieve the encrypted audio_file path from the session
  // Use sessions_decrypted view if available (pgsodium TCE), fall back to base table
  const { data: session, error: sessionError } = await supabase
    .from('sessions_decrypted')
    .select('audio_file')
    .eq('id', sessionId)
    .single()
    .catch(async () => {
      // View may not exist yet on environments without pgsodium — fall back
      return supabase
        .from('sessions')
        .select('audio_file')
        .eq('id', sessionId)
        .single()
    })

  if (sessionError) {
    throw new Error(`Impossible de récupérer la séance : ${sessionError.message}`)
  }

  if (!session?.audio_file) {
    throw new Error('Aucun enregistrement audio associé à cette séance.')
  }

  // ── Generate signed URL (5 minute expiry) ─────────────────────────────────
  const { data: signedData, error: signedError } = await supabase.storage
    .from('audio_recordings')
    .createSignedUrl(session.audio_file, 300)  // 300 seconds = 5 minutes

  if (signedError) {
    throw new Error(`Impossible de générer l'URL signée : ${signedError.message}`)
  }

  // ── Emit access log ───────────────────────────────────────────────────────
  await logAccess('audio', sessionId, 'read_audio')

  return signedData.signedUrl
}

/**
 * Delete a session's audio recording from storage.
 *
 * Removes the object from the audio_recordings bucket and clears the
 * audio_file and audio_consent_granted_at fields on the session row.
 *
 * Emits an access_log row with action='delete_audio'.
 *
 * @param {string} sessionId
 * @returns {Promise<void>}
 * @throws {Error} if deletion fails
 */
export async function deleteAudio(sessionId) {
  if (!sessionId) throw new Error('sessionId requis.')

  // Retrieve path (try decrypted view, fall back to base table)
  const { data: session, error: sessionError } = await supabase
    .from('sessions_decrypted')
    .select('audio_file')
    .eq('id', sessionId)
    .single()
    .catch(async () => {
      return supabase
        .from('sessions')
        .select('audio_file')
        .eq('id', sessionId)
        .single()
    })

  if (sessionError) {
    throw new Error(`Impossible de récupérer la séance : ${sessionError.message}`)
  }

  if (!session?.audio_file) {
    // Nothing to delete — idempotent
    return
  }

  // ── Remove from storage ───────────────────────────────────────────────────
  const { error: removeError } = await supabase.storage
    .from('audio_recordings')
    .remove([session.audio_file])

  if (removeError) {
    throw new Error(`Échec de la suppression de l'enregistrement : ${removeError.message}`)
  }

  // ── Clear session fields ──────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('sessions')
    .update({
      audio_file: null,
      audio_consent_granted_at: null,
    })
    .eq('id', sessionId)

  if (updateError) {
    console.error('[audioService] session clear failed after storage delete:', updateError.message)
    // Non-fatal for audit purposes — file is already deleted from storage
  }

  // ── Emit access log ───────────────────────────────────────────────────────
  await logAccess('audio', sessionId, 'delete_audio')
}

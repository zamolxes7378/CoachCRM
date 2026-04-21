import { supabase } from './supabase.js'

export async function emitAuditLog({ entity, entity_id, action, metadata = {} }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_log').insert({
      user_id: user?.id ?? null,
      entity,
      entity_id: entity_id ?? null,
      action,
      metadata,
    })
  } catch {
    // silently ignore — audit log must never throw
  }
}

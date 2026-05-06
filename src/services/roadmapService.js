/**
 * roadmapService.js
 * CRUD operations for the admin-only roadmap_items table.
 * All rows are protected by RLS — only admin role can read/write.
 */

import { supabase } from '../lib/supabase.js'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getRoadmapItems() {
  const { data, error } = await supabase
    .from('roadmap_items')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getRoadmapItems failed: ${error.message}`)
  return data || []
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createRoadmapItem(item) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('roadmap_items')
    .insert({ ...item, user_id: user.id })
    .select()
    .single()
  if (error) throw new Error(`createRoadmapItem failed: ${error.message}`)
  return data
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateRoadmapItem(id, updates) {
  const { data, error } = await supabase
    .from('roadmap_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`updateRoadmapItem failed: ${error.message}`)
  return data
}

// ─── Reorder (batch update sort_order) ────────────────────────────────────────

export async function reorderRoadmapItems(orderedIds) {
  // Update sort_order for each item based on its position in the array
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('roadmap_items')
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq('id', id)
  )
  await Promise.all(updates)
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteRoadmapItem(id) {
  const { error } = await supabase
    .from('roadmap_items')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`deleteRoadmapItem failed: ${error.message}`)
  return true
}

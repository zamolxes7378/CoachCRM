/**
 * Pure helpers for optimistic local-state updates.
 * All functions are side-effect free and return a new array.
 */

/**
 * Replace the item matching `id` with `updatedRow`.
 * If no item matches, the list is returned unchanged.
 */
export function applyUpdate(list, id, updatedRow) {
  return list.map(item => (item.id === id ? updatedRow : item))
}

/**
 * Remove the item matching `id` from the list.
 */
export function applyDelete(list, id) {
  return list.filter(item => item.id !== id)
}

/**
 * Remove all items whose id is in `ids`.
 */
export function applyDeleteMany(list, ids) {
  const idSet = new Set(ids)
  return list.filter(item => !idSet.has(item.id))
}

/**
 * Prepend a new row to the list (most-recent-first order).
 */
export function applyInsert(list, row) {
  return [row, ...list]
}

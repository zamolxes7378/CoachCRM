/**
 * RoadmapPage.jsx — Admin-only product roadmap with 3 views (Kanban, List, Timeline)
 * Inspired by Monday.com — drag-and-drop, priority badges, progress indicators
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { usePageTitle } from '../../hooks/usePageTitle'
import {
  getRoadmapItems, createRoadmapItem, updateRoadmapItem,
  deleteRoadmapItem, reorderRoadmapItems
} from '../../services/roadmapService'
import {
  Map, LayoutGrid, List, Clock, Plus, GripVertical, Edit3, Trash2,
  ChevronDown, ChevronUp, X, Check, AlertTriangle, Zap, Bug, Palette,
  Shield, Server, Target, Calendar
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  { key: 'backlog', label: 'Backlog', color: '#A0AEC0', bg: '#EDF2F7' },
  { key: 'in_progress', label: 'En cours', color: '#D69E2E', bg: '#FEFEF2' },
  { key: 'done', label: 'Terminé', color: '#38A169', bg: '#F0FFF4' },
]
const PRIORITIES = [
  { key: 'low', label: 'Basse', color: '#A0AEC0', icon: ChevronDown },
  { key: 'medium', label: 'Moyenne', color: '#D69E2E', icon: Target },
  { key: 'high', label: 'Haute', color: '#DD6B20', icon: ChevronUp },
  { key: 'critical', label: 'Critique', color: '#E53E3E', icon: AlertTriangle },
]
const CATEGORIES = [
  { key: 'feature', label: 'Fonctionnalité', color: '#553C9A', icon: Zap },
  { key: 'bug', label: 'Bug', color: '#E53E3E', icon: Bug },
  { key: 'design', label: 'Design', color: '#D69E2E', icon: Palette },
  { key: 'legal', label: 'Légal / RGPD', color: '#2B6CB0', icon: Shield },
  { key: 'infrastructure', label: 'Infrastructure', color: '#718096', icon: Server },
]
const VIEWS = [
  { key: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { key: 'list', label: 'Liste', icon: List },
  { key: 'timeline', label: 'Timeline', icon: Clock },
]
const getPriority = k => PRIORITIES.find(p => p.key === k) || PRIORITIES[1]
const getCategory = k => CATEGORIES.find(c => c.key === k) || CATEGORIES[0]
const getStatus = k => STATUSES.find(s => s.key === k) || STATUSES[0]

// ─── Priority Badge ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = getPriority(priority)
  const Icon = p.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: p.color, background: p.color + '18', padding: '2px 8px', borderRadius: 12 }}>
      <Icon size={12} /> {p.label}
    </span>
  )
}

// ─── Category Badge ──────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const c = getCategory(category)
  const Icon = c.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 500, color: c.color, background: c.color + '12', padding: '2px 8px', borderRadius: 12 }}>
      <Icon size={12} /> {c.label}
    </span>
  )
}

// ─── Item Form (Create / Edit) ───────────────────────────────────────────────
function ItemForm({ item, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    status: item?.status || 'backlog',
    priority: item?.priority || 'medium',
    category: item?.category || 'feature',
    milestone: item?.milestone || '',
    due_date: item?.due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const fieldStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }

  return (
    <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card, white)', borderRadius: 12, border: '1px solid var(--border)', padding: 20, marginBottom: 20 }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 16px' }}>{item ? 'Modifier l\'élément' : 'Nouvel élément'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Titre *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Ex: Intégration Google Calendar" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Statut</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={fieldStyle}>
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priorité</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)} style={fieldStyle}>
            {PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Catégorie</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={fieldStyle}>
            {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Milestone</label>
          <input value={form.milestone} onChange={e => set('milestone', e.target.value)} placeholder="Ex: Q3 2026" style={fieldStyle} />
        </div>
        <div>
          <label style={labelStyle}>Échéance</label>
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={fieldStyle} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Détails, contexte, critères d'acceptation…" style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Annuler</button>
        <button type="submit" disabled={saving || !form.title.trim()} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>{saving ? 'Enregistrement…' : item ? 'Mettre à jour' : 'Créer'}</button>
      </div>
    </form>
  )
}

// ─── Card (used in Kanban + List) ────────────────────────────────────────────
function ItemCard({ item, onCardClick, dragHandlers, compact }) {
  return (
    <div
      {...(dragHandlers || {})}
      onClick={e => { if (!e.defaultPrevented && onCardClick) onCardClick(item) }}
      style={{
        background: 'white', borderRadius: 10, border: '1px solid var(--border)',
        padding: compact ? '10px 14px' : '14px 16px', marginBottom: 8,
        boxShadow: 'var(--shadow-sm)', transition: 'box-shadow 0.2s, transform 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {dragHandlers && <GripVertical size={16} style={{ color: 'var(--text-tertiary)', marginTop: 2, flexShrink: 0, cursor: 'grab' }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PriorityBadge priority={item.priority} />
            <CategoryBadge category={item.category} />
            {item.milestone && <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', background: 'var(--primary-50)', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>{item.milestone}</span>}
            {item.due_date && <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Calendar size={11} />{new Date(item.due_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-tertiary)', borderRadius: 6, display: 'inline-flex' }

// ─── Detail Drawer (right side panel) ────────────────────────────────────────
function DetailDrawer({ item, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({
    title: item.title, description: item.description || '', status: item.status,
    priority: item.priority, category: item.category, milestone: item.milestone || '', due_date: item.due_date || '',
  })
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try { await onSave(item.id, form); onClose() } finally { setSaving(false) }
  }

  const fieldStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit' }
  const labelStyle = { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 14 }
  const st = getStatus(item.status)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 999, transition: 'opacity 0.2s' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 840, maxWidth: '90vw',
        background: 'white', zIndex: 1000, boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s ease-out',
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.color }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: st.color }}>{st.label}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}><X size={20} /></button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 20px' }}>
          <label style={labelStyle}>Titre</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} style={fieldStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={labelStyle}>Statut</label><select value={form.status} onChange={e => set('status', e.target.value)} style={fieldStyle}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
            <div><label style={labelStyle}>Priorité</label><select value={form.priority} onChange={e => set('priority', e.target.value)} style={fieldStyle}>{PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
            <div><label style={labelStyle}>Catégorie</label><select value={form.category} onChange={e => set('category', e.target.value)} style={fieldStyle}>{CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
            <div><label style={labelStyle}>Milestone</label><input value={form.milestone} onChange={e => set('milestone', e.target.value)} placeholder="Q3 2026" style={fieldStyle} /></div>
          </div>
          <label style={labelStyle}>Échéance</label>
          <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} style={fieldStyle} />
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={5} placeholder="Détails, contexte, critères d'acceptation…" style={{ ...fieldStyle, resize: 'vertical' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 16 }}>Créé le {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · Modifié le {new Date(item.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {!confirmDel
              ? <button onClick={() => setConfirmDel(true)} style={{ background: 'none', border: 'none', color: '#E53E3E', fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Trash2 size={14} /> Supprimer</button>
              : <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#E53E3E', fontWeight: 600 }}>Confirmer ?</span>
                  <button onClick={() => { onDelete(item.id); onClose() }} style={{ background: '#E53E3E', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>Oui</button>
                  <button onClick={() => setConfirmDel(false)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}>Non</button>
                </div>
            }
          </div>
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ items, milestone }) {
  const filtered = milestone ? items.filter(i => i.milestone === milestone) : items
  const total = filtered.length
  if (!total) return null
  const done = filtered.filter(i => i.status === 'done').length
  const inProg = filtered.filter(i => i.status === 'in_progress').length
  const pct = Math.round((done / total) * 100)
  return (
    <div style={{ marginBottom: 16 }}>
      {milestone && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{milestone} — {pct}% complété ({done}/{total})</div>}
      {!milestone && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Progression globale — {pct}% ({done}/{total} items)</div>}
      <div style={{ height: 8, borderRadius: 8, background: '#EDF2F7', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${(done / total) * 100}%`, background: '#38A169', transition: 'width 0.4s' }} />
        <div style={{ width: `${(inProg / total) * 100}%`, background: '#3182CE', transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

// ─── KANBAN VIEW ─────────────────────────────────────────────────────────────
function KanbanView({ items, onCardClick, onDelete, onStatusChange, onReorder }) {
  const [dragItem, setDragItem] = useState(null)
  const [dropTarget, setDropTarget] = useState(null) // { status, index }

  const handleDrop = async (targetStatus, targetIndex) => {
    if (!dragItem) return
    const sameColumn = dragItem.status === targetStatus

    if (sameColumn) {
      // Reorder within the same column
      const colItems = items
        .filter(i => i.status === targetStatus)
        .sort((a, b) => a.sort_order - b.sort_order)
      const oldIdx = colItems.findIndex(i => i.id === dragItem.id)
      if (oldIdx === -1 || oldIdx === targetIndex) { setDragItem(null); setDropTarget(null); return }
      const reordered = [...colItems]
      const [moved] = reordered.splice(oldIdx, 1)
      const insertAt = targetIndex > oldIdx ? targetIndex - 1 : targetIndex
      reordered.splice(insertAt, 0, moved)
      await onReorder(reordered.map(i => i.id))
    } else {
      // Move to another column + insert at position
      await onStatusChange(dragItem.id, targetStatus)
      // After status change, reorder within the target column
      const colItems = items
        .filter(i => i.status === targetStatus)
        .sort((a, b) => a.sort_order - b.sort_order)
      const newList = [...colItems]
      newList.splice(targetIndex, 0, { ...dragItem, status: targetStatus })
      await onReorder(newList.map(i => i.id))
    }
    setDragItem(null)
    setDropTarget(null)
  }

  const dropZoneStyle = (status, index, isActive) => ({
    height: isActive ? 40 : 10,
    borderRadius: 10,
    background: isActive ? 'var(--primary-50)' : 'transparent',
    border: isActive ? '2px dashed var(--primary-300)' : '2px dashed transparent',
    margin: '4px 0',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    zIndex: isActive ? 10 : 1,
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'flex-start' }}>
      {STATUSES.map(status => {
        const colItems = items.filter(i => i.status === status.key).sort((a, b) => a.sort_order - b.sort_order)
        return (
          <div
            key={status.key}
            onDragOver={e => { e.preventDefault(); if (!dropTarget) setDropTarget({ status: status.key, index: colItems.length }) }}
            style={{ background: status.bg, borderRadius: 12, padding: 12, minHeight: 200, transition: 'background 0.2s' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '0 4px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: status.color }} />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{status.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 600, background: 'white', padding: '1px 8px', borderRadius: 10 }}>{colItems.length}</span>
            </div>
            {/* Drop zone at the top */}
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ status: status.key, index: 0 }) }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => { e.preventDefault(); handleDrop(status.key, 0) }}
              style={dropZoneStyle(status.key, 0, dropTarget?.status === status.key && dropTarget?.index === 0 && dragItem)}
            />
            {colItems.map((item, idx) => (
              <div key={item.id}>
                <ItemCard
                  item={item} compact
                  onCardClick={onCardClick} onDelete={onDelete}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: () => setDragItem(item),
                    onDragEnd: () => { setDragItem(null); setDropTarget(null) },
                  }}
                />
                {/* Drop zone after each card */}
                <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropTarget({ status: status.key, index: idx + 1 }) }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={e => { e.preventDefault(); handleDrop(status.key, idx + 1) }}
                  style={dropZoneStyle(status.key, idx + 1, dropTarget?.status === status.key && dropTarget?.index === idx + 1 && dragItem)}
                />
              </div>
            ))}
            {/* Empty column drop target enhancement */}
            {colItems.length === 0 && !dragItem && (
              <div style={{ height: 100, border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                Vide
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── LIST VIEW (grouped by milestone) ────────────────────────────────────────
function ListView({ items, onCardClick, onDelete, onStatusChange }) {
  const milestones = [...new Set(items.map(i => i.milestone || 'Sans milestone'))].sort()
  return (
    <div>
      {milestones.map(ms => {
        const group = items.filter(i => (i.milestone || 'Sans milestone') === ms).sort((a, b) => {
          const po = { critical: 0, high: 1, medium: 2, low: 3 }
          return (po[a.priority] ?? 2) - (po[b.priority] ?? 2) || a.sort_order - b.sort_order
        })
        return (
          <div key={ms} style={{ marginBottom: 24 }}>
            <ProgressBar items={items} milestone={ms === 'Sans milestone' ? null : ms} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-700)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} style={{ color: 'var(--accent-main)' }} /> {ms}
            </h3>
            {group.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: getStatus(item.status).color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <ItemCard item={item} onCardClick={onCardClick} onDelete={onDelete} />
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─── TIMELINE VIEW ───────────────────────────────────────────────────────────
function TimelineView({ items, onCardClick, onDelete, onStatusChange }) {
  const sorted = [...items].sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)
  // TimelineView receives onCardClick too
  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      <div style={{ position: 'absolute', left: 12, top: 0, bottom: 0, width: 2, background: 'var(--primary-200)' }} />
      {sorted.map((item, i) => (
        <div key={item.id} style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ position: 'absolute', left: -22, top: 14, width: 12, height: 12, borderRadius: '50%', background: getStatus(item.status).color, border: '2px solid white', boxShadow: '0 0 0 2px ' + getStatus(item.status).color + '40' }} />
          <ItemCard item={item} onCardClick={onCardClick} onDelete={onDelete} />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function RoadmapPage() {
  usePageTitle('Roadmap Produit')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('kanban')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await getRoadmapItems()); setError(null) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (form) => {
    const maxOrder = items.reduce((m, i) => Math.max(m, i.sort_order), -1)
    await createRoadmapItem({ ...form, sort_order: maxOrder + 1 })
    setShowForm(false)
    await load()
  }

  const handleUpdate = async (form) => {
    await updateRoadmapItem(editItem.id, form)
    setEditItem(null)
    await load()
  }

  const handleDelete = async (id) => {
    await deleteRoadmapItem(id)
    await load()
  }

  const handleStatusChange = async (id, newStatus) => {
    await updateRoadmapItem(id, { status: newStatus })
    await load()
  }

  const handleMove = async (id, direction) => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(i => i.id === id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const ids = sorted.map(i => i.id)
    ;[ids[idx], ids[swapIdx]] = [ids[swapIdx], ids[idx]]
    await reorderRoadmapItems(ids)
    await load()
  }

  const handleCardClick = (item) => { setEditItem(item); setShowForm(false) }

  const handleReorder = async (orderedIds) => {
    await reorderRoadmapItems(orderedIds)
    await load()
  }

  const handleDrawerSave = async (id, form) => {
    await updateRoadmapItem(id, form)
    await load()
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Map size={24} style={{ color: 'var(--accent-main)' }} /> Roadmap Produit
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View switcher */}
          <div style={{ display: 'flex', background: 'var(--primary-50)', borderRadius: 10, padding: 3, gap: 2 }}>
            {VIEWS.map(v => {
              const Icon = v.icon
              const active = view === v.key
              return (
                <button key={v.key} onClick={() => setView(v.key)} title={v.label}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: active ? 'white' : 'transparent', color: active ? 'var(--primary-700)' : 'var(--text-tertiary)', boxShadow: active ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
                  <Icon size={14} /> {v.label}
                </button>
              )
            })}
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(v => !v); setEditItem(null) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--error)', marginBottom: 16, padding: 12, background: '#FEF2F2', borderRadius: 8, fontSize: '0.85rem' }}>{error}</div>}

      <ProgressBar items={items} />

      {showForm && <ItemForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}><div className="spinner" style={{ margin: '0 auto 12px' }} />Chargement…</div>}

      {!loading && items.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '64px 32px', background: 'var(--primary-50)', borderRadius: 12, border: '1px dashed var(--primary-200)' }}>
          <Map size={48} style={{ color: 'var(--primary-300)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 600, color: 'var(--primary-700)' }}>Votre roadmap est vide</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cliquez sur « Ajouter » pour créer votre premier élément.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          {view === 'kanban' && <KanbanView items={items} onCardClick={handleCardClick} onDelete={handleDelete} onStatusChange={handleStatusChange} onReorder={handleReorder} />}
          {view === 'list' && <ListView items={items} onCardClick={handleCardClick} onDelete={handleDelete} onStatusChange={handleStatusChange} />}
          {view === 'timeline' && <TimelineView items={items} onCardClick={handleCardClick} onDelete={handleDelete} onStatusChange={handleStatusChange} />}
          {editItem && <DetailDrawer item={editItem} onClose={() => setEditItem(null)} onSave={handleDrawerSave} onDelete={handleDelete} />}
        </>
      )}
    </div>
  )
}

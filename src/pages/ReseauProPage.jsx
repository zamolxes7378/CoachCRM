import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Phone, Mail, Calendar, Users, Search, Plus, X, Edit3, Trash2, Award, MapPin, Globe, Building2, FileText, Save, ChevronDown, ChevronUp, ArrowUpAZ, ArrowDownUp, LayoutGrid, List, ChevronsUpDown, UserPlus, Square, CheckSquare, Trash } from 'lucide-react'
// professionals removed — now from DataContext
import { useData } from '../context/DataContext'
import { useConfirm } from '../context/ConfirmContext'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useEscapeKey } from '../hooks/useEscapeKey'

// Field component defined OUTSIDE to avoid re-creation on each render
function ProField({ icon: Icon, label, field, placeholder, type, editForm, setEditForm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <label style={{ fontSize: '0.643rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {Icon && <Icon size={10} />} {label}
      </label>
      {type === 'textarea' ? (
        <textarea
          className="input"
          placeholder={placeholder || ''}
          value={editForm[field] || ''}
          onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
          rows={2}
          style={{ fontSize: '0.786rem', resize: 'vertical', minHeight: 36 }}
        />
      ) : (
        <input
          className="input"
          placeholder={placeholder || ''}
          value={editForm[field] || ''}
          onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
          style={{ fontSize: '0.786rem' }}
        />
      )}
    </div>
  )
}

export default function ReseauProPage() {
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [sortMode, setSortMode] = useState('none')
  const [viewMode, setViewMode] = useState('cards')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({})
  const [selected, setSelected] = useState(new Set())
  const [, forceUpdate] = useState(0)

  const navigate = useNavigate()
  const confirm = useConfirm()
  const createModalRef = useRef(null)
  useFocusTrap(createModalRef, showCreateModal)
  useEscapeKey(() => setShowCreateModal(false), showCreateModal)

  const { clients, professionals, createProfessional, updateProfessional: updatePro, deleteProfessionals, formatDate } = useData()

  let filtered = professionals.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.note || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.specialty || '').toLowerCase().includes(q)
  })

  if (sortMode === 'alpha-asc') {
    filtered = [...filtered].sort((a, b) => a.lastName.localeCompare(b.lastName, 'fr'))
  } else if (sortMode === 'alpha-desc') {
    filtered = [...filtered].sort((a, b) => b.lastName.localeCompare(a.lastName, 'fr'))
  } else if (sortMode === 'recent') {
    filtered = [...filtered].sort((a, b) => {
      const aDate = (a.referrals || []).length ? a.referrals[a.referrals.length - 1].date : a.createdAt || ''
      const bDate = (b.referrals || []).length ? b.referrals[b.referrals.length - 1].date : b.createdAt || ''
      return bDate.localeCompare(aDate)
    })
  } else if (sortMode === 'referrals-desc') {
    filtered = [...filtered].sort((a, b) => (b.referrals || []).length - (a.referrals || []).length)
  } else if (sortMode === 'referrals-asc') {
    filtered = [...filtered].sort((a, b) => (a.referrals || []).length - (b.referrals || []).length)
  }

  const startEdit = (pro) => {
    setEditingId(pro.id)
    setEditForm({ ...pro })
    setExpandedIds(prev => new Set(prev).add(pro.id))
  }

  const saveEdit = async () => {
    const { id, ...updates } = editForm
    await updatePro(editingId, updates)
    setEditingId(null)
    setEditForm({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const createNewPro = async () => {
    if (!(createForm.lastName || '').trim()) return
    await createProfessional({
      firstName: createForm.firstName || '',
      lastName: createForm.lastName || '',
      email: createForm.email || '',
      phone: createForm.phone || '',
      company: createForm.company || '',
      specialty: createForm.specialty || '',
      address: createForm.address || '',
      website: createForm.website || '',
      note: createForm.note || '',
      createdAt: new Date().toISOString().split('T')[0],
      referrals: []
    })
    setShowCreateModal(false)
    setCreateForm({})
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(p => p.id)))
  }

  const handleDeleteSelected = async () => {
    const ok = await confirm(
      `Supprimer ${selected.size} partenaire(s) professionnel(s) ?`,
      { title: 'Confirmation de suppression', variant: 'danger' }
    )
    if (ok) {
      await deleteProfessionals(Array.from(selected))
      setSelected(new Set())
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.286rem', fontWeight: 700, margin: 0 }}>Réseau Pro</h1>
          <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', margin: 0 }}>
            {professionals.length} partenaire{professionals.length > 1 ? 's' : ''} professionnel{professionals.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setCreateForm({}) }}
          className="btn btn-accent"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', padding: '8px 16px' }}
        >
          <Plus size={16} /> Nouveau Partenaire Pro
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div className="search-input" style={{ flex: 1 }}>
          <Search />
          <input
            className="input"
            placeholder="Rechercher un professionnel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`btn ${sortMode === 'alpha-asc' || sortMode === 'alpha-desc' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'none' || sortMode === 'recent' ? 'alpha-asc' : sortMode === 'alpha-asc' ? 'alpha-desc' : 'none')}
          title="Trier par nom"
        >
          <ArrowUpAZ size={18} /> {sortMode === 'alpha-desc' ? 'Z→A' : 'A→Z'}
        </button>
        <button
          className={`btn ${sortMode === 'recent' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'recent' ? 'none' : 'recent')}
          title="Trier par plus récent"
        >
          <ArrowDownUp size={18} /> Plus récent
        </button>
        <button
          className={`btn ${sortMode === 'referrals-desc' || sortMode === 'referrals-asc' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'none' || sortMode !== 'referrals-desc' && sortMode !== 'referrals-asc' ? 'referrals-desc' : sortMode === 'referrals-desc' ? 'referrals-asc' : 'none')}
          title="Trier par nombre de recommandations"
        >
          <Award size={18} /> {sortMode === 'referrals-asc' ? '↑' : '↓'} Recos
        </button>
        <span style={{ width: 1, height: 28, background: 'var(--border-light)', margin: '0 2px', alignSelf: 'center' }} />
        <button
          className={`btn ${viewMode === 'cards' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('cards')}
          title="Vue cartes"
          aria-label="Vue cartes"
          style={{ padding: '6px 8px' }}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('list')}
          title="Vue liste"
          aria-label="Vue liste"
          style={{ padding: '6px 8px' }}
        >
          <List size={18} />
        </button>
        <span style={{ width: 1, height: 28, background: 'var(--border-light)', margin: '0 2px', alignSelf: 'center' }} />
        <button
          className={`btn ${expandedIds.size === filtered.length && filtered.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            if (expandedIds.size === filtered.length && filtered.length > 0) {
              setExpandedIds(new Set())
            } else {
              setExpandedIds(new Set(filtered.map(p => p.id)))
            }
          }}
          title={expandedIds.size === filtered.length && filtered.length > 0 ? 'Tout replier' : 'Tout déplier'}
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ChevronsUpDown size={18} /> {expandedIds.size === filtered.length && filtered.length > 0 ? 'Replier' : 'Déplier tout'}
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 'var(--space-xl)',
          color: 'var(--text-tertiary)', fontSize: '0.857rem'
        }}>
          <Briefcase size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p>Aucun partenaire professionnel trouvé.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ===== CARD VIEW ===== */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {filtered.map(pro => {
            const isEditing = editingId === pro.id
            return (
              <div key={pro.id} style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                padding: 'var(--space-md)', transition: 'box-shadow 0.2s, transform 0.15s',
                cursor: isEditing ? 'default' : 'pointer', position: 'relative'
              }}
                onMouseEnter={e => { if (!isEditing) { e.currentTarget.style.boxShadow = '0 6px 20px rgba(139,92,246,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
                onClick={() => { if (!isEditing) setExpandedIds(prev => { const next = new Set(prev); if (next.has(pro.id)) next.delete(pro.id); else next.add(pro.id); return next }) }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.857rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {(pro.firstName || '')[0]}{(pro.lastName || '')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.929rem', color: 'var(--text-primary)' }}>
                      {pro.firstName} {pro.lastName}
                    </div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pro.specialty || pro.company || pro.note || 'Professionnel'}
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(pro) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title="Modifier"
                      aria-label="Modifier ce partenaire"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>

                {/* Quick info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {pro.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.714rem', color: 'var(--text-secondary)' }}>
                      <Mail size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> {pro.email}
                    </div>
                  )}
                  {pro.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.714rem', color: 'var(--text-secondary)' }}>
                      <Phone size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> {pro.phone}
                    </div>
                  )}
                  {pro.company && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.714rem', color: 'var(--text-secondary)' }}>
                      <Building2 size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} /> {pro.company}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                    background: '#F5F0FF', color: '#8B5CF6',
                    fontSize: '0.643rem', fontWeight: 600
                  }}>
                    <Award size={11} />
                    {(pro.referrals || []).length} reco{(pro.referrals || []).length > 1 ? 's' : ''}
                  </div>
                  <span style={{ fontSize: '0.571rem', color: 'var(--text-tertiary)' }}>
                    {formatDate(pro.createdAt)}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/clients?newClient=1&proRef=${encodeURIComponent(JSON.stringify({ proId: pro.id, firstName: pro.firstName, lastName: pro.lastName }))}`) }}
                    style={{
                      background: 'none', border: '1px dashed #C4B5FD', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', color: '#8B5CF6', padding: '3px 8px',
                      fontSize: '0.643rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F5F0FF'; e.currentTarget.style.borderColor = '#8B5CF6' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#C4B5FD' }}
                    title={`Créer un client recommandé par ${pro.firstName} ${pro.lastName}`}
                  >
                    <UserPlus size={11} /> + Client
                  </button>
                </div>

                {/* Expanded referrals */}
                {expandedIds.has(pro.id) && !isEditing && (pro.referrals || []).length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.571rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8B5CF6', marginBottom: 6 }}>
                      Clients recommandés
                    </div>
                    {(pro.referrals || []).map((r, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', fontSize: '0.714rem' }}>
                        <Users size={10} color="#8B5CF6" />
                        <span
                          onClick={e => { e.stopPropagation(); r.clientId && navigate(`/clients/${r.clientId}`) }}
                          style={{ fontWeight: 500, color: '#8B5CF6', cursor: r.clientId ? 'pointer' : 'default' }}
                          onMouseEnter={e => { if (r.clientId) e.currentTarget.style.textDecoration = 'underline' }}
                          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                        >{r.clientName}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline edit (same form) */}
                {isEditing && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #C4B5FD' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <ProField icon={null} label="Prénom" field="firstName" placeholder="Prénom" editForm={editForm} setEditForm={setEditForm} />
                      <ProField icon={null} label="Nom" field="lastName" placeholder="Nom *" editForm={editForm} setEditForm={setEditForm} />
                      <ProField icon={Building2} label="Société" field="company" placeholder="Cabinet..." editForm={editForm} setEditForm={setEditForm} />
                      <ProField icon={Briefcase} label="Spécialité" field="specialty" placeholder="Psychiatre..." editForm={editForm} setEditForm={setEditForm} />
                      <ProField icon={Mail} label="Email" field="email" placeholder="email@..." editForm={editForm} setEditForm={setEditForm} />
                      <ProField icon={Phone} label="Téléphone" field="phone" placeholder="01 23..." editForm={editForm} setEditForm={setEditForm} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn btn-ghost" onClick={cancelEdit} style={{ fontSize: '0.714rem', padding: '5px 12px' }}>Annuler</button>
                      <button className="btn btn-accent" onClick={saveEdit} disabled={!editForm.lastName?.trim()}
                        style={{ fontSize: '0.714rem', padding: '5px 12px', opacity: !editForm.lastName?.trim() ? 0.5 : 1 }}>
                        <Save size={12} /> Enregistrer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
          <table className="table-standard">
            <caption className="sr-only">Partenaires professionnels du réseau</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: 44 }}>
                  <button
                    onClick={toggleSelectAll}
                    aria-label={selected.size === filtered.length && filtered.length > 0 ? 'Tout désélectionner' : 'Tout sélectionner'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: selected.size === filtered.length && filtered.length > 0 ? 'var(--error)' : 'var(--text-tertiary)' }}
                  >
                    {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th scope="col">Partenaire</th>
                <th scope="col">Spécialité / Société</th>
                <th scope="col" style={{ textAlign: 'center' }}>Recommandations</th>
                <th scope="col">Date d'ajout</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(pro => {
                const isChecked = selected.has(pro.id)
                const isExpanded = expandedIds.has(pro.id)
                const isEditing = editingId === pro.id

                return (
                  <>
                    <tr key={pro.id} style={{
                      background: isChecked ? 'var(--primary-50)' : 'transparent',
                      transition: 'background 0.1s'
                    }}>
                      <td style={{ width: 44 }}>
                        <button
                          onClick={() => toggleSelect(pro.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: isChecked ? 'var(--error)' : 'var(--text-tertiary)' }}
                        >
                          {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </td>
                      <th scope="row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.714rem', fontWeight: 700
                          }}>
                            {(pro.firstName || '')[0]}{(pro.lastName || '')[0]}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pro.firstName} {pro.lastName}</span>
                        </div>
                      </th>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.857rem', color: 'var(--text-secondary)' }}>{pro.specialty || 'Professionnel'}</span>
                          {pro.company && <span style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)' }}>{pro.company}</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                          background: '#F5F0FF', color: '#8B5CF6',
                          fontSize: '0.643rem', fontWeight: 600
                        }}>
                          <Award size={11} />
                          {(pro.referrals || []).length}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.857rem' }}>
                        {formatDate(pro.createdAt)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            onClick={() => setExpandedIds(prev => { const next = new Set(prev); if (next.has(pro.id)) next.delete(pro.id); else next.add(pro.id); return next })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                            title="Détails"
                            aria-label={isExpanded ? 'Réduire les détails' : 'Afficher les détails'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => startEdit(pro)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                            title="Modifier"
                            aria-label="Modifier ce partenaire"
                          >
                            <Edit3 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${pro.id}-details`} style={{ background: '#FDFCFF' }}>
                        <td colSpan={6} style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <ProField icon={null} label="Prénom" field="firstName" placeholder="Prénom" editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={null} label="Nom" field="lastName" placeholder="Nom *" editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={Building2} label="Société" field="company" placeholder="Cabinet..." editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={Briefcase} label="Spécialité" field="specialty" placeholder="Psychiatre..." editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={Mail} label="Email" field="email" placeholder="email@..." editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={Phone} label="Téléphone" field="phone" placeholder="01 23..." editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={Globe} label="Site web" field="website" placeholder="https://..." editForm={editForm} setEditForm={setEditForm} />
                                <ProField icon={MapPin} label="Adresse" field="address" placeholder="Adresse" editForm={editForm} setEditForm={setEditForm} />
                              </div>
                              <ProField icon={FileText} label="Notes" field="note" placeholder="Notes..." type="textarea" editForm={editForm} setEditForm={setEditForm} />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={cancelEdit}>Annuler</button>
                                <button className="btn btn-accent" onClick={saveEdit} disabled={!editForm.lastName?.trim()}
                                  style={{ opacity: !editForm.lastName?.trim() ? 0.5 : 1 }}>
                                  <Save size={14} /> Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)' }}>
                                {pro.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.857rem' }}><Mail size={14} style={{ color: 'var(--text-tertiary)' }} /> {pro.email}</div>}
                                {pro.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.857rem' }}><Phone size={14} style={{ color: 'var(--text-tertiary)' }} /> {pro.phone}</div>}
                                {pro.website && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.857rem' }}><Globe size={14} style={{ color: 'var(--text-tertiary)' }} /> {pro.website}</div>}
                                {pro.address && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.857rem', gridColumn: 'span 3' }}><MapPin size={14} style={{ color: 'var(--text-tertiary)' }} /> {pro.address}</div>}
                              </div>
                              {pro.note && <div style={{ padding: 'var(--space-sm) var(--space-md)', background: '#FAFAFA', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #C4B5FD', fontSize: '0.857rem', color: 'var(--text-secondary)' }}>{pro.note}</div>}
                              
                              <div>
                                <div style={{ fontSize: '0.643rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8B5CF6', marginBottom: 8 }}>Clients recommandés</div>
                                {(pro.referrals || []).length === 0 ? (
                                  <div style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Aucune recommandation.</div>
                                ) : (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {(pro.referrals || []).map((r, idx) => (
                                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 'var(--radius-md)', background: '#F5F0FF', fontSize: '0.786rem' }}>
                                        <Users size={12} color="#8B5CF6" />
                                        <span onClick={() => r.clientId && navigate(`/clients/${r.clientId}`)} style={{ fontWeight: 500, color: '#8B5CF6', cursor: r.clientId ? 'pointer' : 'default' }}>{r.clientName}</span>
                                        <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)' }}>{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => navigate(`/clients?newClient=1&proRef=${encodeURIComponent(JSON.stringify({ proId: pro.id, firstName: pro.firstName, lastName: pro.lastName }))}`)}
                                className="btn btn-ghost"
                                style={{ alignSelf: 'flex-start', color: '#8B5CF6', borderColor: '#C4B5FD', fontSize: '0.786rem' }}
                              >
                                <UserPlus size={14} /> Nouveau client recommandé
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
          background: 'var(--error)', padding: '10px 24px', borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)', color: 'white', zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.786rem', fontWeight: 700
            }}>
              {selected.size}
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.857rem' }}>Sélectionné{selected.size > 1 ? 's' : ''}</span>
          </div>

          <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDeleteSelected}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                fontSize: '0.786rem', fontWeight: 600, borderRadius: 'var(--radius-md)',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Trash2 size={16} /> Supprimer
            </button>
            <button
              onClick={() => setSelected(new Set())}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                fontSize: '0.786rem', fontWeight: 600, borderRadius: 'var(--radius-md)', opacity: 0.8
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Create Professional Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            ref={createModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pro-title"
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', width: 520, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <span id="create-pro-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={20} style={{ color: '#8B5CF6' }} /> Nouveau Partenaire Pro
              </span>
              <button onClick={() => setShowCreateModal(false)} aria-label="Fermer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <ProField icon={null} label="Prénom" field="firstName" placeholder="Prénom" editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={null} label="Nom *" field="lastName" placeholder="Nom" editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={Building2} label="Société" field="company" placeholder="Cabinet..." editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={Briefcase} label="Spécialité" field="specialty" placeholder="Psychiatre..." editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={Mail} label="Email" field="email" placeholder="email@..." editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={Phone} label="Téléphone" field="phone" placeholder="01 23..." editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={Globe} label="Site web" field="website" placeholder="https://..." editForm={createForm} setEditForm={setCreateForm} />
              <ProField icon={MapPin} label="Adresse" field="address" placeholder="Adresse" editForm={createForm} setEditForm={setCreateForm} />
            </div>
            <ProField icon={FileText} label="Notes" field="note" placeholder="Notes sur ce professionnel..." type="textarea" editForm={createForm} setEditForm={setCreateForm} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)} style={{ fontSize: '0.786rem', padding: '6px 14px' }}>Annuler</button>
              <button className="btn btn-accent" onClick={createNewPro} disabled={!(createForm.lastName || '').trim()}
                style={{ fontSize: '0.786rem', padding: '6px 14px', opacity: !(createForm.lastName || '').trim() ? 0.5 : 1 }}>
                <Plus size={13} /> Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

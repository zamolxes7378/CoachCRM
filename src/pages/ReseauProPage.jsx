import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Phone, Mail, Calendar, Users, Search, Plus, X, Edit3, Trash2, Award, MapPin, Globe, Building2, FileText, Save, ChevronDown, ChevronUp, ArrowUpAZ, ArrowDownUp, LayoutGrid, List, ChevronsUpDown, UserPlus } from 'lucide-react'
import { mockProfessionals } from '../data/mockData'
import { useData } from '../context/DataContext'

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
  const [, forceUpdate] = useState(0)

  const navigate = useNavigate()

  const { clients: mockCouples } = useData()

  let filtered = mockProfessionals.filter(p => {
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

  const saveEdit = () => {
    const idx = mockProfessionals.findIndex(p => p.id === editingId)
    if (idx !== -1) {
      const oldPro = mockProfessionals[idx]
      Object.assign(mockProfessionals[idx], editForm)
      const newName = `${editForm.firstName || ''} ${editForm.lastName || ''}`.trim()
      // Sync to all couples that reference this professional
      mockCouples.forEach(c => {
        if (c.externalReferrer && c.externalReferrer.referrerType === 'professionnel') {
          const oldRefName = `${c.externalReferrer.firstName || ''} ${c.externalReferrer.lastName || ''}`.trim()
          const matchName = `${oldPro.firstName || ''} ${oldPro.lastName || ''}`.trim()
          if (oldRefName === matchName) {
            c.externalReferrer.firstName = editForm.firstName || ''
            c.externalReferrer.lastName = editForm.lastName || ''
            c.externalReferrer.email = editForm.email || ''
            c.externalReferrer.phone = editForm.phone || ''
          }
        }
        // Also update proName in clientLinks
        if (c.clientLinks) {
          c.clientLinks.forEach(l => {
            if (l.type === 'parrainage-pro' && l.proId === editingId) {
              l.proName = newName
            }
          })
        }
      })
    }
    setEditingId(null)
    setEditForm({})
    forceUpdate(n => n + 1)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const createNewPro = () => {
    if (!(createForm.lastName || '').trim()) return
    const newPro = {
      id: `pro-${Date.now()}`,
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
    }
    mockProfessionals.push(newPro)
    setShowCreateModal(false)
    setCreateForm({})
    forceUpdate(n => n + 1)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontSize: '1.286rem', fontWeight: 700, margin: 0 }}>Réseau Pro</h1>
          <p style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', margin: 0 }}>
            {mockProfessionals.length} partenaire{mockProfessionals.length > 1 ? 's' : ''} professionnel{mockProfessionals.length > 1 ? 's' : ''}
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
          style={{ padding: '6px 8px' }}
        >
          <LayoutGrid size={18} />
        </button>
        <button
          className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('list')}
          title="Vue liste"
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
                    {new Date(pro.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/couples?newClient=1&proRef=${encodeURIComponent(JSON.stringify({ proId: pro.id, firstName: pro.firstName, lastName: pro.lastName }))}`) }}
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
                          onClick={e => { e.stopPropagation(); r.clientId && navigate(`/couples/${r.clientId}`) }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filtered.map(pro => {
            const isExpanded = expandedIds.has(pro.id)
            const isEditing = editingId === pro.id
            return (
              <div key={pro.id} style={{
                background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                overflow: 'hidden', transition: 'box-shadow 0.2s',
                boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : 'none'
              }}>
                <div
                  onClick={() => { if (!isEditing) setExpandedIds(prev => { const next = new Set(prev); if (next.has(pro.id)) next.delete(pro.id); else next.add(pro.id); return next }) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                    padding: 'var(--space-sm) var(--space-md)',
                    cursor: isEditing ? 'default' : 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background = '#FAF5FF' }}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.786rem', fontWeight: 700, flexShrink: 0
                  }}>
                    {(pro.firstName || '')[0]}{(pro.lastName || '')[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.857rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {pro.firstName} {pro.lastName}
                      {pro.company && <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>· {pro.company}</span>}
                    </div>
                    <div style={{ fontSize: '0.714rem', color: 'var(--text-tertiary)', marginTop: 1 }}>
                      {pro.specialty || pro.note || 'Professionnel'}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                    background: '#F5F0FF', color: '#8B5CF6',
                    fontSize: '0.643rem', fontWeight: 600
                  }}>
                    <Award size={11} />
                    {(pro.referrals || []).length} reco{(pro.referrals || []).length > 1 ? 's' : ''}
                  </div>
                  <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(pro.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {!isEditing && (
                    <button onClick={e => { e.stopPropagation(); startEdit(pro) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                      title="Modifier"><Edit3 size={14} /></button>
                  )}
                </div>
                {isExpanded && !isEditing && (
                  <div style={{ padding: 'var(--space-sm) var(--space-md) var(--space-md)', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 'var(--space-md)' }}>
                      {pro.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)' }}><Mail size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.email}</div>}
                      {pro.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)' }}><Phone size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.phone}</div>}
                      {pro.company && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)' }}><Building2 size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.company}</div>}
                      {pro.specialty && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)' }}><Briefcase size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.specialty}</div>}
                      {pro.address && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)', gridColumn: 'span 2' }}><MapPin size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.address}</div>}
                      {pro.website && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.786rem', color: 'var(--text-secondary)' }}><Globe size={13} style={{ color: 'var(--text-tertiary)' }} />{pro.website}</div>}
                    </div>
                    {pro.note && <div style={{ fontSize: '0.786rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)', padding: '6px 10px', background: '#FAFAFA', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #C4B5FD' }}>{pro.note}</div>}
                    <div>
                      <div style={{ fontSize: '0.643rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8B5CF6', marginBottom: 6 }}>Clients recommandés</div>
                      {(pro.referrals || []).length === 0 ? (
                        <div style={{ fontSize: '0.786rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Aucune recommandation.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(pro.referrals || []).map((r, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: '#F5F0FF', fontSize: '0.786rem' }}>
                              <Users size={12} color="#8B5CF6" />
                              <span onClick={() => r.clientId && navigate(`/couples/${r.clientId}`)} style={{ fontWeight: 500, color: '#8B5CF6', cursor: r.clientId ? 'pointer' : 'default' }}
                                onMouseEnter={e => { if (r.clientId) e.currentTarget.style.textDecoration = 'underline' }}
                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>{r.clientName}</span>
                              <span style={{ fontSize: '0.643rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/couples?newClient=1&proRef=${encodeURIComponent(JSON.stringify({ proId: pro.id, firstName: pro.firstName, lastName: pro.lastName }))}`)}
                      style={{
                        marginTop: 10, background: 'none', border: '1px dashed #C4B5FD', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', color: '#8B5CF6', padding: '6px 12px',
                        fontSize: '0.714rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s', width: '100%', justifyContent: 'center'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F5F0FF'; e.currentTarget.style.borderColor = '#8B5CF6' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#C4B5FD' }}
                    >
                      <UserPlus size={14} /> Nouveau client recommandé
                    </button>
                  </div>
                )}
                {isEditing && (
                  <div style={{ padding: 'var(--space-sm) var(--space-md) var(--space-md)', borderTop: '1px solid #C4B5FD', background: '#FDFCFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
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
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 'var(--space-md)' }}>
                      <button className="btn btn-ghost" onClick={cancelEdit} style={{ fontSize: '0.786rem', padding: '6px 14px' }}>Annuler</button>
                      <button className="btn btn-accent" onClick={saveEdit} disabled={!editForm.lastName?.trim()}
                        style={{ fontSize: '0.786rem', padding: '6px 14px', opacity: !editForm.lastName?.trim() ? 0.5 : 1 }}><Save size={13} /> Enregistrer</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Professional Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 'var(--space-lg)', width: 520, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={20} style={{ color: '#8B5CF6' }} /> Nouveau Partenaire Pro
              </span>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
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

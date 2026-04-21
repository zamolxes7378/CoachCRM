import React from 'react';
import { Link2, Award, Briefcase, Plus, X, Edit3, Download } from 'lucide-react';
import { ClientTypeIcon } from '../ClientTypeBadge';

export default function ClientHeaderPanel({
  client,
  clients,
  navigate,
  setEditPartnerA,
  setEditPartnerB,
  setEditChildren,
  setEditType,
  setShowEditModal,
  getClientType,
  getClientInitials,
  getClientName,
  updateClient,
  showAddLink,
  setShowAddLink,
  addLinkSearch,
  setAddLinkSearch,
  onExport
}) {
  const links = client.clientLinks || [];
  const linkConfig = {
    dossier: { color: '#6366F1', bg: '#EEF2FF', Icon: Link2, label: 'Dossier lié' },
    parrainage: { color: '#8B5CF6', bg: '#F5F0FF', Icon: Award, label: 'Parrainage' },
    'parrainage-pro': { color: '#7C3AED', bg: '#F5F0FF', Icon: Briefcase, label: 'Parrain Pro' }
  };
  const hasLinks = links.length > 0;

  const handleEditClick = () => {
    setEditPartnerA({ ...client.partnerA });
    setEditPartnerB(client.partnerB ? { ...client.partnerB } : {});
    setEditChildren(client.children || []);
    setEditType(getClientType(client));
    setShowEditModal(true);
  };

  return (
    <>
      {/* Header */}
      <div className="client-header">
        <div 
          className="client-avatar" 
          onClick={handleEditClick} 
          style={{ 
            background: client.status === 'inactive' ? 'var(--primary-200)' : client.phase === 'prospect' ? '#E8D8FE' : 'var(--accent-main)', 
            color: client.status === 'inactive' ? 'white' : client.phase === 'prospect' ? '#6B46C1' : 'white', 
            cursor: 'pointer' 
          }} 
          title="Modifier l'identité"
        >
          {getClientInitials(client)}
        </div>
        <div className="client-info">
          <div style={{ fontSize: '0.857rem', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
            {(() => { 
              const cType = getClientType(client); 
              return (
                <>
                  <ClientTypeIcon type={cType} size={18} /> 
                  <span>{cType === 'individual' ? 'Individuel' : cType === 'family' ? 'Famille' : 'Couple'}</span>
                </>
              ); 
            })()}
          </div>
          <h1
            onClick={handleEditClick}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Modifier l'identité"
          >
            {getClientName(client)}
            <Edit3 size={14} style={{ color: 'var(--text-tertiary)', opacity: 0.5, transition: 'opacity 0.2s' }} />
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onExport}
            className="btn btn-secondary"
            style={{ fontSize: '0.786rem', padding: '4px 12px', background: 'white' }}
            title="Exporter l'ensemble du dossier patient (Excel) conformément au droit de portabilité RGPD."
          >
            <Download size={14} /> Exporter le dossier
          </button>
          <div
            onClick={() => {
              const newStatus = client.status === 'active' ? 'inactive' : 'active';
              updateClient(client.id, { status: newStatus });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', userSelect: 'none',
              padding: '4px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'transparent'
            }}
          >
            <span style={{
              fontSize: '0.857rem', fontWeight: 600,
              color: client.status === 'active' ? 'var(--primary-800)' : 'var(--text-tertiary)'
            }}>
              {client.status === 'active' ? 'Actif' : 'Inactif'}
            </span>
            <div style={{
              width: 48, height: 26, borderRadius: 13,
              background: client.status === 'active' ? 'var(--primary-800)' : 'var(--primary-100)',
              position: 'relative', transition: 'background 0.3s ease',
              flexShrink: 0
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%)',
                position: 'absolute', top: 2,
                left: client.status === 'active' ? 24 : 2,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Client Links Section */}
      {(hasLinks || showAddLink) ? (
        <div style={{
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          marginBottom: 'var(--space-md)', padding: '8px 0'
        }}>
          {links.map((link, idx) => {
            const cfg = linkConfig[link.type] || linkConfig.dossier;
            // For parrainage-pro, the linked entity is a professional (not in clients)
            const isPro = link.type === 'parrainage-pro';
            const linked = isPro ? null : clients.find(c => c.id === link.clientId);
            if (!isPro && !linked) return null;
            const displayName = isPro ? link.proName : getClientName(linked);
            const roleLabel = link.type === 'parrainage' && link.role
              ? (link.role === 'filleul' ? '· Parrain' : '· Filleul')
              : isPro ? '· Parrain Pro' : '· Client';
            return (
              <div
                key={idx}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px 4px 8px',
                  borderRadius: 'var(--radius-md)',
                  background: cfg.bg,
                  border: `1px solid ${cfg.color}20`,
                  cursor: 'pointer',
                  fontSize: '0.786rem', fontWeight: 600,
                  color: cfg.color,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onClick={() => isPro ? navigate('/admin/reseau-pro') : navigate(`/clients/${linked.id}`)}
                title={`${cfg.label} — cliquer pour ouvrir`}
                onMouseEnter={e => { e.currentTarget.style.background = cfg.color + '20'; e.currentTarget.querySelector('.link-x')?.style && (e.currentTarget.querySelector('.link-x').style.opacity = '1'); }}
                onMouseLeave={e => { e.currentTarget.style.background = cfg.bg; e.currentTarget.querySelector('.link-x')?.style && (e.currentTarget.querySelector('.link-x').style.opacity = '0'); }}
              >
                <cfg.Icon size={13} />
                <span>{displayName}</span>
                <span style={{ fontSize: '0.571rem', fontWeight: 400, opacity: 0.7 }}>
                  {roleLabel}
                </span>
                <button
                  className="link-x"
                  onClick={e => {
                    e.stopPropagation();
                    client.clientLinks = client.clientLinks.filter((_, i) => i !== idx);
                    // Also remove reverse link (only for non-pro links)
                    if (linked && linked.clientLinks) {
                      linked.clientLinks = linked.clientLinks.filter(l => l.clientId !== client.id);
                      updateClient(linked.id, { clientLinks: linked.clientLinks });
                    }
                    updateClient(client.id, { clientLinks: client.clientLinks });
                    setShowAddLink(prev => !prev); // force re-render
                    setTimeout(() => setShowAddLink(false), 0);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: cfg.color, padding: '0 0 0 2px', opacity: 0,
                    transition: 'opacity 0.2s', display: 'flex', alignItems: 'center'
                  }}
                  title="Retirer ce lien"
                  aria-label="Retirer ce lien"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {/* Add link button / dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddLink(!showAddLink)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 'var(--radius-md)',
                background: 'none', border: '1px dashed var(--border-light)',
                color: 'var(--text-tertiary)', cursor: 'pointer',
                fontSize: '0.714rem', fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-main)'; e.currentTarget.style.color = 'var(--accent-main)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              <Plus size={12} /> Lier un dossier
            </button>

            {showAddLink && (
              <>
                <div onClick={() => { setShowAddLink(false); setAddLinkSearch(''); }} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 20,
                  marginTop: 6, width: 260,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  padding: 'var(--space-sm)'
                }}>
                  {/* Search */}
                  <input
                    className="input"
                    placeholder="Rechercher un client..."
                    value={addLinkSearch}
                    onChange={e => setAddLinkSearch(e.target.value)}
                    autoFocus
                    style={{ fontSize: '0.786rem', marginBottom: 'var(--space-xs)' }}
                  />

                  {/* Results */}
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {clients
                      .filter(c => c.id !== client.id && !c.deleted)
                      .filter(c => !links.some(l => l.clientId === c.id))
                      .filter(c => !addLinkSearch || getClientName(c).toLowerCase().includes(addLinkSearch.toLowerCase()))
                      .slice(0, 8)
                      .map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (!client.clientLinks) client.clientLinks = [];
                            client.clientLinks.push({ clientId: c.id, type: 'dossier' });
                            if (!c.clientLinks) c.clientLinks = [];
                            c.clientLinks.push({ clientId: client.id, type: 'dossier' });
                            updateClient(client.id, { clientLinks: client.clientLinks });
                            updateClient(c.id, { clientLinks: c.clientLinks });
                            setShowAddLink(false);
                            setAddLinkSearch('');
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer', fontSize: '0.786rem',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Link2 size={13} color="#6366F1" />
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{getClientName(c)}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 'var(--space-sm)', padding: '2px 0' }}>
          <button
            onClick={() => setShowAddLink(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 'var(--radius-md)',
              background: 'none', border: '1px dashed var(--border-light)',
              color: 'var(--text-tertiary)', cursor: 'pointer',
              fontSize: '0.714rem', fontWeight: 500,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-main)'; e.currentTarget.style.color = 'var(--accent-main)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <Plus size={12} /> Lier un dossier
          </button>
        </div>
      )}
    </>
  );
}

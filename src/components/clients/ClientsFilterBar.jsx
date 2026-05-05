import { Search, ArrowDownUp, ArrowUpAZ, Award, LayoutGrid, LayoutList } from 'lucide-react'
import ViewSwitcher from '../layout/ViewSwitcher'

export default function ClientsFilterBar({
  search, setSearch,
  sortMode, setSortMode,
  statusFilter, setStatusFilter,
  viewMode, setViewMode,
  activeTab
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', alignItems: 'center' }}>
        {[['all', 'Tous'], ['active', 'Actifs'], ['inactive', 'Inactifs']].map(([val, label]) => (
          <button
            key={val}
            className={`btn ${statusFilter === val ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(val)}
            style={{ fontSize: '0.857rem', padding: '4px 12px' }}
          >
            {label}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--primary-300)', margin: '0 4px' }} />
        {[['individual', 'Individuel'], ['client', 'Couple'], ['family', 'Famille']].map(([val, label]) => (
          <button
            key={val}
            className={`btn ${statusFilter === val ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(statusFilter === val ? 'all' : val)}
            style={{ fontSize: '0.857rem', padding: '4px 12px' }}
          >
            {label}
          </button>
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--primary-300)', margin: '0 4px' }} />
        <button
          className={`btn ${statusFilter === 'parrains' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter(statusFilter === 'parrains' ? 'all' : 'parrains')}
          style={{ fontSize: '0.857rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Award size={14} /> Parrains
        </button>
        <button
          className={`btn ${statusFilter === 'filleuls' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setStatusFilter(statusFilter === 'filleuls' ? 'all' : 'filleuls')}
          style={{ fontSize: '0.857rem', padding: '4px 12px' }}
        >
          Filleuls
        </button>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div className="search-input" style={{ flex: 1 }}>
          <Search />
          <input
            className="input"
            placeholder={activeTab === 'prospects' ? 'Rechercher un prospect...' : 'Rechercher un client...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className={`btn ${sortMode === 'alpha-asc' || sortMode === 'alpha-desc' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'none' || sortMode === 'recent' ? 'alpha-asc' : sortMode === 'alpha-asc' ? 'alpha-desc' : 'none')}
          title="Trier par nom de famille"
        >
          <ArrowUpAZ size={18} /> {sortMode === 'alpha-desc' ? 'Z→A' : 'A→Z'}
        </button>
        <button
          className={`btn ${sortMode === 'recent' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSortMode(sortMode === 'recent' ? 'none' : 'recent')}
          title="Trier par dernier rendez-vous"
        >
          <ArrowDownUp size={18} /> Plus récent
        </button>
        <span style={{ width: 1, height: 28, background: 'var(--border-light)', margin: '0 2px' }} />
        <ViewSwitcher
          currentView={viewMode}
          onViewChange={setViewMode}
          options={[
            { id: 'cards', icon: LayoutGrid, title: 'Vue cartes' },
            { id: 'list', icon: LayoutList, title: 'Vue liste' }
          ]}
        />
      </div>
    </>
  )
}

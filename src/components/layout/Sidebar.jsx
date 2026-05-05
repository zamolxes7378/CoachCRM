import { NavLink, useLocation } from 'react-router-dom'
import { Home, Users, Mic, FileText, BookOpen, Settings, HelpCircle, Crown, Heart, LogOut, Menu, X, Brain, Euro, Repeat, Archive, Briefcase, ShieldAlert } from 'lucide-react'

export default function Sidebar({ user, onLogout, isOpen, onToggle }) {
  const location = useLocation()

  const mainNav = [
    { to: '/', icon: Home, label: 'Accueil' },
    { to: '/clients', icon: Users, label: 'Mes Clients' },
    { to: '/finances', icon: Euro, label: 'Pilotage financier' },

  ]

  const secondaryNav = [
    { to: '/rituo', icon: Repeat, label: 'Rituo', disabled: true },
    { to: '/ai', icon: Brain, label: 'IA Assistant', disabled: true },
  ]

  const initials = user?.name?.split(' ').map(n => n[0]).join('') || '?'

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Heart size={24} />
          <span className="h1">Coach<span>CRM</span></span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            {mainNav.map(item => {
              const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
                >
                  <item.icon aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            {secondaryNav.map(item => (
              <button
                key={item.to}
                className="sidebar-link"
                disabled
                aria-disabled="true"
                aria-label={`${item.label} — bientôt disponible`}
                style={{ opacity: 0.4, cursor: 'default', width: '100%', background: 'none', border: 'none', textAlign: 'left', color: 'inherit' }}
              >
                <item.icon aria-hidden="true" />
                <span>{item.label}</span>
                <span aria-hidden="true" style={{ fontSize: '0.65rem', marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>V2</span>
              </button>
            ))}
          </div>

          <div className="sidebar-divider" />

          <div className="sidebar-section">
            <NavLink
              to="/settings"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              aria-current={location.pathname.startsWith('/settings') ? 'page' : undefined}
              onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
            >
              <Settings aria-hidden="true" />
              <span>Paramètres</span>
            </NavLink>
            <NavLink
              to="/help"
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              aria-current={location.pathname.startsWith('/help') ? 'page' : undefined}
              onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
            >
              <HelpCircle aria-hidden="true" />
              <span>Aide</span>
            </NavLink>
          </div>

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-divider" />
              <div className="sidebar-label">Administration</div>
              <div className="sidebar-section">
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  aria-current={location.pathname === '/admin' ? 'page' : undefined}
                  onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
                >
                  <Crown aria-hidden="true" />
                  <span>Admin</span>
                </NavLink>
                <NavLink
                  to="/admin/deleted-clients"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  aria-current={location.pathname.startsWith('/admin/deleted-clients') ? 'page' : undefined}
                  onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
                >
                  <Archive aria-hidden="true" />
                  <span>Clients archivés</span>
                </NavLink>
                <NavLink
                  to="/admin/reseau-pro"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  aria-current={location.pathname.startsWith('/admin/reseau-pro') ? 'page' : undefined}
                  onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
                >
                  <Briefcase aria-hidden="true" />
                  <span>Réseau Pro</span>
                </NavLink>
                <NavLink
                  to="/admin/dsar"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  aria-current={location.pathname.startsWith('/admin/dsar') ? 'page' : undefined}
                  onClick={() => onToggle && window.innerWidth < 768 && onToggle()}
                >
                  <ShieldAlert aria-hidden="true" />
                  <span>Demandes RGPD</span>
                </NavLink>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">{user?.role === 'admin' ? 'Admin' : 'Praticien(ne)'}</div>
            </div>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-sidebar-muted)', padding: 4 }}
              aria-label="Déconnexion"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

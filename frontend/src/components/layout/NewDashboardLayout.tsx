import { useState } from 'react'
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import './NewDashboardLayout.css'

const ICONS = {
  overview: (
    <svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" /><rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" /><rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" /><rect x="13" y="13" width="7.5" height="7.5" rx="1.6" /></svg>
  ),
  bills: (
    <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /><path d="M9 12.5h6M9 15.8h6" /></svg>
  ),
  assistant: (
    <svg viewBox="0 0 24 24"><rect x="4.5" y="7.5" width="15" height="11" rx="3" /><path d="M9 12.5v.01M15 12.5v.01" /><path d="M12 7.5V4.5" /><circle cx="12" cy="3.6" r="1" /><path d="M4.5 12.5h-1.2M20.7 12.5h-1.2" /></svg>
  ),
  spending: (
    <svg viewBox="0 0 24 24"><path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5" /><path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5" /></svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24"><path d="M6.5 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 6.5 3.5Z" /><path d="M14.5 3.5V8h4" /><path d="M9 12.5h6M9 15.8h3.5" /></svg>
  ),
  match: (
    <svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="6" rx="1.6" /><rect x="3.5" y="13.5" width="17" height="6" rx="1.6" /><path d="m8 7.5 1.6 1.6L12 6.7" /></svg>
  ),
  documents: (
    <svg viewBox="0 0 24 24"><path d="M3.5 7.5a1.5 1.5 0 0 1 1.5-1.5h4l2 2.2h8a1.5 1.5 0 0 1 1.5 1.5v8.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V7.5Z" /></svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1" /><path d="M12 3.5v2.1M12 18.4v2.1M20.5 12h-2.1M5.6 12H3.5M18 6l-1.5 1.5M7.5 16.5 6 18M18 18l-1.5-1.5M7.5 7.5 6 6" /></svg>
  ),
}

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: ICONS.overview, path: '/overview' },
  { key: 'bills', label: 'Bills', icon: ICONS.bills, path: '/bills' },
  { key: 'assistant', label: 'AI Assistant', icon: ICONS.assistant, path: '/assistant' },
  { key: 'spending', label: 'Spending', icon: ICONS.spending, path: '/spending' },
  { key: 'reports', label: 'Reports', icon: ICONS.reports, path: '/reports' },
  { key: 'match', label: 'Match Records', icon: ICONS.match, path: '/match-records' },
  { key: 'documents', label: 'Documents', icon: ICONS.documents, path: '/documents' },
  { key: 'settings', label: 'Settings', icon: ICONS.settings, path: '/settings' },
]

const PAGE_TITLES: Record<string, string> = {
  overview: 'Dashboard',
  bills: 'Bills',
  assistant: 'Copilot',
  spending: 'Transactions',
  reports: 'Reports',
  match: 'Reconciliation',
  documents: 'Documents',
  settings: 'Settings',
}

function activeKeyFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const last = segments[segments.length - 1] || 'overview'
  if (last === 'dashboard') return 'overview'
  for (const item of NAV_ITEMS) {
    if (item.path === '/' + last || item.key === last) return item.key
  }
  return 'overview'
}

export function NewDashboardLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const activePage = activeKeyFromPath(location.pathname)
  const initials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'FH'
    : 'FH'

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={'fhd-shell' + (collapsed ? ' fhd-collapsed-shell' : '')}>
      <aside className={'fhd-sidebar' + (collapsed ? ' fhd-collapsed' : '')}>
        <div className="fhd-brand">
          <div className="fhd-brand-mark"><span>FH</span></div>
          <span className="fhd-brand-name">Finly Hub</span>
        </div>

        <nav className="fhd-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={'fhd-nav-item' + (activePage === item.key ? ' fhd-active' : '')}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              <span className="fhd-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="fhd-sidebar-foot">
          <button
            type="button"
            className="fhd-collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
            <span>Collapse</span>
          </button>
          <button type="button" className="fhd-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24"><path d="M9 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H9" /><path d="M14.5 16l4-4-4-4" /><path d="M18.2 12H9.5" /></svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="fhd-main-col">
        <header className="fhd-topbar">
          <h1>{PAGE_TITLES[activePage] || 'Dashboard'}</h1>
          <div className="fhd-topbar-actions">
            <button type="button" className="fhd-icon-btn" aria-label="Toggle theme">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2" /><path d="M12 3.5v1.8M12 18.7v1.8M20.5 12h-1.8M5.3 12H3.5M17.7 6.3l-1.3 1.3M7.6 16.1l-1.3 1.3M17.7 17.7l-1.3-1.3M7.6 7.9 6.3 6.6" /></svg>
            </button>
            <button type="button" className="fhd-icon-btn" aria-label="Notifications">
              <svg viewBox="0 0 24 24"><path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.2 1.5 5.2h-15S6 14.5 6 10.5Z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></svg>
              <span className="fhd-notif-dot" />
            </button>
            <div className="fhd-avatar">{initials}</div>
          </div>
        </header>

        <main className="fhd-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

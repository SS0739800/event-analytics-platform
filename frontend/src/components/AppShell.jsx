import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken } from '../lib/api'

// The app frame: light sticky top nav, matching the landing page.
//
// This replaces the dark 240px sidebar both pages used to duplicate. The
// sidebar was the main thing making the app read as an admin template — a
// black rail bolted onto a white editorial site — and its nav was only
// scroll-to-section anchors, which sit naturally in a horizontal bar.
export default function AppShell({ sections = [], active, onNavigate, actions, children }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const signOut = () => { clearToken(); navigate('/') }

  return (
    <div className="shell">
      <header className="shell-nav">
        <div className="shell-nav-inner">
          <div className="shell-brand" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate('/dashboard')}>
            <span className="landing-mark" />
            <span className="shell-brand-name">EventAnalytics</span>
          </div>

          <nav className="shell-links">
            {sections.map(s => (
              <button
                key={s.id}
                className={`shell-link${active === s.id ? ' active' : ''}`}
                onClick={() => onNavigate?.(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="shell-nav-right">
            <button className="shell-link" onClick={() => setMenuOpen(o => !o)}>
              Account
            </button>
            {menuOpen && (
              <>
                <div className="shell-menu-scrim" onClick={() => setMenuOpen(false)} />
                <div className="shell-menu">
                  <div className="shell-menu-head">Signed in</div>
                  <button className="shell-menu-item" onClick={signOut}>Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {actions && (
        <div className="shell-actions">
          <div className="shell-actions-inner">{actions}</div>
        </div>
      )}

      <main className="shell-main">{children}</main>
    </div>
  )
}

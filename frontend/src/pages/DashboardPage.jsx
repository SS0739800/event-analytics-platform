import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearToken } from '../lib/api'
import StatCard from '../components/StatCard'
import CategoryCharts from '../components/CategoryCharts'
import TimeCharts from '../components/TimeCharts'
import TrendChart from '../components/TrendChart'
import EventsTable from '../components/EventsTable'
import EventModal from '../components/EventModal'
import AIInsightsCard from '../components/AIInsightsCard'
import AIParseModal from '../components/AIParseModal'
import BulkPreviewModal from '../components/BulkPreviewModal'

const NAV = [
  { id: 'overview',   icon: '▦',  label: 'Overview' },
  { id: 'categories', icon: '⊞',  label: 'Categories' },
  { id: 'time',       icon: '◷',  label: 'Time Analysis' },
  { id: 'trends',     icon: '╱╲', label: 'Trends' },
  { id: 'events',     icon: '≡',  label: 'Events' },
]

function useAuthFetch(path, refreshKey) {
  const [data, setData] = useState(null)
  useEffect(() => {
    apiFetch('/api' + path).then(r => r.ok ? r.json() : null).then(setData)
  }, [path, refreshKey])
  return data
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState({ email: '', full_name: '' })
  const [active, setActive] = useState('overview')
  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [aiPrefill, setAiPrefill] = useState(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [bulkEvents, setBulkEvents] = useState([])
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    apiFetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => { if (p) setUser(p) })
  }, [])

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const stats     = useAuthFetch('/stats',          refreshKey)
  const catStats  = useAuthFetch('/category-stats', refreshKey)
  const timeStats = useAuthFetch('/time-stats',     refreshKey)
  const trends    = useAuthFetch('/trends',         refreshKey)
  const allEvents = useAuthFetch('/events',         refreshKey)

  const scrollTo = (id) => {
    setActive(id)
    if (id === 'overview') window.scrollTo({ top: 0, behavior: 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSignOut = () => { clearToken(); navigate('/login') }

  const exportWithAuth = (path) => {
    apiFetch(path).then(async r => {
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = path.includes('csv') ? 'csv' : path.includes('excel') ? 'xlsx' : 'pdf'
      a.download = `events_export.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">📊</div>
          <div className="logo-text">EventAnalytics<span className="logo-sub">PLATFORM</span></div>
        </div>

        <span className="sidebar-section-label">Navigation</span>
        <nav className="sidebar-nav">
          {NAV.map(({ id, icon, label }) => (
            <div key={id} className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => scrollTo(id)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && scrollTo(id)}>
              <span className="nav-icon">{icon}</span>{label}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          {user.full_name && <div className="sidebar-user-name">{user.full_name}</div>}
          <div className="sidebar-user-email">{user.email}</div>
          <div className="nav-item" onClick={handleSignOut} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && handleSignOut()}
            style={{ color: '#ef4444', padding: '6px 14px' }}>
            Sign out
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>Dashboard Overview</h2>
            <p>Personal activity analytics</p>
          </div>
          <div className="top-bar-right">
            <button className="btn btn-outline" onClick={() => { setEditEvent(null); setModalOpen(true) }}>+ Add Event</button>
            <button className="btn btn-ai" onClick={() => setAiModalOpen(true)}>✨ Add with AI</button>
            <button className="btn btn-outline" onClick={() => exportWithAuth('/export/csv')}>↓ CSV</button>
            <button className="btn btn-outline" onClick={() => exportWithAuth('/export/excel')}>↓ Excel</button>
            <button className="btn btn-primary" onClick={() => exportWithAuth('/export/pdf')}>↓ PDF</button>
          </div>
        </header>

        <div className="content">
          <section id="overview" className="section">
            <div className="section-header"><span className="section-title">Overview</span></div>
            <div className="stats-grid">
              <StatCard color="blue"   icon="📅" label="Total Events"       value={stats?.total_events} />
              <StatCard color="green"  icon="⏱" label="Total Hours Logged"  value={stats?.total_hours != null ? `${stats.total_hours}h` : null} />
              <StatCard color="orange" icon="🏷" label="Activity Categories" value={stats?.categories} />
              <StatCard color="purple" icon="⏰" label="Avg Duration (min)"  value={stats?.avg_duration} />
            </div>
            <div style={{ marginTop: 14 }}>
              <AIInsightsCard refreshKey={refreshKey} />
            </div>
          </section>

          <section id="categories" className="section">
            <div className="section-header"><span className="section-title">Categories</span></div>
            <div className="grid cols-2">
              <CategoryCharts data={catStats} type="bar" />
              <CategoryCharts data={catStats} type="pie" />
            </div>
            <div className="grid cols-1" style={{ marginTop: 14 }}>
              <CategoryCharts data={catStats} type="duration" />
            </div>
          </section>

          <section id="time" className="section">
            <div className="section-header"><span className="section-title">Time Analysis</span></div>
            <div className="grid cols-2">
              <TimeCharts data={timeStats} type="hours" />
              <TimeCharts data={timeStats} type="days" />
            </div>
          </section>

          <section id="trends" className="section">
            <div className="section-header"><span className="section-title">Trends</span></div>
            <div className="grid cols-2">
              <TrendChart data={trends} type="monthly" />
              <TrendChart data={trends} type="category" />
            </div>
          </section>

          <section id="events" className="section">
            <div className="section-header"><span className="section-title">Events</span></div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">All Events</div>
                  <div className="card-subtitle">
                    {allEvents ? `${allEvents.length} total` : 'Loading…'}
                  </div>
                </div>
              </div>
              <div className="card-body-flush events-table-wrap">
                <EventsTable
                  data={allEvents}
                  onEdit={ev => { setEditEvent(ev); setAiPrefill(null); setModalOpen(true) }}
                  onDeleted={refresh}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {aiModalOpen && (
        <AIParseModal
          onClose={() => setAiModalOpen(false)}
          onParsed={(parsed) => {
            setAiModalOpen(false)
            setEditEvent(null)
            setAiPrefill(parsed)
            setModalOpen(true)
          }}
          onBulkParsed={(parsed) => {
            setAiModalOpen(false)
            setBulkEvents(parsed)
            setBulkPreviewOpen(true)
          }}
        />
      )}

      {bulkPreviewOpen && (
        <BulkPreviewModal
          events={bulkEvents}
          onClose={() => setBulkPreviewOpen(false)}
          onSaved={() => { setBulkPreviewOpen(false); refresh() }}
        />
      )}

      {modalOpen && (
        <EventModal
          event={editEvent}
          prefill={editEvent ? null : aiPrefill}
          onClose={() => { setModalOpen(false); setAiPrefill(null) }}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

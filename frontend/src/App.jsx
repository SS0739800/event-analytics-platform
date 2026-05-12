import { useEffect, useState } from 'react'
import StatCard from './components/StatCard'
import CategoryCharts from './components/CategoryCharts'
import TimeCharts from './components/TimeCharts'
import TrendChart from './components/TrendChart'
import TopEventsTable from './components/TopEventsTable'

function useFetch(path) {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch('/api' + path).then(r => r.json()).then(setData)
  }, [path])
  return data
}

const NAV = [
  { id: 'overview',    icon: '▦',  label: 'Overview' },
  { id: 'categories',  icon: '⊞',  label: 'Categories' },
  { id: 'time',        icon: '◷',  label: 'Time Analysis' },
  { id: 'trends',      icon: '╱╲', label: 'Trends' },
  { id: 'events',      icon: '≡',  label: 'Top Events' },
]

export default function App() {
  const [active, setActive] = useState('overview')
  const stats     = useFetch('/stats')
  const catStats  = useFetch('/category-stats')
  const timeStats = useFetch('/time-stats')
  const trends    = useFetch('/trends')
  const topEvents = useFetch('/top-events')

  const scrollTo = (id) => {
    setActive(id)
    if (id === 'overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">📊</div>
          <div className="logo-text">
            EventAnalytics
            <span className="logo-sub">PLATFORM</span>
          </div>
        </div>

        <span className="sidebar-section-label">Navigation</span>
        <nav className="sidebar-nav">
          {NAV.map(({ id, icon, label }) => (
            <div
              key={id}
              className={`nav-item ${active === id ? 'active' : ''}`}
              onClick={() => scrollTo(id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && scrollTo(id)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">Jan – Mar 2026</div>
      </aside>

      {/* Main area */}
      <div className="main-area">

        {/* Top bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>Dashboard Overview</h2>
            <p>Personal activity analytics · Jan – Mar 2026</p>
          </div>
          <div className="top-bar-right">
            <a href="/export/csv"   className="btn btn-outline">↓ CSV</a>
            <a href="/export/excel" className="btn btn-outline">↓ Excel</a>
            <a href="/export/pdf"   className="btn btn-primary">↓ PDF Report</a>
          </div>
        </header>

        <div className="content">

          {/* Overview */}
          <section id="overview" className="section">
            <div className="section-header">
              <span className="section-title">Overview</span>
            </div>
            <div className="stats-grid">
              <StatCard color="blue"   icon="📅" label="Total Events"       value={stats?.total_events} />
              <StatCard color="green"  icon="⏱" label="Total Hours Logged"  value={stats?.total_hours != null ? `${stats.total_hours}h` : null} />
              <StatCard color="orange" icon="🏷" label="Activity Categories" value={stats?.categories} />
              <StatCard color="purple" icon="⏰" label="Avg Duration (min)"  value={stats?.avg_duration} />
            </div>
          </section>

          {/* Categories */}
          <section id="categories" className="section">
            <div className="section-header">
              <span className="section-title">Categories</span>
            </div>
            <div className="grid cols-2">
              <CategoryCharts data={catStats} type="bar" />
              <CategoryCharts data={catStats} type="pie" />
            </div>
            <div className="grid cols-1" style={{ marginTop: 14 }}>
              <CategoryCharts data={catStats} type="duration" />
            </div>
          </section>

          {/* Time analysis */}
          <section id="time" className="section">
            <div className="section-header">
              <span className="section-title">Time Analysis</span>
            </div>
            <div className="grid cols-2">
              <TimeCharts data={timeStats} type="hours" />
              <TimeCharts data={timeStats} type="days" />
            </div>
          </section>

          {/* Trends */}
          <section id="trends" className="section">
            <div className="section-header">
              <span className="section-title">Trends</span>
            </div>
            <div className="grid cols-2">
              <TrendChart data={trends} type="monthly" />
              <TrendChart data={trends} type="category" />
            </div>
          </section>

          {/* Top events */}
          <section id="events" className="section">
            <div className="section-header">
              <span className="section-title">Top Events</span>
            </div>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Longest Activities</div>
                  <div className="card-subtitle">Top 5 by duration</div>
                </div>
              </div>
              <div className="card-body-flush">
                <TopEventsTable data={topEvents} />
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}

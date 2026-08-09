import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearToken } from '../lib/api'
import CategoryCharts from '../components/CategoryCharts'
import TimeCharts from '../components/TimeCharts'
import TrendChart from '../components/TrendChart'
import EventsTable from '../components/EventsTable'
import EventModal from '../components/EventModal'
import AIInsightsCard from '../components/AIInsightsCard'
import AIParseModal from '../components/AIParseModal'
import BulkPreviewModal from '../components/BulkPreviewModal'
import WeeklySummaryCard from '../components/WeeklySummaryCard'
import QueryPanel from '../components/QueryPanel'
import ICalModal from '../components/ICalModal'
import CategoryModal from '../components/CategoryModal'
import { useCategories } from '../lib/useCategories'
import { invalidateCategoriesCache } from '../lib/categories'
import Icon from '../components/Icon'
import AppShell from '../components/AppShell'
import ActivityHeatmap from '../components/ActivityHeatmap'

const NAV = [
  { id: 'overview',   label: 'Overview' },
  { id: 'categories', label: 'Categories' },
  { id: 'time',       label: 'Time' },
  { id: 'trends',     label: 'Trends' },
  { id: 'events',     label: 'Events' },
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
  const [icalOpen, setIcalOpen] = useState(false)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const categories = useCategories()
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

  // Minutes per day for the heatmap. /events already carries everything needed,
  // so this costs no extra request. Kept in whole minutes rather than hours —
  // dividing on every add accumulates float error, so 45 minutes could come
  // out as 0.7499999.
  const activityByDate = useMemo(() => {
    const map = {}
    for (const e of (allEvents || [])) {
      const k = String(e.date).slice(0, 10)
      map[k] = (map[k] || 0) + (e.duration_minutes || 0)
    }
    return map
  }, [allEvents])

  const scrollTo = (id) => {
    setActive(id)
    if (id === 'overview') window.scrollTo({ top: 0, behavior: 'smooth' })
    else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSignOut = () => { clearToken(); navigate('/') }

  const exportWithAuth = (path) => {
    apiFetch(path).then(async r => {
      if (!r.ok) { alert('Export failed — please try again.'); return }
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

  const toolbar = (
    <>
      <button className="btn btn-primary" onClick={() => { setEditEvent(null); setModalOpen(true) }}>+ Add Event</button>
      <button className="btn btn-ai" onClick={() => setAiModalOpen(true)}><Icon name="sparkle" />Add with AI</button>
      <button className="btn btn-outline" onClick={() => setCatModalOpen(true)}><Icon name="tag" />Categories</button>
      <button className="btn btn-outline" onClick={() => navigate('/calendar')}><Icon name="calendar" />Calendar</button>
      <span style={{ flex: 1 }} />
      <button className="btn btn-outline" onClick={() => setIcalOpen(true)}><Icon name="calendar" />iCal</button>
      <button className="btn btn-outline" onClick={() => exportWithAuth('/export/csv')}><Icon name="download" />CSV</button>
      <button className="btn btn-outline" onClick={() => exportWithAuth('/export/excel')}><Icon name="download" />Excel</button>
      <button className="btn btn-outline" onClick={() => exportWithAuth('/export/pdf')}><Icon name="download" />PDF</button>
    </>
  )

  return (
    <AppShell sections={NAV} active={active} onNavigate={scrollTo} actions={toolbar}>
      <section id="overview" className="rsection">
        <div className="rsection-head">
          <div className="rsection-eyebrow">01 — Overview</div>
          <h1 className="rsection-title">Your activity at a glance</h1>
        </div>

        <div className="metrics">
          <div className="metric">
            <div className="metric-label">Total events</div>
            <div className="metric-value">{stats?.total_events ?? '—'}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Hours logged</div>
            <div className="metric-value">{stats?.total_hours != null ? `${stats.total_hours}h` : '—'}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Categories</div>
            <div className="metric-value">{stats?.categories ?? '—'}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Avg duration</div>
            <div className="metric-value">{stats?.avg_duration ?? '—'}</div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Activity over time</div>
            <div className="panel-sub">Hours logged each day over the past year</div>
          </div>
          <ActivityHeatmap data={activityByDate} title="Past 12 months" />
        </div>

        <div className="panel-grid" style={{ marginTop: 40 }}>
          <AIInsightsCard refreshKey={refreshKey} />
          <WeeklySummaryCard refreshKey={refreshKey} />
        </div>

        <div style={{ marginTop: 40 }}>
          <QueryPanel />
        </div>
      </section>

      <section id="categories" className="rsection">
        <div className="rsection-head">
          <div className="rsection-eyebrow">02 — Categories</div>
          <h2 className="rsection-title">Where your time goes</h2>
        </div>
        <div className="panel-grid">
          <CategoryCharts data={catStats} type="bar" categories={categories} />
          <CategoryCharts data={catStats} type="pie" categories={categories} />
        </div>
        <div style={{ marginTop: 40 }}>
          <CategoryCharts data={catStats} type="duration" categories={categories} />
        </div>
      </section>

      <section id="time" className="rsection">
        <div className="rsection-head">
          <div className="rsection-eyebrow">03 — Time</div>
          <h2 className="rsection-title">The shape of your day</h2>
        </div>
        <div className="panel-grid">
          <TimeCharts data={timeStats} type="hours" />
          <TimeCharts data={timeStats} type="days" />
        </div>
      </section>

      <section id="trends" className="rsection">
        <div className="rsection-head">
          <div className="rsection-eyebrow">04 — Trends</div>
          <h2 className="rsection-title">How it changes over months</h2>
        </div>
        <div className="panel-grid">
          <TrendChart data={trends} type="monthly" />
          <TrendChart data={trends} type="category" categories={categories} />
        </div>
      </section>

      <section id="events" className="rsection">
        <div className="rsection-head">
          <div className="rsection-eyebrow">05 — Events</div>
          <h2 className="rsection-title">
            Everything you have logged
          </h2>
          <div className="panel-sub">{allEvents ? `${allEvents.length} events` : 'Loading…'}</div>
        </div>
        <div className="events-table-wrap">
          <EventsTable
            data={allEvents}
            onEdit={ev => { setEditEvent(ev); setAiPrefill(null); setModalOpen(true) }}
            onDeleted={refresh}
          />
        </div>
      </section>

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

      {icalOpen && <ICalModal onClose={() => setIcalOpen(false)} />}

      {catModalOpen && (
        <CategoryModal
          categories={categories}
          onClose={() => setCatModalOpen(false)}
          onSaved={(newCats) => { invalidateCategoriesCache(); refresh() }}
        />
      )}
    </AppShell>
  )
}

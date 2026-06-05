import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearToken } from '../lib/api'
import EventModal from '../components/EventModal'
import { useCategories } from '../lib/useCategories'
import { getCategoryStyle } from '../lib/categories'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildCalendarDays(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = firstDow; i > 0; i--)
    days.push({ date: new Date(year, month, 1 - i), current: false })
  for (let d = 1; d <= daysInMonth; d++)
    days.push({ date: new Date(year, month, d), current: true })
  while (days.length < 42)
    days.push({ date: new Date(year, month + 1, days.length - firstDow - daysInMonth + 1), current: false })
  return days
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const categories = useCategories()
  const catStyle = (cat) => getCategoryStyle(cat, categories)
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents] = useState(null)
  const [user,   setUser]  = useState({ email: '', full_name: '' })
  const [selected, setSelected] = useState(null)   // date string YYYY-MM-DD
  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [prefillDate, setPrefillDate] = useState(null)
  const [confirmDeleteEv, setConfirmDeleteEv] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showQuery, setShowQuery]   = useState(false)
  const EMPTY_FILTERS = { dateFrom: '', dateTo: '', timeFrom: '', timeTo: '', category: '' }
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const hasFilters = Object.values(filters).some(Boolean)

  const queryResults = useMemo(() => {
    if (!showQuery || !hasFilters || !events) return null
    return [...events].filter(ev => {
      const d  = String(ev.date).slice(0, 10)
      const t0 = String(ev.start_time).slice(0, 5)
      const t1 = String(ev.end_time).slice(0, 5)
      if (filters.dateFrom && d < filters.dateFrom) return false
      if (filters.dateTo   && d > filters.dateTo)   return false
      if (filters.timeFrom && t0 < filters.timeFrom) return false
      if (filters.timeTo   && t1 > filters.timeTo)   return false
      if (filters.category && ev.category !== filters.category) return false
      return true
    }).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)) ||
      String(a.start_time).localeCompare(String(b.start_time))
    )
  }, [showQuery, hasFilters, events, filters])

  useEffect(() => {
    apiFetch('/api/profile').then(r => r.ok ? r.json() : null).then(p => { if (p) setUser(p) })
  }, [])

  const loadEvents = useCallback(() => {
    apiFetch('/api/events').then(r => r.ok ? r.json() : []).then(setEvents)
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  const byDate = useMemo(() => {
    const map = {}
    for (const e of (events || [])) {
      const k = String(e.date).slice(0, 10)
      ;(map[k] ??= []).push(e)
    }
    return map
  }, [events])

  const calDays  = useMemo(() => buildCalendarDays(year, month), [year, month])
  const todayKey = dateKey(today)
  const dayEvents = selected ? [...(byDate[selected] || [])].sort((a,b) => String(a.start_time).localeCompare(String(b.start_time))) : []

  const prevMonth = () => month === 0  ? (setYear(y=>y-1), setMonth(11))   : setMonth(m=>m-1)
  const nextMonth = () => month === 11 ? (setYear(y=>y+1), setMonth(0))    : setMonth(m=>m+1)
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayKey) }

  const openAdd  = (dateStr) => { setEditEvent(null); setPrefillDate(dateStr); setModalOpen(true) }
  const openEdit = (ev)      => { setEditEvent(ev);  setPrefillDate(null);    setModalOpen(true) }

  const handleDeleteOne = async () => {
    setDeleting(true)
    await apiFetch(`/api/events/${confirmDeleteEv.id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDeleteEv(null)
    loadEvents()
  }

  const handleDeleteSeries = async () => {
    setDeleting(true)
    await apiFetch(`/api/events/series/${confirmDeleteEv.series_id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmDeleteEv(null)
    loadEvents()
  }

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">📊</div>
          <div className="logo-text">EventAnalytics<span className="logo-sub">PLATFORM</span></div>
        </div>

        <span className="sidebar-section-label">Navigation</span>
        <nav className="sidebar-nav">
          <div className="nav-item" role="button" tabIndex={0} onClick={() => navigate('/dashboard')}
            onKeyDown={e => e.key==='Enter' && navigate('/dashboard')}>
            <span className="nav-icon">▦</span>Dashboard
          </div>
          <div className="nav-item active" role="button" tabIndex={0}>
            <span className="nav-icon">📅</span>Calendar
          </div>
        </nav>

        <div className="sidebar-user">
          {user.full_name && <div className="sidebar-user-name">{user.full_name}</div>}
          <div className="sidebar-user-email">{user.email}</div>
          <div className="nav-item" role="button" tabIndex={0}
            onClick={() => { clearToken(); navigate('/') }}
            style={{ color: '#ef4444', padding: '6px 14px' }}>
            Sign out
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="top-bar">
          <div className="top-bar-left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn btn-outline cal-arrow" onClick={prevMonth}>‹</button>
              <button className="btn btn-outline cal-arrow" onClick={nextMonth}>›</button>
            </div>
            <h2 style={{ fontSize: 17, letterSpacing: '-0.02em' }}>{MONTHS[month]} {year}</h2>
            <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={goToday}>Today</button>
          </div>
          <div className="top-bar-right">
            <button
              className={`btn ${showQuery ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setShowQuery(q => !q); setFilters(EMPTY_FILTERS) }}>
              {showQuery ? '✕ Close Query' : '🔍 Query Events'}
            </button>
            <button className="btn btn-primary" onClick={() => openAdd(null)}>+ Add Event</button>
          </div>
        </header>

        {/* ── Filter bar ── */}
        {showQuery && (
          <div className="cal-filter-bar">
            <div className="cal-filter-group">
              <span className="cal-filter-label">Date range</span>
              <input type="date" className="field-input cal-filter-input"
                value={filters.dateFrom} onChange={e => setF('dateFrom', e.target.value)} />
              <span className="cal-filter-sep">to</span>
              <input type="date" className="field-input cal-filter-input"
                value={filters.dateTo} onChange={e => setF('dateTo', e.target.value)} />
            </div>
            <div className="cal-filter-divider" />
            <div className="cal-filter-group">
              <span className="cal-filter-label">Time range</span>
              <input type="time" className="field-input cal-filter-input"
                value={filters.timeFrom} onChange={e => setF('timeFrom', e.target.value)} />
              <span className="cal-filter-sep">to</span>
              <input type="time" className="field-input cal-filter-input"
                value={filters.timeTo} onChange={e => setF('timeTo', e.target.value)} />
            </div>
            <div className="cal-filter-divider" />
            <div className="cal-filter-group">
              <span className="cal-filter-label">Category</span>
              <select className="field-input cal-filter-input"
                value={filters.category} onChange={e => setF('category', e.target.value)}>
                <option value="">All categories</option>
                {categories.map(c =>
                  <option key={c}>{c}</option>
                )}
              </select>
            </div>
            {hasFilters && (
              <button className="btn btn-outline" style={{ fontSize: 12 }}
                onClick={() => setFilters(EMPTY_FILTERS)}>
                Clear
              </button>
            )}
          </div>
        )}

        <div className="cal-body">
          {/* ── Grid ── */}
          <div className={`cal-grid-wrap ${selected || queryResults ? 'has-panel' : ''}`}>
            {/* Weekday headers */}
            <div className="cal-grid">
              {WEEKDAYS.map(d => <div key={d} className="cal-wday">{d}</div>)}

              {calDays.map(({ date, current }) => {
                const key     = dateKey(date)
                const evs     = byDate[key] || []
                const shown   = evs.slice(0, 3)
                const more    = evs.length - shown.length
                const isToday = key === todayKey
                const isSel   = key === selected

                return (
                  <div key={key}
                    className={`cal-day${!current ? ' cal-day--other' : ''}${isToday ? ' cal-day--today' : ''}${isSel ? ' cal-day--selected' : ''}`}
                    onClick={() => setSelected(isSel ? null : key)}>
                    <div className="cal-day-num">
                      <span className={isToday ? 'cal-today-dot' : ''}>{date.getDate()}</span>
                    </div>
                    <div className="cal-chips">
                      {shown.map((ev, i) => (
                        <div key={i} className="cal-chip"
                          style={{ background: catStyle(ev.category).bg, color: catStyle(ev.category).text }}>
                          <span className="cal-chip-time">{String(ev.start_time).slice(0,5)}</span>
                          <span className="cal-chip-title">{ev.title}</span>
                        </div>
                      ))}
                      {more > 0 && <div className="cal-chip-more">+{more} more</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Day panel ── */}
          {selected && (
            <div className="cal-panel">
              <div className="cal-panel-head">
                <div>
                  <div className="cal-panel-date-label">
                    {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="cal-panel-count">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn btn-outline" style={{ fontSize: 12, padding: '5px 10px' }}
                    onClick={() => openAdd(selected)}>+ Add</button>
                  <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
                </div>
              </div>

              <div className="cal-panel-list">
                {dayEvents.length === 0
                  ? <div className="cal-panel-empty">No events — click + Add to create one.</div>
                  : dayEvents.map(ev => {
                    const isConfirming = confirmDeleteEv?.id === ev.id
                    const isSeries = !!ev.series_id

                    if (isConfirming) {
                      return (
                        <div key={ev.id} className="cal-panel-event cal-panel-event--confirm">
                          <div className="cal-panel-confirm-msg">
                            {isSeries
                              ? <>Delete <strong>"{ev.title}"</strong> — just this event or the whole series?</>
                              : <>Delete <strong>"{ev.title}"</strong>?</>}
                          </div>
                          <div className="cal-panel-confirm-btns">
                            <button className="bulk-resolve-btn skip"
                              onClick={() => setConfirmDeleteEv(null)} disabled={deleting}>
                              Cancel
                            </button>
                            <button className="confirm-delete-btn single"
                              onClick={handleDeleteOne} disabled={deleting}>
                              {deleting ? '…' : isSeries ? 'This event' : 'Delete'}
                            </button>
                            {isSeries && (
                              <button className="confirm-delete-btn series"
                                onClick={handleDeleteSeries} disabled={deleting}>
                                {deleting ? '…' : 'Entire series'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div key={ev.id} className="cal-panel-event">
                        <div className="cal-panel-event-accent"
                          style={{ background: catStyle(ev.category).text || '#3b82f6' }} />
                        <div className="cal-panel-event-info">
                          <div className="cal-panel-event-name">
                            {ev.title}
                            {ev.series_id && <span className="series-dot" title="Part of a series">●</span>}
                          </div>
                          <div className="cal-panel-event-sub">
                            {String(ev.start_time).slice(0,5)} – {String(ev.end_time).slice(0,5)}
                            &nbsp;·&nbsp;{ev.duration_minutes} min
                          </div>
                          <span className={`badge ${catStyle(ev.category).badge ?? ''}`}
                            style={{ marginTop: 4 }}>{ev.category}</span>
                        </div>
                        <div className="cal-panel-event-btns">
                          <button className="icon-btn" onClick={() => openEdit(ev)}>✏️</button>
                          <button className="icon-btn icon-btn-danger"
                            onClick={() => setConfirmDeleteEv(ev)}>🗑️</button>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          )}

          {/* ── Query results panel ── */}
          {showQuery && queryResults && (
            <div className="cal-panel">
              <div className="cal-panel-head">
                <div>
                  <div className="cal-panel-date-label">Query Results</div>
                  <div className="cal-panel-count">
                    {queryResults.length} event{queryResults.length !== 1 ? 's' : ''} found
                  </div>
                </div>
              </div>
              <div className="cal-panel-list">
                {queryResults.length === 0
                  ? <div className="cal-panel-empty">No events match your filters.</div>
                  : queryResults.map(ev => (
                    <div key={ev.id} className="cal-panel-event cal-query-result"
                      onClick={() => {
                        const d = String(ev.date).slice(0, 10)
                        setSelected(d)
                        setYear(parseInt(d.slice(0,4)))
                        setMonth(parseInt(d.slice(5,7)) - 1)
                      }}>
                      <div className="cal-panel-event-accent"
                        style={{ background: catStyle(ev.category).text || '#3b82f6' }} />
                      <div className="cal-panel-event-info">
                        <div className="cal-query-date">{String(ev.date).slice(0, 10)}</div>
                        <div className="cal-panel-event-name">{ev.title}</div>
                        <div className="cal-panel-event-sub">
                          {String(ev.start_time).slice(0,5)} – {String(ev.end_time).slice(0,5)}
                          &nbsp;·&nbsp;{ev.duration_minutes} min
                        </div>
                        <span className={`badge ${catStyle(ev.category).badge ?? ''}`}
                          style={{ marginTop: 4 }}>{ev.category}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {showQuery && !hasFilters && (
            <div className="cal-panel">
              <div className="cal-panel-head">
                <div className="cal-panel-date-label">Query Events</div>
              </div>
              <div className="cal-panel-empty" style={{ padding: '32px 20px' }}>
                Set a date range, time range, or category above to search your events.
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <EventModal
          event={editEvent}
          prefill={editEvent ? null : (prefillDate ? { date: prefillDate } : null)}
          onClose={() => { setModalOpen(false); setEditEvent(null); setPrefillDate(null) }}
          onSaved={loadEvents}
        />
      )}
    </div>
  )
}

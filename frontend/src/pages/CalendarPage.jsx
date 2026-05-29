import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, clearToken } from '../lib/api'
import EventModal from '../components/EventModal'

const CATEGORY_BG   = { Gym: '#eff6ff', Academics: '#f0fdf4', Sports: '#fffbeb', Recreation: '#f5f3ff', Cooking: '#fef2f2' }
const CATEGORY_TEXT = { Gym: '#2563eb', Academics: '#059669', Sports: '#d97706', Recreation: '#7c3aed', Cooking: '#dc2626' }
const CATEGORY_COLOR = { Gym: 'blue', Academics: 'green', Sports: 'orange', Recreation: 'purple', Cooking: 'red' }

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
          <div className="nav-item" role="button" tabIndex={0} onClick={() => navigate('/')}
            onKeyDown={e => e.key==='Enter' && navigate('/')}>
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
            onClick={() => { clearToken(); navigate('/login') }}
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
            <button className="btn btn-primary" onClick={() => openAdd(null)}>+ Add Event</button>
          </div>
        </header>

        <div className="cal-body">
          {/* ── Grid ── */}
          <div className={`cal-grid-wrap ${selected ? 'has-panel' : ''}`}>
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
                          style={{ background: CATEGORY_BG[ev.category], color: CATEGORY_TEXT[ev.category] }}>
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
                          style={{ background: CATEGORY_TEXT[ev.category] || '#3b82f6' }} />
                        <div className="cal-panel-event-info">
                          <div className="cal-panel-event-name">
                            {ev.title}
                            {ev.series_id && <span className="series-dot" title="Part of a series">●</span>}
                          </div>
                          <div className="cal-panel-event-sub">
                            {String(ev.start_time).slice(0,5)} – {String(ev.end_time).slice(0,5)}
                            &nbsp;·&nbsp;{ev.duration_minutes} min
                          </div>
                          <span className={`badge ${CATEGORY_COLOR[ev.category] ?? ''}`}
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

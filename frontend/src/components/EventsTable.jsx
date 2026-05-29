import { useState } from 'react'
import { apiFetch } from '../lib/api'

const CATEGORY_COLORS = {
  Gym: 'blue', Academics: 'green', Sports: 'orange', Recreation: 'purple', Cooking: 'red',
}

export default function EventsTable({ data, onEdit, onDeleted }) {
  const [confirmId, setConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  if (!data) return <div className="loading">Loading…</div>
  if (!data.length) return <div className="loading">No events yet — add one to get started.</div>

  const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date))

  const confirmEvent = sorted.find(e => e.id === confirmId)
  const isSeries = !!confirmEvent?.series_id

  const handleDeleteOne = async () => {
    setDeleting(true)
    await apiFetch(`/api/events/${confirmId}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmId(null)
    onDeleted()
  }

  const handleDeleteSeries = async () => {
    setDeleting(true)
    await apiFetch(`/api/events/series/${confirmEvent.series_id}`, { method: 'DELETE' })
    setDeleting(false)
    setConfirmId(null)
    onDeleted()
  }

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Activity</th>
          <th>Category</th>
          <th>Time</th>
          <th>Duration</th>
          <th style={{ width: 120 }}></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((event) => (
          confirmId === event.id ? (
            <tr key={event.id} className="events-table-confirm-row">
              <td colSpan={6}>
                <div className="events-table-confirm">
                  <span className="events-table-confirm-msg">
                    {isSeries
                      ? <>Delete <strong>"{event.title}"</strong> — just this event or the entire series?</>
                      : <>Delete <strong>"{event.title}"</strong>?</>}
                  </span>
                  <div className="events-table-confirm-btns">
                    <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: 12 }}
                      onClick={() => setConfirmId(null)} disabled={deleting}>
                      Cancel
                    </button>
                    <button className="confirm-delete-btn single"
                      onClick={handleDeleteOne} disabled={deleting}>
                      {deleting ? '…' : isSeries ? 'This event only' : 'Delete'}
                    </button>
                    {isSeries && (
                      <button className="confirm-delete-btn series"
                        onClick={handleDeleteSeries} disabled={deleting}>
                        {deleting ? '…' : 'Entire series'}
                      </button>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={event.id}>
              <td style={{ color: '#64748b' }}>{String(event.date).slice(0, 10)}</td>
              <td style={{ fontWeight: 500 }}>
                {event.title}
                {event.series_id && <span className="series-dot" title="Part of a series">●</span>}
              </td>
              <td><span className={`badge ${CATEGORY_COLORS[event.category] ?? ''}`}>{event.category}</span></td>
              <td style={{ color: '#64748b' }}>{String(event.start_time).slice(0, 5)} – {String(event.end_time).slice(0, 5)}</td>
              <td>{event.duration_minutes} min</td>
              <td>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="icon-btn" title="Edit" onClick={() => onEdit(event)}>✏️</button>
                  <button className="icon-btn icon-btn-danger" title="Delete" onClick={() => setConfirmId(event.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          )
        ))}
      </tbody>
    </table>
  )
}

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

  const handleDelete = async (id) => {
    setDeleting(true)
    await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
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
          <th style={{ width: 100 }}></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((event) => (
          confirmId === event.id ? (
            <tr key={event.id} className="events-table-confirm-row">
              <td colSpan={4} style={{ color: '#ef4444', fontWeight: 500, fontSize: 13 }}>
                Delete "{event.title}"?
              </td>
              <td colSpan={2}>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: 12 }}
                    onClick={() => setConfirmId(null)} disabled={deleting}>
                    Cancel
                  </button>
                  <button className="btn" style={{ padding: '3px 10px', fontSize: 12, background: '#ef4444', color: '#fff', border: 'none' }}
                    onClick={() => handleDelete(event.id)} disabled={deleting}>
                    {deleting ? '…' : 'Delete'}
                  </button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={event.id}>
              <td style={{ color: '#64748b' }}>{String(event.date).slice(0, 10)}</td>
              <td style={{ fontWeight: 500 }}>{event.title}</td>
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

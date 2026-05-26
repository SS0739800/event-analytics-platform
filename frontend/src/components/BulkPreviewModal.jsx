import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function BulkPreviewModal({ events, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setSaving(true)
    setError('')
    const res = await apiFetch('/api/events/bulk', {
      method: 'POST',
      body: JSON.stringify(events),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Failed to create events')
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box bulk-preview-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✨ {events.length} events to create</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bulk-preview-list">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Time</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td>{e.date}</td>
                  <td>{e.title}</td>
                  <td><span className="badge">{e.category}</span></td>
                  <td>{e.start_time} – {e.end_time}</td>
                  <td>{e.duration_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <div className="auth-error" style={{ margin: '0 20px 12px' }}>{error}</div>}

        <div className="modal-actions" style={{ padding: '12px 20px 16px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating…' : `Create ${events.length} events`}
          </button>
        </div>
      </div>
    </div>
  )
}

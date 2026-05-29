import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

const CATEGORIES = ['Academics', 'Gym', 'Sports', 'Cooking', 'Recreation']
const EMPTY = { title: '', category: 'Academics', date: '', start_time: '', end_time: '', duration_minutes: '' }

function calcDuration(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  return mins > 0 ? mins : ''
}

export default function EventModal({ event, prefill, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(null) // { id, title, message }
  const [replacing, setReplacing] = useState(false)

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title,
        category: event.category,
        date: event.date?.slice(0, 10) ?? '',
        start_time: event.start_time?.slice(0, 5) ?? '',
        end_time: event.end_time?.slice(0, 5) ?? '',
        duration_minutes: event.duration_minutes,
      })
    } else if (prefill) {
      setForm({ ...EMPTY, ...prefill })
    } else {
      setForm(EMPTY)
    }
    setConflict(null)
    setError('')
  }, [event, prefill])

  const set = (k, v) => {
    setConflict(null)
    setError('')
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'start_time' || k === 'end_time') {
        const dur = calcDuration(k === 'start_time' ? v : next.start_time, k === 'end_time' ? v : next.end_time)
        if (dur !== '') next.duration_minutes = dur
      }
      return next
    })
  }

  const save = async () => {
    const url = event ? `/api/events/${event.id}` : '/api/events'
    const method = event ? 'PUT' : 'POST'
    setSaving(true)
    const res = await apiFetch(url, { method, body: JSON.stringify(form) })
    setSaving(false)
    if (res.status === 409) {
      const d = await res.json()
      setConflict({ id: d.conflict_id, title: d.conflict_title, message: d.error })
      return
    }
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Save failed')
      return
    }
    onSaved()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setConflict(null)
    if (form.start_time && form.end_time && form.start_time >= form.end_time) {
      setError('Start time must be before end time')
      return
    }
    await save()
  }

  const handleReplace = async () => {
    setReplacing(true)
    const deleteRes = await apiFetch(`/api/events/${conflict.id}`, { method: 'DELETE' })
    if (!deleteRes.ok) {
      setReplacing(false)
      setError('Could not remove the existing event — please try again.')
      return
    }
    setConflict(null)
    // Inline the save to avoid stale closure from calling save()
    const url = event ? `/api/events/${event.id}` : '/api/events'
    const method = event ? 'PUT' : 'POST'
    const res = await apiFetch(url, { method, body: JSON.stringify(form) })
    setReplacing(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Save failed')
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{event ? 'Edit Event' : 'Add Event'}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="auth-error" style={{ margin: '0 20px 12px' }}>{error}</div>}

        {conflict && (
          <div className="conflict-banner">
            <div className="conflict-banner-msg">⚠ {conflict.message}</div>
            <div className="conflict-banner-actions">
              <button className="bulk-resolve-btn skip" onClick={() => setConflict(null)}>
                Keep existing
              </button>
              <button className="bulk-resolve-btn replace" onClick={handleReplace} disabled={replacing}>
                {replacing ? 'Replacing…' : `Replace '${conflict.title}'`}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="field">
            <label className="field-label">Title</label>
            <input className="field-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label">Category</label>
            <select className="field-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Date</label>
            <input className="field-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Start time</label>
              <input className="field-input" type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label">End time</label>
              <input className="field-input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label className="field-label">Duration (minutes)</label>
            <input className="field-input" type="number" min="1" value={form.duration_minutes}
              onChange={e => set('duration_minutes', e.target.value)} required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || replacing}>
              {saving ? 'Saving…' : event ? 'Save changes' : 'Add event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

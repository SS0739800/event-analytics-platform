import { useState } from 'react'
import { apiFetch } from '../lib/api'
import { invalidateCategoriesCache } from '../lib/categories'

export default function CategoryModal({ categories, onClose, onSaved }) {
  const [cats, setCats]   = useState([...categories])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const add = () => {
    const name = input.trim()
    if (!name) return
    if (cats.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      setError('Category already exists'); return
    }
    setCats(c => [...c, name])
    setInput('')
    setError('')
  }

  const remove = (cat) => setCats(c => c.filter(x => x !== cat))

  const save = async () => {
    if (cats.length === 0) { setError('You need at least one category'); return }
    setSaving(true)
    const res = await apiFetch('/api/categories', {
      method: 'PUT',
      body: JSON.stringify({ categories: cats }),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Save failed'); return }
    invalidateCategoriesCache()
    onSaved(cats)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚙ Manage Categories</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cat-list">
            {cats.map(c => (
              <div key={c} className="cat-chip">
                <span>{c}</span>
                <button className="cat-chip-del" onClick={() => remove(c)}>✕</button>
              </div>
            ))}
          </div>
          <div className="query-input-row">
            <input className="field-input" placeholder="New category name…"
              value={input} onChange={e => { setInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="btn btn-outline" onClick={add} disabled={!input.trim()}>Add</button>
          </div>
          {error && <div className="auth-error" style={{ margin: 0 }}>{error}</div>}
          <div className="modal-actions" style={{ paddingTop: 0 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save categories'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

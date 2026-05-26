import { useState } from 'react'
import { apiFetch } from '../lib/api'

export default function AIParseModal({ onClose, onParsed, onBulkParsed }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')

    const res = await apiFetch('/api/parse-event', {
      method: 'POST',
      body: JSON.stringify({ text }),
    })

    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Could not parse — try rephrasing')
      return
    }

    const parsed = await res.json()
    if (parsed.length === 1) {
      onParsed(parsed[0])
    } else {
      onBulkParsed(parsed)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleParse()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">✨ Add with AI</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="ai-parse-body">
          <p className="ai-parse-hint">
            Describe one event or a recurring schedule — AI will figure it out.
          </p>
          <textarea
            className="field-input ai-parse-textarea"
            rows={3}
            placeholder={'e.g. "Gym tomorrow 7am" or "Cooking every Friday in June at 6pm"'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <p className="ai-parse-tip">Tip: Ctrl+Enter to parse</p>
          {error && <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>}
          <div className="modal-actions" style={{ marginTop: 12 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleParse} disabled={loading || !text.trim()}>
              {loading ? 'Thinking…' : 'Parse with AI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

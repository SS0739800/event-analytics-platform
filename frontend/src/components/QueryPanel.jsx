import { useState } from 'react'
import { apiFetch } from '../lib/api'

const EXAMPLES = [
  'How many hours did I spend on Gym last month?',
  'What was my busiest week this year?',
  'Which category takes the most time on average?',
]

export default function QueryPanel() {
  const [question, setQuestion] = useState('')
  const [answer,   setAnswer]   = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const ask = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError('')
    setAnswer(null)
    const res = await apiFetch('/api/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    })
    setLoading(false)
    if (!res.ok) { const d = await res.json(); setError(d.error || 'Could not answer'); return }
    const d = await res.json()
    setAnswer(d.answer)
  }

  const handleKey = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask() }

  return (
    <div className="card query-panel">
      <div className="card-header">
        <div>
          <div className="card-title">💬 Ask About Your Data</div>
          <div className="card-subtitle">Ask anything about your activity history</div>
        </div>
      </div>
      <div className="query-body">
        <div className="query-examples">
          {EXAMPLES.map(ex => (
            <button key={ex} className="query-example-chip"
              onClick={() => { setQuestion(ex); setAnswer(null); setError('') }}>
              {ex}
            </button>
          ))}
        </div>
        <div className="query-input-row">
          <input
            className="field-input"
            placeholder="e.g. How many Gym hours did I log in May?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="btn btn-primary" onClick={ask} disabled={loading || !question.trim()}>
            {loading ? '…' : 'Ask'}
          </button>
        </div>
        {error  && <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>}
        {answer && (
          <div className="query-answer">
            <div className="query-answer-label">Answer</div>
            <div className="query-answer-text">{answer}</div>
          </div>
        )}
      </div>
    </div>
  )
}

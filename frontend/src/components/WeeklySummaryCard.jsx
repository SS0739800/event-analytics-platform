import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import Icon from './Icon'

export default function WeeklySummaryCard({ refreshKey }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setSummary(null)
    apiFetch('/api/weekly-summary')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSummary(d?.summary ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  return (
    <div className="card weekly-summary-card">
      <div className="card-header">
        <div>
          <div className="card-title"><Icon name="calendar" />This Week at a Glance</div>
          <div className="card-subtitle">AI-generated weekly summary</div>
        </div>
      </div>
      <div className="weekly-summary-body">
        {loading
          ? <div className="ai-loading">Generating your weekly summary…</div>
          : summary
            ? <p className="weekly-summary-text">{summary}</p>
            : <div className="ai-loading">No events this week yet.</div>}
      </div>
    </div>
  )
}

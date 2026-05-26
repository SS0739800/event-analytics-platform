import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'

export default function AIInsightsCard({ refreshKey }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setInsights(null)
    apiFetch('/api/insights')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setInsights(d?.insights ?? null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refreshKey])

  const lines = insights
    ? insights.split('\n').filter(l => l.trim())
    : []

  return (
    <div className="card ai-insights-card">
      <div className="card-header">
        <div>
          <div className="card-title">✨ AI Insights</div>
          <div className="card-subtitle">Powered by Claude</div>
        </div>
      </div>
      <div className="ai-insights-body">
        {loading ? (
          <div className="ai-loading">Analyzing your activity data…</div>
        ) : lines.length ? (
          <ul className="ai-insights-list">
            {lines.map((line, i) => (
              <li key={i}>{line.replace(/^[•\-*]\s*/, '')}</li>
            ))}
          </ul>
        ) : (
          <div className="ai-loading">Add some events to get personalized AI insights!</div>
        )}
      </div>
    </div>
  )
}

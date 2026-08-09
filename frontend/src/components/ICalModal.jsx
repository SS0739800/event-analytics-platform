import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import Icon from './Icon'

export default function ICalModal({ onClose }) {
  const [url, setUrl]       = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/ical-token')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.url) setUrl(d.url); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    apiFetch('/export/ical').then(async r => {
      if (!r.ok) { alert('Download failed — please try again.'); return }
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'events.ics'
      a.click()
      URL.revokeObjectURL(a.href)
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title"><Icon name="calendar" />Calendar Export</span>
          <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Download */}
          <div className="ical-option">
            <div className="ical-option-title">One-time download</div>
            <div className="ical-option-desc">
              Download a snapshot of all your events as an <code>.ics</code> file and import it into Google Calendar, Apple Calendar, or Outlook.
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={download}>
              <Icon name="download" />Download .ics
            </button>
          </div>

          <div className="ical-divider" />

          {/* Subscribe */}
          <div className="ical-option">
            <div className="ical-option-title">Live subscription URL</div>
            <div className="ical-option-desc">
              Add this URL to your calendar app — it stays current and refreshes automatically (Google Calendar syncs every ~24 hours).
            </div>
            {loading
              ? <div className="ai-loading" style={{ padding: 0 }}>Generating link…</div>
              : (
                <div className="ical-url-row">
                  <input className="field-input" readOnly value={url}
                    style={{ fontSize: 11.5, fontFamily: 'monospace' }} />
                  <button className="btn btn-outline" onClick={copy} style={{ flexShrink: 0 }}>
                    {copied ? <><Icon name="check" size={13} />Copied</> : 'Copy'}
                  </button>
                </div>
              )}
            <div className="ical-how">
              <strong>Google Calendar:</strong> Other calendars → From URL → paste above<br />
              <strong>Apple Calendar:</strong> File → New Calendar Subscription → paste above<br />
              <strong>Outlook:</strong> Add calendar → From internet → paste above
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

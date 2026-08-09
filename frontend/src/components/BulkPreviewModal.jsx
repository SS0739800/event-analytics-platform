import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/api'
import Icon from './Icon'

export default function BulkPreviewModal({ events: rawEvents, onClose, onSaved }) {
  const [rows, setRows] = useState(null)        // validated events with conflict info
  const [validating, setValidating] = useState(true)
  const [validateError, setValidateError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    apiFetch('/api/events/validate-bulk', {
      method: 'POST',
      body: JSON.stringify(rawEvents),
    })
      .then(async r => {
        if (!r.ok) throw new Error('Validation failed')
        return r.json()
      })
      .then(data => setRows(data.map(e => ({ ...e, _resolution: null, _working: false }))))
      .catch(() => setValidateError('Could not validate events — please try again.'))
      .finally(() => setValidating(false))
  }, [])

  const setRow = (i, patch) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))

  const handleSkip = (i) => setRow(i, { _resolution: 'skip' })
  const handleUnskip = (i) => setRow(i, { _resolution: null })

  const handleReplace = async (i) => {
    const row = rows[i]
    if (!row.conflict_id) return
    setRow(i, { _working: true })
    try {
      await apiFetch(`/api/events/${row.conflict_id}`, { method: 'DELETE' })
      setRow(i, { conflict: null, conflict_id: null, _resolution: 'replaced', _working: false })
    } catch {
      setRow(i, { _working: false })
    }
  }

  const toCreate = rows
    ? rows.filter(r => r._resolution !== 'skip' && (!r.conflict || r._resolution === 'replaced'))
    : []
  const skipped = rows ? rows.filter(r => r._resolution === 'skip') : []
  const unresolved = rows ? rows.filter(r => r.conflict && !r._resolution) : []
  const allResolved = unresolved.length === 0

  const handleCreate = async () => {
    setSaving(true)
    setSaveError('')
    const payload = toCreate.map(({ _resolution, _working, conflict, conflict_id, ...e }) => e)
    const res = await apiFetch('/api/events/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box bulk-preview-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">
            {validating ? <><Icon name="sparkle" />Checking for conflicts…</>
              : validateError ? <><Icon name="warning" />Validation error</>
              : <><Icon name="sparkle" />{toCreate.length} of {rows.length} events ready</>}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>

        {!validating && !validateError && unresolved.length > 0 && (
          <div className="bulk-conflict-banner">
            <Icon name="warning" />{unresolved.length} conflict{unresolved.length > 1 ? 's' : ''} need resolution — skip or replace each one below
          </div>
        )}

        {validateError && (
          <div className="auth-error" style={{ margin: '12px 20px 0' }}>{validateError}</div>
        )}

        {!validateError && (
          <div className="bulk-preview-list">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Title</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(rows || rawEvents).map((row, i) => {
                  const res = row._resolution
                  const hasConflict = row.conflict && res !== 'replaced'
                  const isSkipped = res === 'skip'
                  const canReplace = hasConflict && row.conflict_id

                  return (
                    <tr key={i}
                      className={hasConflict && !isSkipped ? 'bulk-row-conflict' : isSkipped ? 'bulk-row-skipped' : ''}>
                      <td>{row.date}</td>
                      <td style={{ fontWeight: 500 }}>{row.title}</td>
                      <td>{row.start_time} – {row.end_time}</td>
                      <td>{row.duration_minutes} min</td>
                      <td>
                        {validating
                          ? <span className="bulk-status-checking">…</span>
                          : isSkipped
                            ? <span className="bulk-status-skipped">Skipped</span>
                            : hasConflict
                              ? <span className="bulk-status-conflict" title={row.conflict}><Icon name="warning" size={12} />Conflict</span>
                              : <span className="bulk-status-ok"><Icon name="check" size={14} /></span>}
                      </td>
                      <td>
                        {!validating && hasConflict && !isSkipped && (
                          <div className="bulk-resolve-btns">
                            <button className="bulk-resolve-btn skip"
                              onClick={() => handleSkip(i)} disabled={row._working}>
                              Skip
                            </button>
                            {canReplace && (
                              <button className="bulk-resolve-btn replace"
                                onClick={() => handleReplace(i)} disabled={row._working}>
                                {row._working ? '…' : 'Replace'}
                              </button>
                            )}
                          </div>
                        )}
                        {!validating && isSkipped && (
                          <button className="bulk-resolve-btn undo"
                            onClick={() => handleUnskip(i)}>
                            Undo
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {saveError && <div className="auth-error" style={{ margin: '0 20px 12px' }}>{saveError}</div>}

        <div className="modal-actions" style={{ padding: '12px 20px 16px' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={saving || validating || !!validateError || !allResolved || toCreate.length === 0}
          >
            {saving ? 'Creating…'
              : toCreate.length === 0 ? 'Nothing to create'
              : skipped.length > 0 ? `Create ${toCreate.length} events (${skipped.length} skipped)`
              : `Create ${toCreate.length} events`}
          </button>
        </div>
      </div>
    </div>
  )
}

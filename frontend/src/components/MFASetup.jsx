import { useState } from 'react'
import supabase from '../lib/supabase'

export default function MFASetup({ onDone }) {
  const [step, setStep] = useState('idle') // idle | enrolling | verifying | done
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const startEnroll = async () => {
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setLoading(false)
    if (err) { setError(err.message); return }
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
    setFactorId(data.id)
    setStep('enrolling')
  }

  const startVerify = async () => {
    setError('')
    setLoading(true)
    const { data, error: err } = await supabase.auth.mfa.challenge({ factorId })
    setLoading(false)
    if (err) { setError(err.message); return }
    setChallengeId(data.id)
    setStep('verifying')
  }

  const verify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
    setLoading(false)
    if (err) { setError(err.message); return }
    setStep('done')
    onDone?.()
  }

  if (step === 'idle') return (
    <div className="mfa-box">
      <div className="mfa-title">Two-Factor Authentication</div>
      <p className="mfa-desc">Add an extra layer of security using any authenticator app (Google Authenticator, Authy, Duo).</p>
      <button className="btn btn-primary" onClick={startEnroll} disabled={loading}>
        {loading ? 'Setting up…' : 'Set up 2FA'}
      </button>
      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  )

  if (step === 'enrolling') return (
    <div className="mfa-box">
      <div className="mfa-title">Scan with your authenticator app</div>
      <p className="mfa-desc">Open your authenticator app and scan this QR code.</p>
      <img src={qr} alt="MFA QR Code" className="mfa-qr" />
      <p className="mfa-secret-label">Or enter this key manually:</p>
      <code className="mfa-secret">{secret}</code>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={startVerify} disabled={loading}>
        {loading ? 'Loading…' : 'Next — Enter code'}
      </button>
      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  )

  if (step === 'verifying') return (
    <div className="mfa-box">
      <div className="mfa-title">Verify your code</div>
      <p className="mfa-desc">Enter the 6-digit code from your authenticator app to confirm setup.</p>
      <form onSubmit={verify} className="auth-form">
        <div className="field">
          <label className="field-label">Authenticator code</label>
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />
        </div>
        <button className="btn btn-primary auth-btn" type="submit" disabled={loading}>
          {loading ? 'Verifying…' : 'Enable 2FA'}
        </button>
      </form>
      {error && <div className="auth-error" style={{ marginTop: 12 }}>{error}</div>}
    </div>
  )

  if (step === 'done') return (
    <div className="mfa-box">
      <div className="mfa-title">2FA enabled</div>
      <div className="auth-success">Two-factor authentication is now active on your account.</div>
    </div>
  )
}

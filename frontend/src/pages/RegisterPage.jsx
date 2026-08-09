import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { setToken } from '../lib/api'
import Icon from '../components/Icon'

const STEPS = ['details', 'scan', 'verify', 'done']

export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('details')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [pendingId, setPendingId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setPendingId(data.pending_id)
    setQr(data.qr_code)
    setSecret(data.secret)
    setStep('scan')
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/auth/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pending_id: pendingId, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setToken(data.token)
    setStep('done')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: step === 'scan' ? 440 : 400 }}>
        <div className="auth-logo">
          <div className="logo-mark" />
          <div className="logo-text">EventAnalytics<span className="logo-sub">PLATFORM</span></div>
        </div>

        <div className="reg-steps">
          {['Account', 'Scan QR', 'Verify', 'Done'].map((label, i) => (
            <div key={label} className={`reg-step ${i <= stepIndex ? 'active' : ''}`}>
              <div className="reg-dot">{i < stepIndex ? <Icon name="check" size={13} /> : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {step === 'details' && (
          <>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">You'll set up two-factor authentication next</p>
            <form onSubmit={handleRegister} className="auth-form">
              <div className="field">
                <label className="field-label">Full name</label>
                <input className="field-input" type="text" placeholder="John Doe"
                  value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <input className="field-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="field">
                <label className="field-label">Confirm password</label>
                <input className="field-input" type="password" placeholder="••••••••"
                  value={confirm} onChange={e => setConfirm(e.target.value)} required />
              </div>
              <button className="btn btn-primary auth-btn" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : 'Continue to 2FA setup'}
              </button>
            </form>
            <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
          </>
        )}

        {step === 'scan' && (
          <>
            <h1 className="auth-title">Set up authenticator</h1>
            <p className="auth-subtitle">
              Open <strong>Google Authenticator</strong>, <strong>Authy</strong>, or <strong>Duo</strong> and scan the QR code below.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
              <img src={qr} alt="MFA QR Code" className="mfa-qr" style={{ width: 200, height: 200 }} />
            </div>
            <p className="mfa-secret-label">Can't scan? Enter this key manually:</p>
            <code className="mfa-secret">{secret}</code>
            <button className="btn btn-primary auth-btn" style={{ marginTop: 16 }}
              onClick={() => setStep('verify')} disabled={loading}>
              {"I've scanned it — Next"}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <h1 className="auth-title">Verify your code</h1>
            <p className="auth-subtitle">Enter the 6-digit code from your authenticator app.</p>
            <form onSubmit={handleVerify} className="auth-form">
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
                  style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center' }}
                />
              </div>
              <button className="btn btn-primary auth-btn" type="submit" disabled={loading || code.length < 6}>
                {loading ? 'Verifying…' : 'Activate 2FA & finish'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <h1 className="auth-title">You're all set!</h1>
            <div className="auth-success">
              Your account is created and two-factor authentication is active.
              Every login will require your authenticator app.
            </div>
            <button className="btn btn-primary auth-btn" style={{ marginTop: 16 }} onClick={() => navigate('/dashboard')}>
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}

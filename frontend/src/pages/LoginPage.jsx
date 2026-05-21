import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { setToken } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState(null)
  const [step, setStep] = useState('password')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setUserId(data.user_id)
    setStep('mfa')
  }

  const handleMFA = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/auth/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, code }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setToken(data.token)
    navigate('/')
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">📊</div>
          <div className="logo-text">EventAnalytics<span className="logo-sub">PLATFORM</span></div>
        </div>

        {step === 'password' ? (
          <>
            <h1 className="auth-title">Sign in</h1>
            <p className="auth-subtitle">Access your personal activity dashboard</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handlePassword} className="auth-form">
              <div className="field">
                <label className="field-label">Email</label>
                <input className="field-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label">Password</label>
                <input className="field-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary auth-btn" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="auth-switch">Don't have an account? <Link to="/register">Create one</Link></p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Two-factor authentication</h1>
            <p className="auth-subtitle">Enter the code from your authenticator app</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleMFA} className="auth-form">
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
                {loading ? 'Verifying…' : 'Verify'}
              </button>
            </form>
            <p className="auth-switch">
              <span style={{ cursor: 'pointer', color: 'var(--accent)' }} onClick={() => setStep('password')}>
                ← Back
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

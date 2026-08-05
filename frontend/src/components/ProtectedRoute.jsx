import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { getToken, isTokenExpired, forceLogout } from '../lib/api'
import useIdleTimeout from '../lib/useIdleTimeout'

// Matches IDLE_TIMEOUT_MINUTES in src/auth/tokens.py. Keep them in step.
const IDLE_MS = 30 * 60 * 1000

export default function ProtectedRoute({ children }) {
  useIdleTimeout(IDLE_MS, () => forceLogout('idle'))

  // Signing out in one tab should sign out the rest.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) forceLogout('expired')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Checking expiry, not just presence — otherwise a stale tab flashes the
  // dashboard before the first API call fails.
  if (!getToken() || isTokenExpired()) {
    return <Navigate to="/login?reason=expired" replace />
  }
  return children
}

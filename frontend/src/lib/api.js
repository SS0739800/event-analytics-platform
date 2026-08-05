export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function clearToken() {
  localStorage.removeItem('token')
}

// Read `exp` without verifying — this is only for deciding when to redirect.
// The server is what actually rejects an expired token.
function readExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]))
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

export function isTokenExpired() {
  const token = getToken()
  if (!token) return true
  const expiresAt = readExpiry(token)
  // Can't read it? Let the server decide rather than locking the user out.
  return expiresAt === null ? false : Date.now() >= expiresAt
}

export function forceLogout(reason = 'expired') {
  clearToken()
  if (!window.location.pathname.startsWith('/login')) {
    window.location.replace(`/login?reason=${reason}`)
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // Every authenticated response carries a token with the idle window pushed
  // 30 minutes further out. Missing it just means the session hit its cap.
  const renewed = res.headers.get('X-Renewed-Token')
  if (renewed) setToken(renewed)

  // Only bail out if we actually sent a token — otherwise a 401 from the
  // login form would bounce the user around.
  if (res.status === 401 && token) forceLogout('expired')

  return res
}

import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

// Fires onIdle after timeoutMs with no user activity. Note that a backgrounded
// tab can have its timers throttled, so this isn't the real guarantee — the
// server's 30-minute token expiry is. This just makes the UI react promptly
// instead of leaving a dead dashboard on screen.
export default function useIdleTimeout(timeoutMs, onIdle) {
  const timer = useRef(null)
  const callback = useRef(onIdle)
  callback.current = onIdle

  useEffect(() => {
    let lastReset = 0

    const reset = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => callback.current(), timeoutMs)
    }

    // mousemove fires constantly; once a second is plenty.
    const onActivity = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      reset()
    }

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    reset()

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      clearTimeout(timer.current)
    }
  }, [timeoutMs])
}

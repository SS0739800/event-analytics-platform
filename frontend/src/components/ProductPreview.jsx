import { useEffect, useRef, useState } from 'react'

// A stylised, animated mock of the dashboard for the landing hero.
//
// Hand-built rather than a screenshot or a video: it stays sharp at any width,
// costs no bandwidth, needs no asset pipeline, and doesn't go stale when the
// real UI moves. The motion shows the product filling with activity, which is
// what a video of the app would show anyway.
//
// Numbers are illustrative — this is a picture of the product, not live data.

const LOOP_MS = 9000

const BARS = [62, 88, 45, 100, 74, 38, 56]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const TILES = [
  { label: 'Events', to: 248 },
  { label: 'Hours', to: 312 },
  { label: 'Categories', to: 6 },
]

const ROWS = [
  { title: 'Morning gym',        cat: 'Gym',       colour: '#c9541f', time: '07:00', dur: '60m' },
  { title: 'Algorithms lecture', cat: 'Academics', colour: '#a8380f', time: '09:30', dur: '90m' },
  { title: 'Meal prep',          cat: 'Cooking',   colour: '#eda100', time: '18:00', dur: '45m' },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Counts up over `duration`, then holds. Restarts whenever `cycle` changes.
function useCountUp(to, cycle, duration = 1400) {
  const [value, setValue] = useState(to)

  useEffect(() => {
    if (prefersReducedMotion()) { setValue(to); return }
    let raf
    const started = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration)
      // Ease out, so it decelerates into the final number instead of stopping dead.
      setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, cycle, duration])

  return value
}

function Tile({ label, to, cycle }) {
  const value = useCountUp(to, cycle)
  return (
    <div className="preview-tile">
      <div className="preview-tile-label">{label}</div>
      <div className="preview-tile-value">{value}</div>
    </div>
  )
}

export default function ProductPreview() {
  const [cycle, setCycle] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef(null)

  // The panel sits below the fold, so the loop only runs while it's on screen —
  // otherwise the first few cycles play to nobody and a visitor arrives partway
  // through one.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || prefersReducedMotion()) return
    const id = setInterval(() => setCycle(c => c + 1), LOOP_MS)
    return () => clearInterval(id)
  }, [visible])

  return (
    <div className="preview" ref={ref} aria-hidden="true">
      <div className="preview-bar">
        <span className="preview-dot" />
        <span className="preview-dot" />
        <span className="preview-dot" />
      </div>

      {/* Remounting on `cycle` restarts every CSS animation inside at once,
          which keeps the bars and rows in step with the counters. */}
      <div className="preview-body" key={`${visible}-${cycle}`}>
        <div className="preview-tiles">
          {TILES.map(t => <Tile key={t.label} {...t} cycle={cycle} />)}
        </div>

        <div className="preview-chart">
          <div className="preview-chart-head">Activity by day</div>
          <div className="preview-bars">
            {BARS.map((h, i) => (
              <div key={i} className="preview-bar-col">
                <div
                  className="preview-bar-fill"
                  style={{ '--h': `${h}%`, animationDelay: `${0.25 + i * 0.08}s` }}
                />
                <span className="preview-bar-label">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="preview-rows">
          {ROWS.map((r, i) => (
            <div
              key={r.title}
              className="preview-row"
              style={{ animationDelay: `${1.1 + i * 0.45}s` }}
            >
              <span className="preview-row-dot" style={{ background: r.colour }} />
              <span className="preview-row-title">{r.title}</span>
              <span className="preview-row-cat">{r.cat}</span>
              <span className="preview-row-time">{r.time}</span>
              <span className="preview-row-dur">{r.dur}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

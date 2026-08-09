import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearToken, getToken, hasValidSession } from '../lib/api'
import ProductPreview from '../components/ProductPreview'
import ActivityHeatmap from '../components/ActivityHeatmap'

// Numbered sections, alternating side to side. Each gets a small visual so the
// page isn't a wall of prose.
const FEATURES = [
  {
    n: '01',
    title: 'See where your time actually goes',
    desc: 'Charts across categories, time of day, day of week, and month-over-month trends. Six views, all driven by the events you log.',
    visual: 'chart',
  },
  {
    n: '02',
    title: 'Describe an event, skip the form',
    desc: 'Type "Gym every Monday in June 7–8am" and the parser turns it into structured events — single or recurring — for you to confirm.',
    visual: 'parse',
  },
  {
    n: '03',
    title: 'Insights written for your data',
    desc: 'An LLM reads your category mix, busiest hours, and weekly deltas, then tells you what changed and where the time went.',
    visual: 'insight',
  },
  {
    n: '04',
    title: 'A calendar that catches conflicts',
    desc: 'Monthly view with day detail. Overlapping events are refused before they save, with skip-or-replace on every conflict.',
    visual: 'calendar',
  },
  {
    n: '05',
    title: 'Your data, on your terms',
    desc: 'Export to CSV, Excel or PDF. Subscribe any calendar app to a live iCal feed. Every account is protected by mandatory two-factor auth.',
    visual: 'export',
  },
]

// Set to null to drop back to the plain white hero.
//
// The scrim assumes a dark-ish frame; if you swap in brighter footage, the
// gradient in .hero-scrim needs raising or the headline stops being readable.
const HERO_VIDEO = '/hero.mp4'

// No poster frame yet — export one still from the video and point this at it.
// Until then the hero holds a flat dark ground while the video decodes, which
// is what reduced-motion visitors keep permanently.
const HERO_POSTER = null

const STATS = [
  { value: '6',   label: 'Analytics views' },
  { value: 'AI',  label: 'Natural-language parsing' },
  { value: 'MFA', label: 'Required on every account' },
  { value: '∞',   label: 'Events tracked' },
]

const STEPS = [
  { n: '01', title: 'Create your account', desc: 'Register with an email and set up two-factor authentication.' },
  { n: '02', title: 'Log your activities', desc: 'Add events manually, or describe them in plain text and let the parser handle it.' },
  { n: '03', title: 'Find your patterns', desc: 'Explore the charts, read the AI insights, and keep the calendar in view.' },
]

function FeatureVisual({ kind }) {
  if (kind === 'parse') {
    return (
      <div className="fv fv-parse">
        <div className="fv-input">Gym every Monday in June 7–8am</div>
        <div className="fv-arrow">↓</div>
        <div className="fv-chips">
          <span className="fv-chip">Gym</span>
          <span className="fv-chip">Mon · 07:00–08:00</span>
          <span className="fv-chip">×4 in June</span>
        </div>
      </div>
    )
  }
  if (kind === 'insight') {
    return (
      <div className="fv fv-insight">
        <div className="fv-quote">
          “Academics took 41% of your logged hours this month, up 9 points on
          last month. Your busiest hour is 09:00, and Thursdays carry almost
          twice the load of any other weekday.”
        </div>
        <div className="fv-attr">AI Insights</div>
      </div>
    )
  }
  if (kind === 'calendar') {
    return (
      <div className="fv fv-cal">
        {Array.from({ length: 28 }).map((_, i) => (
          <div key={i} className={`fv-cal-cell${[3, 9, 10, 16, 22].includes(i) ? ' filled' : ''}${i === 10 ? ' clash' : ''}`} />
        ))}
      </div>
    )
  }
  if (kind === 'export') {
    return (
      <div className="fv fv-export">
        {['CSV', 'Excel', 'PDF', 'iCal'].map(f => (
          <span key={f} className="fv-format">{f}</span>
        ))}
      </div>
    )
  }
  // chart
  return (
    <div className="fv fv-chart">
      {[38, 64, 52, 88, 71, 46].map((h, i) => (
        <div key={i} className="fv-chart-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const isLoggedIn = hasValidSession()
  const reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  // Sweep an expired token so it isn't sent on the next request. Done in an
  // effect rather than during render, which must stay side-effect free.
  useEffect(() => {
    if (getToken() && !isLoggedIn) clearToken()
  }, [isLoggedIn])

  const ctas = isLoggedIn ? (
    <button className="landing-cta-primary" onClick={() => navigate('/dashboard')}>
      Open dashboard
    </button>
  ) : (
    <>
      <button className="landing-cta-primary" onClick={() => navigate('/register')}>
        Start for free
      </button>
      <button className="landing-cta-secondary" onClick={() => navigate('/login')}>
        Sign in
      </button>
    </>
  )

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-mark" />
          <span className="landing-nav-brand">EventAnalytics</span>
        </div>

        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
        </div>

        <div className="landing-nav-actions">
          {isLoggedIn ? (
            <button className="landing-cta-primary" onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          ) : (
            <>
              <button className="landing-btn-ghost" onClick={() => navigate('/login')}>
                Sign in
              </button>
              <button className="landing-cta-primary" onClick={() => navigate('/register')}>
                Get started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={`landing-hero${HERO_VIDEO ? ' has-video' : ''}`}>
        {HERO_VIDEO && (
          <div className="hero-media" aria-hidden="true">
            {/* Reduced-motion visitors get the still frame instead — a looping
                background video is exactly what that setting exists to stop.
                With no poster available they get the flat ground behind it. */}
            {reducedMotion ? (
              HERO_POSTER ? <img src={HERO_POSTER} alt="" className="hero-video" /> : null
            ) : (
              <video
                className="hero-video"
                src={HERO_VIDEO}
                poster={HERO_POSTER || undefined}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            )}
            {/* Scrim: text over raw footage is unreadable the moment a light
                frame comes round. */}
            <div className="hero-scrim" />
          </div>
        )}

        <div className="landing-hero-inner">
          <span className="landing-badge">Personal activity intelligence</span>
          <h1 className="landing-headline">
            Track your time.<br />
            <span className="landing-headline-accent">Understand your patterns.</span>
          </h1>
          <p className="landing-sub">
            EventAnalytics turns your daily activities into actionable insights.
            Log events, get AI-generated feedback, and spot trends — all in one place.
          </p>
          <div className="landing-hero-ctas">{ctas}</div>
        </div>

        <ProductPreview />
      </section>

      {/* ── Stats ── */}
      <section className="landing-stats">
        {STATS.map(s => (
          <div key={s.label} className="landing-stat">
            <div className="landing-stat-value">{s.value}</div>
            <div className="landing-stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Showcase ── */}
      <section className="landing-showcase">
        <div className="landing-showcase-inner">
          <div className="landing-showcase-copy">
            <div className="landing-section-label">A year at a glance</div>
            <h2 className="landing-section-title">Every day you logged, in one picture</h2>
            <p className="landing-sub" style={{ marginBottom: 0 }}>
              Consistency is easier to see than to remember. Each square is a day,
              shaded by the hours you tracked — so streaks, quiet weeks and the
              shape of your year all read at a glance.
            </p>
          </div>
          <div className="landing-showcase-panel">
            <ActivityHeatmap />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-features" id="features">
        <div className="landing-section-label">Features</div>
        <h2 className="landing-section-title">Everything you need to understand your time</h2>

        <div className="landing-feature-rows">
          {FEATURES.map((f, i) => (
            <div key={f.n} className={`landing-feature-row${i % 2 ? ' reverse' : ''}`}>
              <div className="landing-feature-copy">
                <div className="landing-feature-num">{f.n}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
              <div className="landing-feature-visual">
                <FeatureVisual kind={f.visual} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-how" id="how">
        <div className="landing-section-label">How it works</div>
        <h2 className="landing-section-title">Up and running in minutes</h2>
        <div className="landing-steps">
          {STEPS.map(s => (
            <div key={s.n} className="landing-step">
              <div className="landing-step-num">{s.n}</div>
              <div className="landing-step-title">{s.title}</div>
              <div className="landing-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta-banner">
        <h2 className="landing-cta-banner-title">Ready to take control of your time?</h2>
        <p className="landing-cta-banner-sub">Free to use. No credit card required.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ctas}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="landing-nav-logo">
          <div className="landing-mark" />
          <span className="landing-nav-brand">EventAnalytics</span>
        </div>
        <div className="landing-footer-copy">© {new Date().getFullYear()}</div>
      </footer>
    </div>
  )
}

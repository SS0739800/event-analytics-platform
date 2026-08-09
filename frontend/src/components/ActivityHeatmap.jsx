// A year of activity, one cell per day, shaded by hours logged.
//
// Columns are real weeks ending on the current one, and the month labels are
// derived from those same dates — an earlier version hardcoded Jan–Dec across
// 12 even columns, so the labels disagreed with the cells underneath them.

const WEEKS = 53
const DAYS = 7
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

function startOfWeek(d) {
  const s = new Date(d)
  s.setDate(s.getDate() - s.getDay())
  s.setHours(0, 0, 0, 0)
  return s
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Deterministic stand-in for the marketing page, so it renders the same every
// time. Weekdays run busier than weekends, which is what logged time looks like.
function illustrativeLevel(week, day) {
  const n = Math.sin(week * 12.9898 + day * 78.233) * 43758.5453
  const noise = n - Math.floor(n)
  const v = noise * (day === 0 || day === 6 ? 0.45 : 1) * (week > 28 && week < 34 ? 0.25 : 1)
  if (v < 0.18) return 0
  if (v < 0.38) return 1
  if (v < 0.6) return 2
  if (v < 0.8) return 3
  return 4
}

// `data` is keyed by date and valued in whole minutes.
function levelFor(minutes) {
  if (!minutes) return 0
  if (minutes < 60) return 1
  if (minutes < 150) return 2
  if (minutes < 240) return 3
  return 4
}

// Minutes below the hour, so a 45-minute event reads as "45m" rather than the
// "0.8h" you get from rounding it into hours.
function formatDuration(minutes) {
  const m = Math.round(minutes)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

export default function ActivityHeatmap({ data, title = 'Your year, one day at a time' }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // The grid ends on the current week, so the rightmost column is always now.
  const start = addDays(startOfWeek(today), -(WEEKS - 1) * 7)

  const cells = []
  const months = []
  let lastMonth = -1

  for (let w = 0; w < WEEKS; w++) {
    const colStart = addDays(start, w * 7)
    // Label a column only when its month differs from the column before it,
    // and skip the first column so a partial month doesn't crowd the edge.
    if (colStart.getMonth() !== lastMonth) {
      lastMonth = colStart.getMonth()
      if (w > 0) months.push({ col: w + 1, label: MONTHS[lastMonth] })
    }

    for (let d = 0; d < DAYS; d++) {
      const date = addDays(start, w * 7 + d)
      const future = date > today
      const minutes = data ? data[dateKey(date)] : null
      const level = future ? 0 : data ? levelFor(minutes) : illustrativeLevel(w, d)
      cells.push({ w, d, date, level, minutes, future })
    }
  }

  const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <figure className="heatmap">
      <figcaption className="heatmap-head">
        <span className="heatmap-title">{title}</span>
        <span className="heatmap-scale">
          <span className="heatmap-scale-label">Less</span>
          {[0, 1, 2, 3, 4].map(l => <span key={l} className={`heatmap-cell l${l}`} />)}
          <span className="heatmap-scale-label">More</span>
        </span>
      </figcaption>

      <div className="heatmap-months" aria-hidden="true">
        {months.map(m => (
          <span key={`${m.label}-${m.col}`} style={{ gridColumn: m.col }}>{m.label}</span>
        ))}
      </div>

      <div className="heatmap-grid" role="img" aria-label="Activity over the past year">
        {cells.map(({ w, d, date, level, minutes, future }) => (
          <span
            key={`${w}-${d}`}
            className={`heatmap-cell l${level}${future ? ' future' : ''}`}
            title={future ? undefined : `${fmt(date)} — ${minutes ? formatDuration(minutes) : 'nothing logged'}`}
          />
        ))}
      </div>
    </figure>
  )
}

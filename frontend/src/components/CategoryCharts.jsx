import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { CHART, tooltipStyle, tooltipCursor } from '../lib/chartTheme'
import { categoryColor } from '../lib/categories'

const axisTick = { fontSize: 11, fill: CHART.axis }

export default function CategoryCharts({ data, type, categories }) {
  if (!data) {
    return (
      <div className="card">
        <div className="loading">Loading…</div>
      </div>
    )
  }

  const cats = categories || data.events_by_category?.map(d => d.category) || []

  if (type === 'bar') {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Events by Category</div>
            <div className="card-subtitle">Event count per activity type</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.events_by_category} margin={{ top: 4, right: 8, left: -16, bottom: 28 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="category" tick={axisTick} angle={-20} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
              {/* One series, and the axis already names each bar — a different
                  hue per bar would re-encode what the labels say. */}
              <Bar dataKey="count" fill={CHART.bar} radius={[4, 4, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'pie') {
    // Slices carry identity by colour, so this is the one place per-category
    // hues earn their keep.
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
      const RADIAN = Math.PI / 180
      const r = innerRadius + (outerRadius - innerRadius) * 0.5
      const x = cx + r * Math.cos(-midAngle * RADIAN)
      const y = cy + r * Math.sin(-midAngle * RADIAN)
      return percent > 0.04 ? (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      ) : null
    }

    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Category Distribution</div>
            <div className="card-subtitle">Share of total events</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.events_by_category}
                dataKey="count"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={renderLabel}
                // A 2px surface ring keeps adjacent slices from bleeding together.
                stroke="#ffffff"
                strokeWidth={2}
              >
                {data.events_by_category.map(d => (
                  <Cell key={d.category} fill={categoryColor(d.category, cats)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            {data.events_by_category.map(d => (
              <span key={d.category} className="chart-legend-item">
                <span className="chart-legend-dot" style={{ background: categoryColor(d.category, cats) }} />
                {d.category}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'duration') {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Total Duration by Category</div>
            <div className="card-subtitle">Cumulative minutes across all events</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.duration_by_category} layout="vertical" margin={{ top: 4, right: 24, left: 60, bottom: 4 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ ...axisTick, fill: CHART.ink }} axisLine={false} tickLine={false} width={56} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} min`, 'Duration']} cursor={tooltipCursor} />
              <Bar dataKey="minutes" fill={CHART.bar} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

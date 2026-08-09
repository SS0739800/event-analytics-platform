import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import { CHART, tooltipStyle } from '../lib/chartTheme'
import { categoryColor } from '../lib/categories'

const axisTick = { fontSize: 11, fill: CHART.axis }

export default function TrendChart({ data, type, categories }) {
  if (!data) {
    return <div className="card"><div className="loading">Loading…</div></div>
  }

  if (type === 'monthly') {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Monthly Event Count</div>
            <div className="card-subtitle">Total events tracked per month</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.monthly_event_count} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <defs>
                {/* One series, so no hue is needed — the fill just gives the
                    line some weight without competing with it. */}
                <linearGradient id="inkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART.ink} stopOpacity={0.10} />
                  <stop offset="95%" stopColor={CHART.ink} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke={CHART.ink} strokeWidth={2}
                fill="url(#inkGrad)" dot={{ r: 3, fill: CHART.ink, strokeWidth: 0 }}
                activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'category') {
    const rows = data.category_trend
    if (!rows?.length) return null
    const series = Object.keys(rows[0]).filter(k => k !== 'month')
    const cats = categories || series

    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Category Trends</div>
            <div className="card-subtitle">Events per category over time</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {series.map(cat => (
                // Keyed to the category name, so hiding one series doesn't
                // repaint the rest.
                <Line key={cat} type="monotone" dataKey={cat}
                  stroke={categoryColor(cat, cats)} strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

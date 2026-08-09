import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { CHART, tooltipStyle, tooltipCursor } from '../lib/chartTheme'

const axisTick = { fontSize: 11, fill: CHART.axis }

export default function TimeCharts({ data, type }) {
  if (!data) {
    return <div className="card"><div className="loading">Loading…</div></div>
  }

  if (type === 'hours') {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Activity by Hour</div>
            <div className="card-subtitle">Number of events starting each hour</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.busiest_hours} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="hour" tick={{ ...axisTick, fontSize: 10 }} axisLine={false} tickLine={false}
                tickFormatter={h => `${h}:00`} interval={2} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={h => `${h}:00`} formatter={v => [v, 'Events']} cursor={tooltipCursor} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {/* Empty hours stay as faint placeholders so the shape of the
                    day is readable even where nothing happened. */}
                {data.busiest_hours.map(d => (
                  <Cell key={d.hour} fill={d.count > 0 ? CHART.bar : CHART.grid} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'days') {
    return (
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Activity by Day of Week</div>
            <div className="card-subtitle">Total events per weekday</div>
          </div>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.busiest_days} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" tick={axisTick} axisLine={false} tickLine={false}
                tickFormatter={d => d.slice(0, 3)} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
              <Bar dataKey="count" fill={CHART.bar} radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

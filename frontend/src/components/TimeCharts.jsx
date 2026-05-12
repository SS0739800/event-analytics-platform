import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e4e9f0',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
}

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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={h => `${h}:00`} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={h => `${h}:00`} formatter={v => [v, 'Events']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]}>
                {data.busiest_hours.map((d, i) => (
                  <Cell key={i} fill={d.count > 0 ? '#3b82f6' : '#e2e8f0'} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={d => d.slice(0, 3)} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

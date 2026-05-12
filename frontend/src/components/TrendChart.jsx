import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e4e9f0',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
}

export default function TrendChart({ data, type }) {
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
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                fill="url(#blueGrad)" dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
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
    const categories = Object.keys(rows[0]).filter(k => k !== 'month')

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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {categories.map((cat, i) => (
                <Line key={cat} type="monotone" dataKey={cat}
                  stroke={COLORS[i % COLORS.length]} strokeWidth={2}
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

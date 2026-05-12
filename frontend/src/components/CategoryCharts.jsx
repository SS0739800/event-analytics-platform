import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e4e9f0',
  borderRadius: 8,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,.08)',
}

export default function CategoryCharts({ data, type }) {
  if (!data) {
    return (
      <div className="card">
        <div className="loading">Loading…</div>
      </div>
    )
  }

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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#94a3b8' }} angle={-20} textAnchor="end" axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.events_by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  if (type === 'pie') {
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
              >
                {data.events_by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', justifyContent: 'center', marginTop: 4 }}>
            {data.events_by_category.map((d, i) => (
              <span key={d.category} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} min`, 'Duration']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                {data.duration_by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return null
}

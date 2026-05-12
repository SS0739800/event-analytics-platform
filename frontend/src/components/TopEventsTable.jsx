const CATEGORY_COLORS = {
  Gym: 'blue',
  Academics: 'green',
  Sports: 'orange',
  Recreation: 'purple',
  Cooking: 'red',
}

export default function TopEventsTable({ data }) {
  if (!data) return <div className="loading">Loading…</div>

  return (
    <table className="data-table">
      <thead>
        <tr>
          <th style={{ width: 48 }}>#</th>
          <th>Activity</th>
          <th>Category</th>
          <th>Duration</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {data.map((event, i) => (
          <tr key={i}>
            <td className="rank-cell">{i + 1}</td>
            <td style={{ fontWeight: 500 }}>{event.title}</td>
            <td>
              <span className={`badge ${CATEGORY_COLORS[event.category] ?? ''}`}>
                {event.category}
              </span>
            </td>
            <td>{event.duration_minutes} min</td>
            <td style={{ color: '#64748b' }}>{String(event.date)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

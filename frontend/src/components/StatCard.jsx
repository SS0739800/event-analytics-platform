export default function StatCard({ color, icon, label, value }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon-wrap ${color}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-number">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

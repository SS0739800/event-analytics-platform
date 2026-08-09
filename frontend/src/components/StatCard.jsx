import Icon from './Icon'

export default function StatCard({ color, icon, label, value }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-card-top">
        <div className={`stat-icon-wrap ${color}`}><Icon name={icon} /></div>
      </div>
      <div className="stat-info">
        <div className="stat-number">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

// Indicateur clé avec évolution par rapport à la période précédente
export default function KpiCard({ label, value, prev, icon, format = (v) => v, tone = '' }) {
  let trend = null;
  if (prev !== undefined) {
    const raw = typeof value === 'number' ? value : 0;
    const diff = prev === 0 ? (raw > 0 ? 100 : 0) : Math.round(((raw - prev) / prev) * 100);
    trend = { diff, up: diff >= 0 };
  }
  return (
    <div className={`kpi ${tone}`}>
      <div className="kpi-top"><span className="kpi-label">{label}</span>{icon && <span className="kpi-icon" aria-hidden="true">{icon}</span>}</div>
      <strong className="kpi-value">{format(value)}</strong>
      {trend && (
        <span className={`kpi-trend ${trend.up ? 'up' : 'down'}`}>
          {trend.up ? '▲' : '▼'} {Math.abs(trend.diff)} % <span className="muted">vs période précédente</span>
        </span>
      )}
    </div>
  );
}

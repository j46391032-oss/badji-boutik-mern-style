import { useState } from 'react';
import { fcfa } from '../../utils.js';

// Courbe SVG des ventes avec infobulle au survol (sans dépendance externe)
export default function SalesChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 800, H = 260, L = 12, R = 12, T = 24, B = 30;
  const max = Math.max(...data.map((d) => d.total), 1);
  const step = (W - L - R) / Math.max(data.length - 1, 1);
  const x = (i) => L + i * step;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - B} L${x(0).toFixed(1)},${H - B} Z`;
  const total = data.reduce((s, d) => s + d.total, 0);
  const short = (d) => d.slice(8, 10) + '/' + d.slice(5, 7);
  const every = Math.ceil(data.length / 8);
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ventes des ${data.length} derniers jours : ${fcfa(total)}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff9900" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff9900" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const gy = T + (H - T - B) * (1 - r);
          return (
            <g key={r}>
              <line x1={L} x2={W - R} y1={gy} y2={gy} className="chart-grid" />
              {r > 0 && <text x={L} y={gy - 4} className="chart-label">{fcfa(max * r)}</text>}
            </g>
          );
        })}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} className="chart-line" fill="none" />
        {data.map((d, i) => (
          <g key={d.date}>
            {i % every === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" className="chart-label">{short(d.date)}</text>}
            <rect x={x(i) - step / 2} y={T} width={Math.max(step, 4)} height={H - T - B} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {h && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="chart-cursor" />
            <circle cx={x(hover)} cy={y(h.total)} r="4.5" className="chart-dot" />
            <g transform={`translate(${Math.min(Math.max(x(hover) - 80, L), W - R - 160)},${T - 22})`}>
              <rect width="160" height="38" rx="6" className="chart-tip" />
              <text x="80" y="15" textAnchor="middle" className="chart-tip-text">{short(h.date)} · {h.orders} commande{h.orders > 1 ? 's' : ''}</text>
              <text x="80" y="31" textAnchor="middle" className="chart-tip-text strong">{fcfa(h.total)}</text>
            </g>
          </g>
        )}
      </svg>
      <figcaption className="muted small">Commandes annulées exclues — total de la période : <strong>{fcfa(total)}</strong></figcaption>
    </figure>
  );
}

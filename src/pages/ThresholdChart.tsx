import { useState } from 'react';
import { usd } from '../ui.ts';

export interface SweepPoint {
  pct: number;
  dollarsMissed: number;
  falseFlagCost: number;
  weightedCost: number;
  falseFlags: number;
  missed: number;
}

const SERIES = [
  { key: 'weightedCost', label: 'Total cost', cls: 's1', dash: '' },
  { key: 'falseFlagCost', label: 'False alarms', cls: 's2', dash: '6 4' },
  { key: 'dollarsMissed', label: 'Overcharges missed', cls: 's3', dash: '2 4' },
] as const;

const W = 640, H = 260, M = { t: 16, r: 16, b: 34, l: 56 };

/** Dollar-weighted cost of the price check at each tolerance. One y-axis, three series in dollars. */
export function ThresholdChart({ points, chosen }: { points: SweepPoint[]; chosen: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const maxX = points.at(-1)!.pct;
  const maxY = Math.ceil(Math.max(...points.map((p) => p.weightedCost)) / 500) * 500;
  const x = (v: number) => M.l + (v / maxX) * (W - M.l - M.r);
  const y = (v: number) => H - M.b - (v / maxY) * (H - M.t - M.b);
  const path = (k: (typeof SERIES)[number]['key']) => points.map((p, i) => `${i ? 'L' : 'M'}${x(p.pct)},${y(p[k])}`).join(' ');
  const yTicks = Array.from({ length: maxY / 500 + 1 }, (_, i) => i * 500).filter((_, i, a) => a.length <= 7 || i % 2 === 0);
  const best = points.find((p) => p.pct === chosen)!;
  const hp = hover === null ? null : points[hover];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * (W - M.l - M.r);
    setHover(Math.max(0, Math.min(points.length - 1, Math.round((rel / (W - M.l - M.r)) * maxX))));
  };

  return (
    <figure className="viz">
      <div className="legend" aria-hidden="true">
        {SERIES.map((s) => (
          <span key={s.key}>
            <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" className={`stroke ${s.cls}`} strokeDasharray={s.dash} /></svg>
            {s.label}
          </span>
        ))}
      </div>
      <div className="viz-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cost of price errors by tolerance. Lowest total cost at ${chosen}%: ${usd(best.weightedCost)}.`}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="grid" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" className="tick">{usd(t)}</text>
            </g>
          ))}
          {points.filter((p) => p.pct % 2 === 0).map((p) => (
            <text key={p.pct} x={x(p.pct)} y={H - M.b + 18} textAnchor="middle" className="tick">{p.pct}%</text>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" className="tick">Flag a price only when it is more than this % above the posted price</text>
          <line x1={x(chosen)} x2={x(chosen)} y1={M.t} y2={H - M.b} className="chosen" />
          {SERIES.map((s) => (
            <path key={s.key} d={path(s.key)} className={`stroke ${s.cls}`} strokeDasharray={s.dash} fill="none" />
          ))}
          <circle cx={x(chosen)} cy={y(best.weightedCost)} r={5} className="dot s1" />
          <text x={x(chosen) + 8} y={y(best.weightedCost) - 10} className="anno">Chosen: {chosen}% ({usd(best.weightedCost)})</text>
          {hp && <line x1={x(hp.pct)} x2={x(hp.pct)} y1={M.t} y2={H - M.b} className="crosshair" />}
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
        {hp && (
          <div className="tooltip" style={{ left: `${(x(hp.pct) / W) * 100}%` }}>
            <b>Tolerance {hp.pct}%</b>
            <span>Total cost: {usd(hp.weightedCost)}</span>
            <span>False alarms: {hp.falseFlags} × $150 = {usd(hp.falseFlagCost)}</span>
            <span>Missed: {hp.missed} overcharges, {usd(hp.dollarsMissed)}</span>
          </div>
        )}
      </div>
      <details className="table-view">
        <summary>Show as table</summary>
        <div className="table-scroll">
          <table className="gates">
            <thead>
              <tr><th>Tolerance</th><th className="num">False alarms</th><th className="num">Missed $</th><th className="num">Total cost</th></tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.pct} className={p.pct === chosen ? 'chosen-row' : ''}>
                  <td>{p.pct}%</td>
                  <td className="num">{p.falseFlags} ({usd(p.falseFlagCost)})</td>
                  <td className="num">{usd(p.dollarsMissed)}</td>
                  <td className="num">{usd(p.weightedCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

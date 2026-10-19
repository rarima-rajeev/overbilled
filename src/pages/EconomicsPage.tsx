import { useState } from 'react';
import { MODEL_TIERS, PIPELINE, auditCosts, roi, stepCost } from '../domain/economics.ts';
import type { AppState } from '../state.ts';
import { pct, usd } from '../ui.ts';
import { HeadQuote, PagePhoto, PhotoBand } from './PagePhoto.tsx';

const cents = (n: number) => (n === 0 ? "$0" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`);

export function EconomicsPage({ s }: { s: AppState }) {
  const { report } = s;
  const [success, setSuccess] = useState(40);
  const costs = auditCosts();
  const foundPerAudit = report.overall.dollarsCaught / report.cases;
  const r = roi(foundPerAudit, success / 100, costs.routed);

  return (
    <>
      <section className="page-head with-photo photo-right">
        <h1>Unit economics</h1>
        <p className="sub">What one audit costs to run, compared with the dollars it recovers.</p>
        <HeadQuote quote="Two cents of AI. Hundreds of dollars found.">
          About <b>{cents(costs.routed)}</b> per audit against <b>{usd(Math.round(foundPerAudit))}</b> in errors found. Compute is cheap;
          being wrong is what's expensive.
        </HeadQuote>
        <PagePhoto name="economics" />
      </section>

      <section className="card">
        <div className="stats">
          <div><strong>{cents(costs.routed)}</strong><span>Cost per audit, routed</span></div>
          <div><strong>{usd(Math.round(foundPerAudit))}</strong><span>Errors found per audit (test set avg.)</span></div>
          <div><strong>{usd(Math.round(r.recovered))}</strong><span>Expected recovered at {success}% dispute success</span></div>
          <div><strong>{Math.round(r.roi).toLocaleString()}×</strong><span>ROI per audit</span></div>
        </div>
        <label className="slider">
          <span className="muted small">
            Assumption: share of disputed dollars the hospital actually removes: <b>{success}%</b>
          </span>
          <input type="range" min={5} max={90} step={5} value={success} onChange={(e) => setSuccess(Number(e.target.value))} />
        </label>
        <p className="muted small">
          Even at 5% success, recovery ({usd(Math.round(foundPerAudit * 0.05))}) dwarfs the cost. The real constraint is
          not compute: it's precision, because false accusations cost far more than tokens. Test-set dollars are synthetic
          and illustrative, not a claim about real bills.
        </p>
      </section>

      <PhotoBand name="economics2" layout="right">About two cents of AI per audit. Compute is cheap; getting it wrong is what's expensive.</PhotoBand>
      <section className="card">

        <h2>Model routing: the right model for each step</h2>
        <p className="muted">
          Not every step needs the strongest model, and some steps shouldn't use a model at all.
        </p>
        <div className="table-scroll">
          <table className="gates rules">
            <thead>
              <tr>
                <th>Step</th>
                <th>Runs on</th>
                <th className="num">Tokens in / out</th>
                <th className="num">Cost</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {PIPELINE.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b>{p.name}</b>
                    <div className="muted small">{p.does}</div>
                  </td>
                  <td>
                    <span className={`runner ${p.runner}`}>{p.runner === 'code' ? 'Plain code' : MODEL_TIERS[p.runner].label}</span>
                  </td>
                  <td className="num">{p.runner === 'code' ? '—' : `${p.tokensIn.toLocaleString()} / ${p.tokensOut.toLocaleString()}`}</td>
                  <td className="num">{cents(stepCost(p))}</td>
                  <td className="small">{p.why}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td>Per audit</td>
                <td />
                <td />
                <td className="num"><b>{cents(costs.routed)}</b></td>
                <td className="small">
                  vs {cents(costs.allLarge)} with the large model everywhere: {pct(costs.savedPct)} cheaper.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>What would change this decision</h3>
        <ul className="notes">
          <li>Extraction has a built-in fallback: a bill that fails the line-total check is retried on the large model. If that happens on more than 2% of bills, move extraction to the large model.</li>
          <li>If a small model passes the letter grounding check as often as the large one in evals, letters move down a tier too.</li>
          <li>At this cost per audit, routing is about scale (thousands of audits a day), not about a single audit.</li>
        </ul>
        <p className="muted small">
          The letter step uses real numbers: Claude Sonnet 5.5 at {usd(MODEL_TIERS.large.inPerM)} in /{' '}
          {usd(MODEL_TIERS.large.outPerM)} out per million tokens, with token counts measured from the actual letter-writing run.
          The small-model price ({usd(MODEL_TIERS.small.inPerM)} / {usd(MODEL_TIERS.small.outPerM)}) is an assumption: in this
          demo the bills are already structured, so the extraction step is modeled, not run.
        </p>
      </section>
    </>
  );
}

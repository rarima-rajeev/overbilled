import { useMemo, useState } from 'react';
import { PRICE_TOLERANCE_PCT } from '../domain/checks.ts';
import { REFERENCE } from '../domain/reference.ts';
import { SANDBOX_CODES, scoreSandbox, type SandboxResult, type SandboxRow } from '../domain/sandbox.ts';
import type { AppState } from '../state.ts';
import { TYPE_LABEL, pct, usd } from '../ui.ts';
import { PagePhoto, PhotoBand } from './PagePhoto.tsx';

let nextId = 1000;
const blank = (): SandboxRow[] => SANDBOX_CODES.map((code, i) => ({ id: i, code, units: 1, charge: '' }));

/** A bill with a mix of planted errors and one trap, for visitors who don't want to type. */
function example(): SandboxRow[] {
  const rows = blank();
  const set = (code: string, charge: number, units = 1) => {
    const r = rows.find((x) => x.code === code)!;
    r.charge = String(charge);
    r.units = units;
  };
  set('99284', 1100);
  set('85025', 60);
  set('80053', 120);
  set('80048', 85); // unbundled inside 80053
  set('84484', 95);
  set('71046', 360); // 16% above posted price
  set('J7030', 93); // 3% above: under the tolerance, so it will be missed
  set('J1885', 250, 10); // over the 8-per-day limit
  const at = (code: string) => rows.findIndex((x) => x.code === code);
  rows.splice(at('85025') + 1, 0, { id: nextId++, code: '85025', units: 1, charge: '60', repeatOf: rows[at('85025')].id });
  rows.splice(at('84484') + 1, 0, { id: nextId++, code: '84484', units: 1, charge: '95', repeatOf: rows[at('84484')].id, reallyHadTwice: true });
  return rows;
}

export function TryPage({ s }: { s: AppState }) {
  const [rows, setRows] = useState<SandboxRow[]>(blank);
  const [result, setResult] = useState<SandboxResult | null>(null);
  // Bill line numbers, in table order, for rows that are on the bill (matches the numbering in the results).
  const lineOf = useMemo(() => {
    const m = new Map<number, number>();
    rows.filter((r) => Number(r.charge) > 0 && r.units > 0).forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [rows]);
  const billedCount = lineOf.size;

  const update = (id: number, patch: Partial<SandboxRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setResult(null);
  };
  const addRepeat = (r: SandboxRow) => {
    setRows((rs) => {
      const i = rs.findIndex((x) => x.id === r.id);
      const copy: SandboxRow = { id: nextId++, code: r.code, units: 1, charge: String(REFERENCE[r.code].postedCashPrice), repeatOf: r.id };
      return [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)];
    });
    setResult(null);
  };
  const remove = (id: number) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setResult(null);
  };
  const run = () => {
    setResult(scoreSandbox(rows, s.levels, PRICE_TOLERANCE_PCT));
    setTimeout(() => document.getElementById('try-results')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <>
      <section className="page-head with-photo photo-left">
        <h1>Try it yourself</h1>
        <p className="sub">
          Build a bill and plant your own errors: charge more than the standard price, add too many units, bill a test
          twice, or bill a basic panel next to a comprehensive one. Because you planted the errors, this page knows the
          truth and can score the agent's precision and recall.
        </p>
        <PagePhoto name="tryit" />
      </section>

      <section className="card">
        <div className="try-toolbar">
          <button className="btn" onClick={() => { setRows(example()); setResult(null); }}>Fill an example for me</button>
          <button className="btn" onClick={() => { setRows(blank()); setResult(null); }}>Clear</button>
          <span className="muted small">{billedCount} line{billedCount === 1 ? '' : 's'} on your bill. Leave a charge empty if it's not on your bill.</span>
        </div>
        <div className="table-scroll">
          <table className="bill try">
            <thead>
              <tr>
                <th>Line</th>
                <th>Code</th>
                <th>Service</th>
                <th className="num">Standard price</th>
                <th className="num">Max / day</th>
                <th className="num">Units</th>
                <th className="num">On your bill ($)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ref = REFERENCE[r.code];
                const isRepeat = r.repeatOf !== undefined;
                const unit = Number(r.charge) / (r.units || 1);
                const over = Number(r.charge) > 0 && unit > ref.postedCashPrice;
                return (
                  <tr key={r.id} className={isRepeat ? 'repeat' : ''}>
                    <td className="muted">{lineOf.get(r.id) ?? ''}</td>
                    <td className="mono">{r.code}</td>
                    <td>
                      {isRepeat ? <span className="muted">↳ billed again: </span> : null}
                      {ref.description}
                      {isRepeat && (
                        <label className="twice small">
                          <input type="checkbox" checked={!!r.reallyHadTwice} onChange={(e) => update(r.id, { reallyHadTwice: e.target.checked })} /> I really had this
                          twice
                        </label>
                      )}
                    </td>
                    <td className="num">{usd(ref.postedCashPrice)}</td>
                    <td className="num">{ref.maxUnitsPerDay}</td>
                    <td className="num">
                      <input
                        className="cell num-in"
                        type="number"
                        min={1}
                        max={50}
                        value={r.units}
                        aria-label={`Units for ${r.code}`}
                        onChange={(e) => update(r.id, { units: Math.max(1, Number(e.target.value) || 1) })}
                      />
                    </td>
                    <td className="num">
                      <input
                        className={over ? 'cell num-in over' : 'cell num-in'}
                        type="number"
                        min={0}
                        step="1"
                        placeholder="—"
                        value={r.charge}
                        aria-label={`Charge for ${r.code}`}
                        onChange={(e) => update(r.id, { charge: e.target.value })}
                      />
                    </td>
                    <td>
                      {isRepeat ? (
                        <button className="btn tiny" onClick={() => remove(r.id)} aria-label="Remove this row">Remove</button>
                      ) : (
                        <button className="btn tiny" onClick={() => addRepeat(r)} title="Add the same service again, as a possible duplicate">+ Again</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="actions try-run">
          <button className="btn primary" disabled={billedCount === 0} onClick={run}>
            Audit my bill
          </button>
          <span className="muted small">Standard price = the fictional hospital's posted cash price, per unit.</span>
        </div>
      </section>

      <PhotoBand name="tryit2" layout="right">Plant your own errors, press the button, and see whether the agent catches them.</PhotoBand>

      {result && <Results r={result} />}
    </>
  );
}

function Results({ r }: { r: SandboxResult }) {
  const highest = r.findings.reduce((m, f) => Math.max(m, f.level), 0);
  return (
    <div id="try-results">
      <section className="card">
        <h2>
          {r.agentTotal > 0 ? (
            <>
              The agent found <span className="money">{usd(r.agentTotal)}</span> you shouldn't owe.
            </>
          ) : (
            <>The agent found nothing to dispute.</>
          )}
        </h2>
        <p className="muted">
          Based on what you planted, the true overcharge is {usd(r.trueTotal)}.
          {r.agentTotal !== r.trueTotal && ' The gap is explained below.'}
        </p>
        <div className="stats">
          <div>
            <strong>{r.precision === null ? 'n/a' : pct(r.precision)}</strong>
            <span>
              Precision: {r.caught} right ÷ {r.findings.length} flagged
            </span>
          </div>
          <div>
            <strong>{r.recall === null ? 'n/a' : pct(r.recall)}</strong>
            <span>
              Recall: {r.caught} found ÷ {r.caught + r.missed.length} you planted
            </span>
          </div>
          <div>
            <strong>{r.falseFlags}</strong>
            <span>False flags (wrongly accused)</span>
          </div>
          <div>
            <strong>{highest ? `L${highest}` : '—'}</strong>
            <span>Highest action allowed on this bill</span>
          </div>
        </div>
        <p className="muted small">
          Each finding's level comes from that error type's track record across the {''}
          <a href="#/evals">eval set</a>, not from this one bill: a few lines are too little evidence to trust an agent with.
        </p>
      </section>

      {r.findings.length > 0 && (
        <section className="card">
          <h2>What the agent flagged, and what it may do</h2>
          <div className="table-scroll">
            <table className="gates">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Error</th>
                  <th className="num">Amount</th>
                  <th>Right?</th>
                  <th>Level and action</th>
                </tr>
              </thead>
              <tbody>
                {r.findings.map((f) => (
                  <tr key={`${f.line}-${f.type}`} className={f.outcome === 'false_flag' ? 'wrong-row' : ''}>
                    <td>
                      {f.line} <span className="mono muted">{f.code}</span>
                    </td>
                    <td>
                      <span className={`badge ${f.type}`}>{TYPE_LABEL[f.type]}</span>
                      {f.why && <div className="muted small">{f.why}</div>}
                    </td>
                    <td className="num">{usd(f.overcharge)}</td>
                    <td>{f.outcome === 'caught' ? '✅ Real error' : '❌ False flag'}</td>
                    <td>
                      <b>L{f.level}</b> · {f.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(r.missed.length > 0 || r.questions.length > 0) && (
        <section className="card">
          {r.missed.length > 0 && (
            <>
              <h2>What the agent missed</h2>
              <ul className="notes">
                {r.missed.map((m) => (
                  <li key={`${m.line}-${m.type}`}>
                    Line {m.line} ({m.code}), {TYPE_LABEL[m.type].toLowerCase()}, {usd(m.amount)}: {m.why}
                  </li>
                ))}
              </ul>
              <p className="muted small">
                Missing small overcharges is a deliberate trade-off: flagging every cent would also flag legitimate
                price-list changes. See how 6% was chosen on the <a href="#/costs">Costs</a> page.
              </p>
            </>
          )}
          {r.questions.length > 0 && (
            <>
              <h3>Worth asking about (not scored)</h3>
              <ul className="notes">
                {r.questions.map((q) => (
                  <li key={q.line}>{q.explanation}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

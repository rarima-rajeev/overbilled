import { useEffect, useMemo, useState } from 'react';
import { SAMPLE_BILLS } from '../domain/bills.ts';
import { recommendForBill } from '../domain/recommend.ts';
import { HOSPITAL, REFERENCE } from '../domain/reference.ts';
import type { AppState } from '../state.ts';
import { TYPE_LABEL, findingKey, usd } from '../ui.ts';
import { AgentSuggestion } from './AgentSuggestion.tsx';
import { PagePhoto, PhotoBand } from './PagePhoto.tsx';

export function AuditPage({ s }: { s: AppState }) {
  const { bill, billId, setBillId, result, steps, ai, report, levels } = s;
  const [shownSteps, setShownSteps] = useState(0);
  const done = shownSteps >= steps.length;

  // Replay the agent's tool calls one by one when a bill is picked.
  useEffect(() => {
    setShownSteps(0);
    const timers = steps.map((_, i) => setTimeout(() => setShownSteps(i + 1), 300 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  const flagged = new Map([...result.questions, ...result.findings].map((f) => [f.line, f]));
  const q = result.questions.length;
  const rec = useMemo(() => recommendForBill(result, bill.lines.length, report, levels), [result, bill, report, levels]);

  return (
    <>
      <section className="hero with-photo">
        <p className="eyebrow">Sample bills</p>
        <div className="chips" role="tablist">
          {SAMPLE_BILLS.map((b) => (
            <button key={b.id} role="tab" aria-selected={b.id === billId} className={b.id === billId ? 'chip on' : 'chip'} onClick={() => setBillId(b.id)}>
              {b.title}
            </button>
          ))}
        </div>
        <h1>
          {!done ? (
            <>Auditing {bill.title.toLowerCase()}…</>
          ) : result.totalOvercharge > 0 ? (
            <>
              <span className="money">{usd(result.totalOvercharge)}</span> in billing errors found on this bill.
            </>
          ) : q > 0 ? (
            <>Nothing to dispute, but {q === 1 ? 'one thing is' : `${q} things are`} worth asking about.</>
          ) : (
            <>No billing errors on this one. The agent doesn't invent problems.</>
          )}
        </h1>
        <PagePhoto name="audit" />
      </section>

      {done && <AgentSuggestion rec={rec} />}

      <PhotoBand name="audit2" layout="wide">Most people never check an itemized bill line by line. The agent does it in seconds.</PhotoBand>

      <section className="grid">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Itemized bill</h2>
              <p className="muted">
                {bill.hospital} ({HOSPITAL.note.toLowerCase()}) · {bill.patient} · {bill.payer}
              </p>
            </div>
            <div className="total">
              <span className="muted">Billed</span>
              <strong>{usd(result.totalBilled)}</strong>
            </div>
          </div>
          <div className="table-scroll">
            <table className="bill">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Service</th>
                  <th className="num">Units</th>
                  <th className="num">Charge</th>
                </tr>
              </thead>
              <tbody>
                {bill.lines.map((l) => {
                  const f = done ? flagged.get(l.line) : undefined;
                  return (
                    <tr key={l.line} className={f ? (f.type === 'upcoding' ? 'asked' : 'flagged') : ''}>
                      <td>{l.line}</td>
                      <td className="mono">
                        {l.code}
                        {l.modifier && <span className="mod">-{l.modifier}</span>}
                      </td>
                      <td>
                        {REFERENCE[l.code]?.description ?? 'Unknown service'}
                        {f && <span className={`badge ${f.type}`}>{TYPE_LABEL[f.type]}</span>}
                      </td>
                      <td className="num">{l.units}</td>
                      <td className="num">{usd(l.charge)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2>Agent run</h2>
          <ol className="steps">
            {steps.map((st, i) => (
              <li key={st.tool} className={i < shownSteps ? 'shown' : ''}>
                <code>{st.tool}()</code>
                <span>{st.label}</span>
                {i < shownSteps && st.tool === 'benchmark_context' && <b className="ok">{st.found} noted</b>}
                {i < shownSteps && st.tool === 'upcoding_check' && <b className={st.found ? 'ask' : 'ok'}>{st.found ? `${st.found} to ask` : 'clear'}</b>}
                {i < shownSteps && !['parse_bill', 'benchmark_context', 'upcoding_check'].includes(st.tool) && (
                  <b className={st.found ? 'hit' : 'ok'}>{st.found ? `${st.found} found` : 'clear'}</b>
                )}
              </li>
            ))}
          </ol>
          {done && ai && <p className="ai-summary">{ai.summary}</p>}
          {done && (
            <div className="findings">
              {result.findings.length === 0 && q === 0 && <p className="muted">Every line passed every check.</p>}
              {result.findings.map((f) => (
                <article key={findingKey(f)} className="finding">
                  <div className="finding-top">
                    <span className={`badge ${f.type}`}>{TYPE_LABEL[f.type]}</span>
                    <strong className="money">−{usd(f.overcharge)}</strong>
                  </div>
                  <p>{f.explanation}</p>
                  <p className="cite">{f.citation}</p>
                </article>
              ))}
              {result.questions.map((f) => (
                <article key={findingKey(f)} className="finding question">
                  <div className="finding-top">
                    <span className={`badge ${f.type}`}>Worth asking: {TYPE_LABEL[f.type].toLowerCase()}</span>
                    <span className="muted small">up to {usd(f.overcharge)}, not disputed</span>
                  </div>
                  <p>{f.explanation}</p>
                  <p className="cite">{f.citation}</p>
                </article>
              ))}
              {result.notes.length > 0 && (
                <details className="context">
                  <summary>Price context (not disputed)</summary>
                  <p className="muted">
                    Lines charged far above an illustrative Medicare-style benchmark. High, but not a rule violation, so the
                    agent only mentions them.
                  </p>
                  <ul>
                    {result.notes.map((n) => (
                      <li key={n.line}>
                        Line {n.line} ({n.code}): {usd(n.unitCharge)} vs {usd(n.benchmarkRate)} benchmark, about {n.multiple}×
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </section>

      <a className="cta" href="#/autonomy">
        See what the agent does next: draft, send, follow up →
      </a>
    </>
  );
}

import { useState } from 'react';
import { LEVELS } from '../domain/autonomy.ts';
import { STAGES, effectiveLevel, type Stage } from '../domain/escalation.ts';
import type { AppState } from '../state.ts';
import { TYPE_LABEL, usd } from '../ui.ts';

const SHORT_ACTION = {
  1: 'Prepares the facts; you decide',
  2: 'Drafts; you send',
  3: 'Sends after your approval',
  4: 'Sends and follows up on its own',
};

/** Escalation ladder (who receives the dispute) and how it caps the agent's autonomy. */
export function EscalationSection({ s }: { s: AppState }) {
  const [stage, setStage] = useState<Stage>(1);
  const spec = STAGES[stage - 1];
  const findings = s.result.findings;

  return (
    <section className="card">
      <h2>Escalation: who receives the dispute</h2>
      <p className="muted">
        A second ladder, separate from L1–L4. If the hospital doesn't fix the bill, the dispute moves up to more senior
        people. <b>The higher it goes, the less the agent does on its own.</b>
      </p>

      <div className="table-scroll">
        <table className="gates rules stages">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Who receives it</th>
              <th>When it moves here</th>
              <th>Agent may do at most</th>
            </tr>
          </thead>
          <tbody>
            {STAGES.map((st) => (
              <tr key={st.stage} className={st.stage === stage ? 'chosen-row' : ''} onClick={() => setStage(st.stage)}>
                <td>
                  <b>Stage {st.stage}</b>
                </td>
                <td>
                  {st.who}
                  <div className="muted small">{st.example}</div>
                </td>
                <td>{st.when}</td>
                <td>
                  <span className={`lvl l${st.maxLevel}`}>L{st.maxLevel}</span> {LEVELS[st.maxLevel - 1].name}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Titles vary by hospital. These are typical roles for a self-pay hospital bill.</p>

      <h3>On this bill: {s.bill.title}</h3>
      <div className="chips stage-chips" role="tablist">
        {STAGES.map((st) => (
          <button key={st.stage} role="tab" aria-selected={st.stage === stage} className={st.stage === stage ? 'chip sm on' : 'chip sm'} onClick={() => setStage(st.stage)}>
            Stage {st.stage}: {st.who}
          </button>
        ))}
      </div>
      <p className="stage-why">{spec.why}</p>

      {findings.length === 0 ? (
        <p className="muted">Nothing on this bill to dispute. Pick another bill above.</p>
      ) : (
        <div className="table-scroll">
          <table className="gates">
            <thead>
              <tr>
                <th>Charge</th>
                <th className="num">Amount</th>
                <th>Earned in evals</th>
                <th>At Stage {stage}, the agent…</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => {
                const earned = s.levels[f.type];
                const eff = effectiveLevel(earned, stage);
                return (
                  <tr key={`${f.line}-${f.type}`}>
                    <td>
                      Line {f.line} <span className={`badge ${f.type}`}>{TYPE_LABEL[f.type]}</span>
                    </td>
                    <td className="num">{usd(f.overcharge)}</td>
                    <td>
                      <span className={`lvl l${earned}`}>L{earned}</span>
                    </td>
                    <td>
                      <span className={`lvl l${eff}`}>L{eff}</span> {SHORT_ACTION[eff]}
                      {eff < earned && <span className="muted small"> · capped by the stage</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

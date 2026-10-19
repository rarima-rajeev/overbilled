import { useState } from 'react';
import { ApproveSendPanel, FlagOnlyPanel, FollowUpPanel } from '../LevelPanels.tsx';
import { DEMOTE_WINDOW, LEVELS, earned, levelAfterDrift, type Level } from '../domain/autonomy.ts';
import { SAMPLE_BILLS } from '../domain/bills.ts';
import { templateLetter } from '../domain/letter.ts';
import { DISPUTABLE, type ErrorType } from '../domain/types.ts';
import type { AppState } from '../state.ts';
import { EscalationSection } from './EscalationSection.tsx';
import { TYPE_LABEL, findingKey, pct, saveFile, usd } from '../ui.ts';
import { PagePhoto, PhotoBand } from './PagePhoto.tsx';

export function AutonomyPage({ s }: { s: AppState }) {
  const { bill, billId, setBillId, level, setLevel, result, report, levels, confirmed, toggle, needsConfirm, inLetter, letterResult, letter, useAi, ai } = s;
  const spec = LEVELS[level - 1];
  const earnedHere = report.byType.filter((t) => levels[t.type] >= level).map((t) => TYPE_LABEL[t.type]);
  const scoreOf = (t: ErrorType) => report.byType.find((x) => x.type === t)!;

  // Level 3 only sends items whose type earned Level 3; the rest stay as a draft for the patient.
  const sendable = inLetter.filter((f) => levels[f.type] >= 3);
  const draftOnly = inLetter.filter((f) => levels[f.type] < 3);
  const sendLetter =
    sendable.length === inLetter.length
      ? letter
      : templateLetter(bill, { ...result, findings: sendable, totalOvercharge: sendable.reduce((a, f) => a + f.overcharge, 0) });

  return (
    <>
      <section className="page-head with-photo photo-banner">
        <h1>Autonomy ladder</h1>
        <p className="sub">
          How much the agent may do on its own, from flagging only to following up without asking. Each error type earns a
          level from its <a href="#/evals">eval results</a>, and loses it if quality drifts.
        </p>
        <PagePhoto name="autonomy" />
      </section>

      <div className="picker">
        <span className="muted small">Bill:</span>
        {SAMPLE_BILLS.map((b) => (
          <button key={b.id} className={b.id === billId ? 'chip sm on' : 'chip sm'} onClick={() => setBillId(b.id)}>
            {b.title}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="levels" role="tablist">
          {LEVELS.map((l) => (
            <button key={l.level} role="tab" aria-selected={level === l.level} className={level === l.level ? 'level on' : 'level'} onClick={() => setLevel(l.level)}>
              <span>L{l.level}</span>
              {l.name}
            </button>
          ))}
        </div>

        <div className="level-body">
          <p>
            <strong>{spec.name}:</strong> {spec.does} <span className="muted">Gate: {spec.gate}</span>
          </p>

          {level >= 3 && (
            <div className={earnedHere.length ? 'earned' : 'locked'}>
              <p>
                {earnedHere.length ? (
                  <>
                    <strong>✅ Earned by: {earnedHere.join(', ')}.</strong> Other types stay at lower levels.
                  </>
                ) : (
                  <>
                    <strong>🔒 Simulation preview.</strong> No error type has earned Level {level} yet (it needs {spec.minCases}+ labeled cases per type at{' '}
                    {pct(spec.minPrecision)} precision).
                  </>
                )}{' '}
                Nothing is ever really sent in this demo.
              </p>
            </div>
          )}

          {level === 1 && <FlagOnlyPanel findings={result.findings} />}

          {level >= 2 && result.findings.some(needsConfirm) && (
            <div className="confirm">
              <p>
                <strong>Your confirmation needed.</strong> These types scored below the 90% precision needed to draft
                automatically, so the agent asks first:
              </p>
              {result.findings.filter(needsConfirm).map((f) => (
                <label key={findingKey(f)}>
                  <input type="checkbox" checked={confirmed.has(findingKey(f))} onChange={() => toggle(f)} /> Line {f.line},{' '}
                  {TYPE_LABEL[f.type].toLowerCase()} ({pct(scoreOf(f.type).precision)} precision): include {usd(f.overcharge)} in my dispute
                </label>
              ))}
            </div>
          )}

          {level === 2 &&
            (inLetter.length === 0 ? (
              <p className="muted">Nothing to dispute.</p>
            ) : (
              <>
                <div className="letter-head">
                  <span className="muted">
                    {useAi ? `Written by ${ai!.model} · dollar and citation checks passed` : 'Template letter (deterministic)'} · disputing{' '}
                    {usd(letterResult.totalOvercharge)}
                  </span>
                  <button className="btn" onClick={() => saveFile(`dispute-letter-${bill.id}.txt`, letter)}>
                    Download .txt
                  </button>
                </div>
                <pre className="letter">{letter}</pre>
                <p className="muted small">The agent stops here. You send it yourself, or move up to L3.</p>
              </>
            ))}

          {level === 3 && <ApproveSendPanel key={`${bill.id}-${sendable.length}`} bill={bill} letter={sendLetter} findings={sendable} draftOnly={draftOnly} />}
          {level === 4 && <FollowUpPanel key={`${bill.id}-${sendable.length}`} bill={bill} findings={sendable} />}
          {result.questions.length > 0 && (
            <p className="muted small">
              Possible upcoding on line {result.questions.map((q) => q.line).join(', ')} is never included: it is capped at L1 because only the medical
              record can confirm it.
            </p>
          )}
        </div>
      </section>

      <PhotoBand name="autonomy2" layout="left">Sending a letter on your behalf is a big step. The agent has to earn it, one error type at a time.</PhotoBand>

      <EscalationSection s={s} />

      <section className="card">
        <h2>Where each error type stands</h2>
        <p className="muted">From the held-out test set ({report.cases} bills).</p>
        <div className="table-scroll">
          <table className="gates">
            <thead>
              <tr>
                <th>Error type</th>
                <th className="num">Precision</th>
                <th className="num">Labeled cases</th>
                {LEVELS.map((l) => (
                  <th key={l.level} className="num">L{l.level}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.byType.map((t) => (
                <tr key={t.type}>
                  <td>
                    {TYPE_LABEL[t.type]}
                    {t.type === 'upcoding' && <span className="muted small"> · capped at L1</span>}
                  </td>
                  <td className="num">{pct(t.precision)}</td>
                  <td className="num">{t.caught + t.missed + t.falseFlags}</td>
                  {LEVELS.map((l) => (
                    <td key={l.level} className="num">
                      {earned(t, l) ? '✅' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Promotion and demotion rules</h3>
        <div className="table-scroll">
          <table className="gates rules">
            <thead>
              <tr>
                <th>Level</th>
                <th>Move up when</th>
                <th>Drop down when (production)</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((l) => (
                <tr key={l.level}>
                  <td>
                    <b>L{l.level}</b> {l.name}
                  </td>
                  <td>{l.gate}</td>
                  <td>{l.demoteRule}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Demotion thresholds sit below promotion thresholds, so a type does not flip between levels on small wobbles. To
          climb back, it must pass the promotion gate again on freshly labeled cases.
        </p>
      </section>

      <DriftSimulator s={s} />
    </>
  );
}

function DriftSimulator({ s }: { s: AppState }) {
  const candidates = DISPUTABLE.filter((t) => s.levels[t] >= 2);
  const [type, setType] = useState<ErrorType>(candidates.find((t) => s.levels[t] === 3) ?? candidates[0] ?? 'units');
  const [precision, setPrecision] = useState(96);
  const [incident, setIncident] = useState(false);
  const start = s.levels[type];
  const now: Level = levelAfterDrift(start, precision / 100, incident);

  return (
    <section className="card">
      <h2>What if quality drifts after launch?</h2>
      <p className="muted">
        Pretend the agent is live. Set its precision over the last {DEMOTE_WINDOW} real disputes and see where the demotion
        rules put it.
      </p>
      <div className="drift">
        <label>
          <span className="muted small">Error type</span>
          <select value={type} onChange={(e) => setType(e.target.value as ErrorType)}>
            {candidates.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]} (earned L{s.levels[t]})
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          <span className="muted small">Precision over the last {DEMOTE_WINDOW} disputes: <b>{precision}%</b></span>
          <input type="range" min={75} max={100} value={precision} onChange={(e) => setPrecision(Number(e.target.value))} />
        </label>
        <label className="inline">
          <input type="checkbox" checked={incident} onChange={(e) => setIncident(e.target.checked)} /> A false accusation was actually sent
        </label>
      </div>
      <div className={now < start ? 'drift-out down' : 'drift-out'}>
        <span>Earned in evals: <b>L{start}</b> {LEVELS[start - 1].name}</span>
        <span className="arrow">→</span>
        <span>
          Now: <b>L{now}</b> {LEVELS[now - 1].name}
        </span>
        <span className="muted small">
          {now < start
            ? `Demoted. ${LEVELS[start - 1].demoteRule} A person reviews recent disputes before it can climb back.`
            : 'Holding. Still above the demotion threshold.'}
        </span>
      </div>
    </section>
  );
}

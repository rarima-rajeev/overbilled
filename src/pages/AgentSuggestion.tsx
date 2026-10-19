import { LEVELS } from '../domain/autonomy.ts';
import { STAGES } from '../domain/escalation.ts';
import type { Recommendation } from '../domain/recommend.ts';
import { TYPE_LABEL, pct, usd } from '../ui.ts';

const I_CAN = {
  1: 'I flag the problems and you decide what to do.',
  2: 'I write the dispute letter and you send it.',
  3: 'I send the dispute letter as soon as you approve it.',
  4: 'I send the letter and follow up if the hospital goes quiet.',
};

/** Never round 99.6% up to "100%": that would overclaim. */
const reliable = (x: number) => (x >= 1 ? '100%' : x > 0.99 ? '99%+' : pct(x));

/** "What should I do next?" under the headline number on the Audit page. */
export function AgentSuggestion({ rec }: { rec: Recommendation }) {
  if (rec.kind === 'none') {
    return (
      <section className="suggest calm">
        <p className="suggest-label">Agent suggestion</p>
        <h2>No dispute needed.</h2>
        <p>{rec.reasons[0]} Pay the bill as it is, or keep it for your records.</p>
      </section>
    );
  }

  if (rec.kind === 'ask') {
    return (
      <section className="suggest calm">
        <p className="suggest-label">Agent suggestion · L1</p>
        <h2>Ask the hospital one question before you pay.</h2>
        {rec.reasons.map((r) => (
          <p key={r}>{r}</p>
        ))}
        <a className="btn" href="#/autonomy">What do the levels mean?</a>
      </section>
    );
  }

  const spec = LEVELS[rec.level - 1];
  return (
    <section className="suggest">
      <div className="suggest-head">
        <div>
          <p className="suggest-label">Agent suggestion</p>
          <h2>
            Raise a dispute. <span className="lvl">L{rec.level}</span> {spec.name}
          </h2>
          <p className="muted">
            I can take this up to <b>Level {rec.level}</b>: {I_CAN[rec.level]}
          </p>
          <p className="muted small">
            It goes first to <b>Stage 1: the {STAGES[0].who.toLowerCase()}</b>. If they don't fix it, it moves to the{' '}
            {STAGES[1].who.toLowerCase()} (Stage 2), where I need your approval for every message.{' '}
            <a href="#/autonomy">How escalation works</a>
          </p>
        </div>
      </div>

      <div className="grade">
        <div>
          <span className="g-label">Overcharge</span>
          <b>{usd(rec.overcharge)}</b>
          <span className="g-sub">{pct(rec.shareOfBill)} of the bill · severity {rec.severity.toLowerCase()}</span>
        </div>
        <div>
          <span className="g-label">Problem lines</span>
          <b>
            {rec.issues} of {rec.lines}
          </b>
          <span className="g-sub">lines on this bill</span>
        </div>
        <div>
          <span className="g-label">Evidence strength</span>
          <b>{rec.strength}</b>
          <span className="g-sub">{reliable(rec.evidence)} reliable, weighted by dollars</span>
        </div>
        <div>
          <span className="g-label">Likely to hold up</span>
          <b>{usd(Math.round(rec.likelyToHold))}</b>
          <span className="g-sub">expected to survive the dispute</span>
        </div>
      </div>

      <h3>Why L{rec.level}</h3>
      <ul className="why">
        {rec.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <h3>What happens with each charge</h3>
      <div className="plan">
        {rec.plan.map((p) => (
          <div key={p.level} className={`plan-step l${p.level}`}>
            <div className="plan-top">
              <span className="lvl">L{p.level}</span>
              <b>{p.action}</b>
              <span className="plan-total">{usd(p.total)}</span>
            </div>
            <span className="muted small">
              {p.findings.map((f) => `line ${f.line} (${TYPE_LABEL[f.type].toLowerCase()}, ${usd(f.overcharge)})`).join(' · ')}
            </span>
          </div>
        ))}
      </div>
      <p className="muted small">
        The grade is about your bill. The level is about the agent: how far it may act on each kind of error, based on how
        reliable it proved in testing. <a href="#/autonomy">See it in action →</a>
      </p>
    </section>
  );
}

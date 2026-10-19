import { useEffect, useState } from 'react';
import { usd } from './domain/checks.ts';
import { L4_RULES, buildTimeline, followUpLetter, l4Eligibility, reminderIcs, type Scenario } from './domain/followup.ts';
import { HOSPITAL } from './domain/reference.ts';
import type { Bill, Finding } from './domain/types.ts';
import { saveFile } from './ui.ts';

// Everything on this page is simulated: no email, message or calendar invite ever leaves the browser.

const now = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const today = () => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });


/** Reveals items one at a time once `running` is true. */
function useReveal(count: number, running: boolean, ms: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!running) {
      setShown(0);
      return;
    }
    const timers = Array.from({ length: count }, (_, i) => setTimeout(() => setShown(i + 1), ms * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [count, running, ms]);
  return shown;
}

export function FlagOnlyPanel({ findings }: { findings: Finding[] }) {
  return (
    <div className="panel">
      <div className="agent-actions">
        <span>Letters drafted: <b>0</b></span>
        <span>Messages sent: <b>0</b></span>
        <span>Reminders set: <b>0</b></span>
      </div>
      <p>
        The agent stops after flagging. You get a checklist to act on yourself, for example by calling the billing office
        and reading out the line numbers.
      </p>
      {findings.length === 0 ? (
        <p className="muted">Nothing flagged on this bill.</p>
      ) : (
        <ul className="checklist">
          {findings.map((f) => (
            <li key={`${f.line}-${f.type}`}>
              <input type="checkbox" aria-label={`Mark line ${f.line} as handled`} /> Ask about <b>line {f.line}</b> ({f.code}):{' '}
              {usd(f.overcharge)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SendState = 'review' | 'sending' | 'sent' | 'rejected';

export function ApproveSendPanel({ bill, letter, findings, draftOnly = [] }: { bill: Bill; letter: string; findings: Finding[]; draftOnly?: Finding[] }) {
  const [state, setState] = useState<SendState>('review');
  const [reviewed, setReviewed] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [approvedAt, setApprovedAt] = useState('');
  const total = findings.reduce((s, f) => s + f.overcharge, 0);
  const steps = [
    `Approval recorded: you, ${approvedAt}`,
    'Letter attached and addressed to the billing office',
    `Sent to ${HOSPITAL.billingEmail} (simulated: nothing leaves this page)`,
    'Saved to dispute history, ready for Level 4 follow-ups',
  ];
  const shown = useReveal(steps.length, state === 'sending', 550);

  useEffect(() => {
    if (state === 'sending' && shown === steps.length) {
      setState('sent');
      setLog((l) => [...l, `${now()}: dispute for ${usd(total)} sent after your approval (simulated)`]);
    }
  }, [shown, state, steps.length, total]);

  const draftNote = draftOnly.length > 0 && (
    <p className="muted small">
      Kept as a draft for you to send yourself, because their types haven't earned Level 3:{' '}
      {draftOnly.map((f) => `line ${f.line} (${usd(f.overcharge)})`).join(', ')}.
    </p>
  );

  if (findings.length === 0)
    return (
      <div className="panel">
        <p className="muted">Nothing on this bill can be sent by the agent.</p>
        {draftNote}
      </div>
    );

  return (
    <div className="panel">
      {draftNote}
      <div className="email">
        <div className="email-row"><span>From</span>{bill.patient}, via Overbilled</div>
        <div className="email-row"><span>To</span>{HOSPITAL.billingEmail}</div>
        <div className="email-row"><span>Subject</span>Dispute of {usd(total)} in charges ({bill.title})</div>
        <div className="email-row"><span>Attached</span>📎 dispute-letter.txt</div>
        <details>
          <summary>Preview the letter</summary>
          <pre className="letter">{letter}</pre>
        </details>
      </div>

      {state === 'review' && (
        <>
          <label className="gate-check">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I reviewed every item and
            this matches my visit.
          </label>
          <div className="actions">
            <button className="btn primary" disabled={!reviewed} onClick={() => { setApprovedAt(now()); setState('sending'); }}>
              Approve and send
            </button>
            <button className="btn" onClick={() => setState('rejected')}>Don't send</button>
          </div>
          <p className="muted small">The agent can't send without this click. That approval is what separates Level 3 from Level 4.</p>
        </>
      )}

      {(state === 'sending' || state === 'sent') && (
        <ol className="progress">
          {steps.map((s, i) => (
            <li key={s} className={i < shown || state === 'sent' ? 'shown' : ''}>✓ {s}</li>
          ))}
        </ol>
      )}

      {state === 'sent' && (
        <div className="receipt">
          <strong>Sent (simulated).</strong> Switch to <b>L4</b> to see what the agent does if the hospital doesn't reply.
          <button className="btn" onClick={() => { setState('review'); setReviewed(false); }}>Reset</button>
        </div>
      )}
      {state === 'rejected' && (
        <div className="receipt neutral">
          <strong>Nothing was sent.</strong> The draft stays at Level 2 for you to edit or send yourself.
          <button className="btn" onClick={() => setState('review')}>Back</button>
        </div>
      )}
      {log.length > 0 && (
        <div className="log">
          <span className="muted small">Dispute history</span>
          {log.map((l, i) => <div key={i} className="mono small">{l}</div>)}
        </div>
      )}
    </div>
  );
}

const SCENARIOS: { id: Scenario; label: string }[] = [
  { id: 'no_reply', label: 'Hospital never replies' },
  { id: 'corrected', label: 'Hospital corrects the bill' },
  { id: 'denied', label: 'Hospital rejects the dispute' },
];
const ACTOR_ICON = { agent: '🤖', hospital: '🏥', you: '🧑' };

export function FollowUpPanel({ bill, findings }: { bill: Bill; findings: Finding[] }) {
  const [scenario, setScenario] = useState<Scenario>('no_reply');
  const [running, setRunning] = useState(false);
  const eligible = findings.filter((f) => l4Eligibility(f).eligible);
  const handled = findings.filter((f) => !l4Eligibility(f).eligible);
  const events = buildTimeline(scenario, eligible, handled);
  const shown = useReveal(events.length, running, 650);
  const sentOn = today();

  if (findings.length === 0) return <p className="muted">Nothing to follow up on for this bill.</p>;

  return (
    <div className="panel">
      <p>
        After you send the dispute at Level 3, the agent watches for a reply and chases it on its own, but only for items
        that meet the Level 4 rules.
      </p>
      <div className="table-scroll">
        <table className="gates">
          <thead>
            <tr><th>Item</th><th className="num">Amount</th><th>Auto follow-up?</th></tr>
          </thead>
          <tbody>
            {findings.map((f) => {
              const e = l4Eligibility(f);
              return (
                <tr key={`${f.line}-${f.type}`}>
                  <td>Line {f.line} ({f.code})</td>
                  <td className="num">{usd(f.overcharge)}</td>
                  <td>{e.eligible ? '✅ Agent' : '🧑 You'} <span className="muted small">· {e.reason}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="scenario">
        <span className="muted small">What happens next?</span>
        <div className="chips">
          {SCENARIOS.map((s) => (
            <button key={s.id} className={s.id === scenario ? 'chip on' : 'chip'} onClick={() => { setScenario(s.id); setRunning(false); }}>
              {s.label}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => { setRunning(false); setTimeout(() => setRunning(true), 0); }}>
          ▶ Run the next 5 weeks
        </button>
      </div>

      {running && (
        <ol className="timeline">
          {events.map((e, i) => (
            <li key={i} className={`${e.actor} ${i < shown ? 'shown' : ''}`}>
              <div className="day">Day {e.day}</div>
              <div>
                <div className="ev-title">{ACTOR_ICON[e.actor]} {e.title}</div>
                <div className="muted small">{e.detail}</div>
                {i < shown && e.attach === 'calendar' && (
                  <button className="btn tiny" onClick={() => saveFile('overbilled-reminder.ics', reminderIcs(e.day + L4_RULES.daysBetweenFollowUps, bill.title), 'text/calendar')}>
                    📅 Add reminder to my calendar (.ics)
                  </button>
                )}
                {i < shown && (e.attach === 'followup1' || e.attach === 'followup2') && (
                  <details>
                    <summary className="small">Read follow-up #{e.attach === 'followup1' ? 1 : 2}</summary>
                    <pre className="letter">{followUpLetter(bill, eligible, e.attach === 'followup1' ? 1 : 2, sentOn)}</pre>
                  </details>
                )}
                {i < shown && e.attach === 'handoff' && handled.length > 0 && (
                  <div className="handoff small">
                    Also yours from the start: {handled.map((f) => `line ${f.line} (${usd(f.overcharge)})`).join(', ')}.
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <ul className="notes small">
        <li>Stops the moment the hospital replies, and never argues with a person on its own.</li>
        <li>At most {L4_RULES.maxFollowUps} follow-ups, {L4_RULES.daysBetweenFollowUps} days apart, then hands back to you.</li>
        <li>Follow-ups repeat existing findings only. No new claims, no escalation to regulators or collections.</li>
      </ul>
    </div>
  );
}

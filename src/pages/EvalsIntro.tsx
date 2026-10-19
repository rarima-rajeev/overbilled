import { useMemo, useState } from 'react';
import { EVAL_CASES } from '../domain/evalSet.ts';
import { TUNING_SET, runEvals, type EvalReport } from '../domain/evals.ts';
import type { ErrorType } from '../domain/types.ts';
import { TYPE_LABEL, pct, usd } from '../ui.ts';
import { PhotoBand } from './PagePhoto.tsx';

const TYPE_STORY: Record<ErrorType, { what: string; example: string }> = {
  duplicate: { what: 'The same service billed twice on the same day.', example: 'One blood count, billed as two.' },
  unbundling: {
    what: 'A smaller service billed separately when a bigger one already includes it.',
    example: 'A basic blood panel billed next to the comprehensive panel that already contains it.',
  },
  units: { what: 'More of something than is possible in one day.', example: '10 doses of a pain drug when the daily limit is 8.' },
  price: { what: "Charged more than the hospital's own posted price.", example: 'Chest X-ray at $450 when the posted price is $310.' },
  upcoding: {
    what: 'A visit billed as more complex than it probably was. Asked about, never disputed.',
    example: 'A small cut billed as the most complex ER visit.',
  },
};

const TRAPS = [
  { name: 'A real repeat test', detail: 'Two heart tests hours apart, but the hospital forgot the "repeat" code.' },
  { name: 'A price that dropped later', detail: 'The hospital lowered its price after the visit; the charge was right for that day.' },
  { name: 'A genuinely complex visit', detail: 'Few tests, but the doctor spent a long time on a serious case.' },
  { name: 'A legitimately separate procedure', detail: 'An injection in the other knee, correctly marked as separate.' },
];

function Meter({ part, whole }: { part: number; whole: number }) {
  return (
    <div className="meter" role="img" aria-label={`${part} of ${whole}`}>
      <div style={{ width: `${(part / whole) * 100}%` }} />
    </div>
  );
}

export function EvalsIntro({ report }: { report: EvalReport }) {
  const o = report.overall;
  const generated = report.cases - EVAL_CASES.length;
  const realErrors = o.caught + o.missed;
  const flags = o.caught + o.falseFlags;
  const planted$ = o.dollarsCaught + o.dollarsMissed;
  const falseAlarmCost = o.weightedErrorCost - o.dollarsMissed;

  return (
    <>
      <section className="card">
        <h2>How we test the agent</h2>
        <p className="muted">Like grading an exam: we write the questions, keep the answer sheet, and check every answer.</p>
        <ol className="flow">
          <li>
            <span className="flow-n">1</span>
            <b>Write bills where we already know every error</b>
            <span className="muted small">We plant the errors ourselves, so we know exactly which lines are wrong.</span>
          </li>
          <li>
            <span className="flow-n">2</span>
            <b>Keep the answer sheet</b>
            <span className="muted small">
              The list of every planted error. This is the <i>answer key</i>, also called the <i>golden dataset</i>.
            </span>
          </li>
          <li>
            <span className="flow-n">3</span>
            <b>Let the agent audit, without the answers</b>
            <span className="muted small">It sees only the bills, like any real bill.</span>
          </li>
          <li>
            <span className="flow-n">4</span>
            <b>Mark every flag right or wrong</b>
            <span className="muted small">That gives the scores below.</span>
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>The {report.cases} test bills</h2>
        <div className="sources">
          <div>
            <strong>{EVAL_CASES.length}</strong>
            <b>Hand-written trick bills</b>
            <span className="muted small">Each one written to catch the agent out in a specific way.</span>
          </div>
          <div className="plus">+</div>
          <div>
            <strong>{generated}</strong>
            <b>Computer-made bills</b>
            <span className="muted small">
              A script builds realistic bills and plants errors at random. It uses a fixed starting number (a "seed"), so it
              makes exactly the same bills every time and anyone can re-check the results.
            </span>
          </div>
        </div>
        <div className="total-tile">
          <strong>= {report.cases}</strong>
          <div>
            <b>Bills in the final exam</b>
            <span className="muted small">All the scores on this page come from these.</span>
          </div>
        </div>
        <p className="aside">
          <b>Plus a separate practice set of {TUNING_SET.length} bills.</b> We used those only to choose settings, such as how far
          above the posted price a charge must be before the agent flags it. They're never used for scoring, just as you
          wouldn't grade a student on the practice paper they studied from.
        </p>
      </section>

      <section className="card">
        <h2>What we plant</h2>
        <h3 className="first">5 kinds of real error</h3>
        <div className="types">
          {report.byType.map((t) => (
            <article key={t.type} className="type-card">
              <div className="finding-top">
                <span className={`badge ${t.type}`}>{TYPE_LABEL[t.type]}</span>
                <span className="muted small">{t.caught + t.missed} in the test</span>
              </div>
              <p>{TYPE_STORY[t.type].what}</p>
              <p className="muted small">e.g. {TYPE_STORY[t.type].example}</p>
            </article>
          ))}
        </div>
        <h3>…and traps that only look like errors</h3>
        <p className="muted small">A good auditor must not accuse these. They test whether the agent over-accuses.</p>
        <div className="traps">
          {TRAPS.map((t) => (
            <div key={t.name}>
              <b>{t.name}</b>
              <span className="muted small">{t.detail}</span>
            </div>
          ))}
        </div>
      </section>

      <PhotoBand name="evals2" layout="right">Like any exam: we know every answer, the agent doesn't. Then we mark its work.</PhotoBand>
      <section className="card">

        <h2>The results, in plain words</h2>
        <div className="results">
          <div>
            <p className="big">
              Found <b>{o.caught}</b> of the <b>{realErrors}</b> real errors
            </p>
            <Meter part={o.caught} whole={realErrors} />
            <p className="muted small">
              <b>Recall {pct(o.recall)}.</b> {o.missed} slipped through.
            </p>
          </div>
          <div>
            <p className="big">
              <b>{o.caught}</b> of its <b>{flags}</b> flags were right
            </p>
            <Meter part={o.caught} whole={flags} />
            <p className="muted small">
              <b>Precision {pct(o.precision)}.</b> {o.falseFlags} were false alarms.
            </p>
          </div>
          <div>
            <p className="big">
              Caught <b>{usd(o.dollarsCaught)}</b> of <b>{usd(planted$)}</b> in overcharges
            </p>
            <Meter part={o.dollarsCaught} whole={planted$} />
            <p className="muted small">
              <b>{pct(o.dollarsCaught / planted$)} of the dollars.</b> Higher than the share of errors, because most misses were small.
            </p>
          </div>
          <div>
            <p className="big">
              Its mistakes cost <b>{usd(o.weightedErrorCost)}</b>
            </p>
            <div className="split">
              <div style={{ flex: o.dollarsMissed }} className="miss">
                {usd(o.dollarsMissed)} missed
              </div>
              <div style={{ flex: falseAlarmCost }} className="fa">
                {usd(falseAlarmCost)} false alarms
              </div>
            </div>
            <p className="muted small">
              Missed overcharges the patient would pay, plus a cost for each false accusation. This is the number we try to
              make as small as possible. The breakdown is on the <a href="#/costs">Costs</a> page.
            </p>
          </div>
        </div>
      </section>
      <Scorecard testReport={report} />
    </>
  );
}

function Scorecard({ testReport }: { testReport: EvalReport }) {
  const practiceReport = useMemo(() => runEvals(TUNING_SET), []);
  const [set, setSet] = useState<'test' | 'practice'>('test');
  const r = set === 'test' ? testReport : practiceReport;
  const t = testReport.overall, p = practiceReport.overall;

  return (
    <section className="card">
      <h2>Scorecard by error type</h2>
      <p className="muted">
        <b>Precision</b> = right flags ÷ all the flags the AI raised: when it flags something, how often is it right?{' '}
        <b>Recall</b> = right flags ÷ the errors we planted: of the real errors, how many did it find? The math for each row
        is shown under the percentage.
      </p>
      <div className="chips set-toggle" role="tablist">
        <button role="tab" aria-selected={set === 'test'} className={set === 'test' ? 'chip sm on' : 'chip sm'} onClick={() => setSet('test')}>
          Test set · {testReport.cases} bills (scored)
        </button>
        <button role="tab" aria-selected={set === 'practice'} className={set === 'practice' ? 'chip sm on' : 'chip sm'} onClick={() => setSet('practice')}>
          Practice set · {practiceReport.cases} bills (used to tune)
        </button>
      </div>
      <div className="table-scroll">
        <table className="gates matrix scorecard">
          <thead>
            <tr>
              <th>Error type</th>
              <th className="num">Planted errors</th>
              <th className="num">AI flags</th>
              <th className="num">Found</th>
              <th className="num">Missed</th>
              <th className="num">False alarms</th>
              <th className="num formula-head">
                Precision
                <span>right flags ÷ all AI flags</span>
              </th>
              <th className="num formula-head">
                Recall
                <span>right flags ÷ planted errors</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {r.byType.map((x) => (
              <tr key={x.type}>
                <td>
                  <span className={`badge ${x.type}`}>{TYPE_LABEL[x.type]}</span>
                </td>
                <td className="num">{x.caught + x.missed}</td>
                <td className="num">{x.caught + x.falseFlags}</td>
                <td className="num">{x.caught}</td>
                <td className="num">{x.missed || '—'}</td>
                <td className="num">{x.falseFlags || '—'}</td>
                <td className="num formula">
                  <b>{pct(x.precision)}</b>
                  <span>
                    {x.caught} ÷ {x.caught + x.falseFlags}
                  </span>
                </td>
                <td className="num formula">
                  <b>{pct(x.recall)}</b>
                  <span>
                    {x.caught} ÷ {x.caught + x.missed}
                  </span>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td>All types</td>
              <td className="num">{r.overall.caught + r.overall.missed}</td>
              <td className="num">{r.overall.caught + r.overall.falseFlags}</td>
              <td className="num">{r.overall.caught}</td>
              <td className="num">{r.overall.missed}</td>
              <td className="num">{r.overall.falseFlags}</td>
              <td className="num formula">
                <b>{pct(r.overall.precision)}</b>
                <span>
                  {r.overall.caught} ÷ {r.overall.caught + r.overall.falseFlags}
                </span>
              </td>
              <td className="num formula">
                <b>{pct(r.overall.recall)}</b>
                <span>
                  {r.overall.caught} ÷ {r.overall.caught + r.overall.missed}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="aside">
        <b>Why show both sets?</b> The 6% price setting was chosen on the practice set. If it only worked there, test scores
        would drop. They hold up: precision {pct(p.precision)} → {pct(t.precision)}, recall {pct(p.recall)} → {pct(t.recall)}{' '}
        (practice → test). Nothing here is "trained": the agent is rules plus a language model, and the practice set only
        picks settings.
      </p>
    </section>
  );
}

import { useMemo } from 'react';
import { PRICE_TOLERANCE_PCT } from '../domain/checks.ts';
import { FALSE_FLAG_COST, FALSE_QUESTION_COST, TEST_SET, sweepPriceTolerance, type Outcome } from '../domain/evals.ts';
import { REFERENCE } from '../domain/reference.ts';
import type { AppState } from '../state.ts';
import { TYPE_LABEL, usd } from '../ui.ts';
import { StoryCards } from './StoryCards.tsx';
import { ThresholdChart } from './ThresholdChart.tsx';
import { HeadQuote, PagePhoto, PhotoBand } from './PagePhoto.tsx';

// Why each group of mistakes happens, and what we do about it. Keyed by type:kind[:reason].
const CAUSES: Record<string, { title: string; what: string; response: string }> = {
  'duplicate:false_flag': {
    title: 'Called a real repeat test a duplicate',
    what: 'The patient really had the test twice, but the hospital forgot the "repeat" code, so on paper it looks identical to a duplicate.',
    response: 'Duplicates stay at Level 1: the patient confirms "I only had this once" before anything is disputed.',
  },
  'unbundling:missed': {
    title: 'Trusted a misused "separate procedure" code',
    what: 'The hospital marked a bundled service with modifier 59 ("separate procedure") where that isn\'t allowed. The rules trust the code.',
    response: 'Next step: check when modifier 59 is actually allowed, or send suspicious ones to a person.',
  },
  'price:missed:small': {
    title: `Let small overcharges through (under ${PRICE_TOLERANCE_PCT}%)`,
    what: `Charges a little above the posted price are below the ${PRICE_TOLERANCE_PCT}% bar, so they are not flagged.`,
    response: 'On purpose: a stricter bar would accuse more legitimate price changes, which costs more. The Costs page shows how 6% was chosen.',
  },
  'price:missed:unknown': {
    title: 'Could not price a service it has no data for',
    what: 'The code is not in the reference price list, so there is nothing to compare against.',
    response: 'The agent reports the line as "unchecked" instead of guessing. Next step: expand the price list.',
  },
  'price:false_flag': {
    title: 'Accused a legitimate price change',
    what: 'The hospital lowered its posted price after the visit. The charge was right for the visit date, but the agent compared it with today\'s lower price.',
    response: 'Next step: keep dated price lists and compare against the one in effect on the visit date.',
  },
  'upcoding:false_flag': {
    title: 'Questioned a genuinely complex visit',
    what: 'Some serious visits need few tests. A bill alone cannot tell them apart from upcoding.',
    response: 'This is why upcoding can only ever ask, never accuse. A wrong question costs little.',
  },
};

const groupKey = (o: Outcome) => {
  if (o.type === 'price' && o.kind === 'missed') {
    const line = TEST_SET.find((c) => c.id === o.caseId)?.bill.lines.find((l) => l.line === o.line);
    return `price:missed:${line && REFERENCE[line.code] ? 'small' : 'unknown'}`;
  }
  return `${o.type}:${o.kind}`;
};

export function MistakesPage({ s, part }: { s: AppState; part: 'stories' | 'costs' }) {
  const { report } = s;
  const sweep = useMemo(() => sweepPriceTolerance(), []);
  const groups = Object.entries(
    report.outcomes
      .filter((o) => o.kind !== 'caught')
      .reduce<Record<string, Outcome[]>>((acc, o) => {
        (acc[groupKey(o)] ??= []).push(o);
        return acc;
      }, {}),
  );
  const costOf = (os: Outcome[]) =>
    os[0].kind === 'missed' ? os.reduce((a, o) => a + o.amount, 0) : os.length * (os[0].type === 'upcoding' ? FALSE_QUESTION_COST : FALSE_FLAG_COST);
  groups.sort((a, b) => costOf(b[1]) - costOf(a[1]));

  const byCost = [...report.byType].sort((a, b) => b.weightedCost - a.weightedCost);
  const top = byCost[0];
  const cheapest = byCost.at(-1)!;
  const strict = sweep[0];
  const chosen = sweep.find((p) => p.pct === PRICE_TOLERANCE_PCT)!;
  const loose = sweep.at(-1)!;

  if (part === 'costs') {
    return (
      <>
      <section className="page-head with-photo photo-banner">
        <h1>What mistakes cost</h1>
        <p className="sub">
          Not every mistake costs the same. Here is how we put a price on each kind, and how that price decided the 6%
          setting. Numbers come from the test and practice bills on the <a href="#/evals">Evals</a> page.
        </p>
        <PagePhoto name="costs" />
      </section>

      <section className="card">
        <h2>Two kinds of mistake, two different prices</h2>
        <div className="two-kinds">
          <div className="kind miss">
            <span className="kind-tag">Missed error</span>
            <b>The agent stays quiet about a real overcharge.</b>
            <p>The patient pays money they shouldn't. Cost = the overcharge itself.</p>
          </div>
          <div className="kind fa">
            <span className="kind-tag">False alarm</span>
            <b>The agent accuses a charge that was fine.</b>
            <p>
              Cost assumed at <b>{usd(FALSE_FLAG_COST)}</b> per accusation in a letter:
            </p>
            <ul className="mini">
              <li>about $30 of the patient's time dealing with the rejection</li>
              <li>about $100 because one wrong claim makes the hospital doubt the whole letter</li>
              <li>about $20 of support cost</li>
            </ul>
            <p className="muted small">
              A wrong "worth asking about" question only costs a few minutes: {usd(FALSE_QUESTION_COST)}. These are explicit
              assumptions, to be replaced with measured data after launch.
            </p>
          </div>
        </div>
      </section>

      <PhotoBand name="costs2" layout="left">A false accusation costs more than it looks: time, trust, and a weaker case for the charges that really are wrong.</PhotoBand>
      <section className="card">

        <h2>Mistakes by error type</h2>
        <p className="takeaway">
          <b>{TYPE_LABEL[top.type]}</b> errors cost the most ({usd(top.weightedCost)}), mostly from{' '}
          {top.dollarsMissed >= top.falseFlags * top.costPerFalseFlag ? 'overcharges it missed' : 'false alarms'}.{' '}
          {cheapest.weightedCost === 0 && (
            <>
              <b>{TYPE_LABEL[cheapest.type]}</b> cost nothing: every one was found, with no false alarms.
            </>
          )}
        </p>
        <div className="table-scroll">
          <table className="gates matrix">
            <thead>
              <tr>
                <th>Error type</th>
                <th className="num">Found</th>
                <th className="num">Missed</th>
                <th className="num">Overcharges missed</th>
                <th className="num">False alarms</th>
                <th className="num">Cost of mistakes</th>
              </tr>
            </thead>
            <tbody>
              {byCost.map((t) => (
                <tr key={t.type}>
                  <td>
                    <span className={`badge ${t.type}`}>{TYPE_LABEL[t.type]}</span>
                  </td>
                  <td className="num">
                    {t.caught} of {t.caught + t.missed}
                  </td>
                  <td className="num">
                    {t.missed || '—'}
                  </td>
                  <td className="num">{t.missed ? usd(t.dollarsMissed) : '—'}</td>
                  <td className="num">
                    {t.falseFlags ? `${t.falseFlags} × ${usd(t.costPerFalseFlag)}` : '—'}
                  </td>
                  <td className="num">
                    <b>{usd(t.weightedCost)}</b>
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td>All types</td>
                <td className="num">{report.overall.caught} of {report.overall.caught + report.overall.missed}</td>
                <td className="num">{report.overall.missed}</td>
                <td className="num">{usd(report.overall.dollarsMissed)}</td>
                <td className="num">{report.overall.falseFlags}</td>
                <td className="num">
                  <b>{usd(report.overall.weightedErrorCost)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
              <p className="muted small">
          For precision and recall by error type, see the <a href="#/evals">scorecard on the Evals page</a>.
        </p>
      </section>

      <section className="card">
        <h2>How strict should the price check be?</h2>
        <p className="muted">
          Should the agent flag a charge that is just $1 above the posted price? Being strict catches every overcharge, but
          also accuses charges that were fine (for example, after a price-list update). We tried every setting from 0% to{' '}
          {loose.pct}% on the practice bills and picked the cheapest overall.
        </p>
        <h3 className="first">How 6% was chosen, step by step</h3>
        <ol className="how-steps">
          <li>
            <b>Pick a setting</b>, for example 6%: the agent flags a price only if it is more than 6% above the posted price.
          </li>
          <li>
            <b>Run the agent on the 100 practice bills</b> with that setting, and count two things: false alarms (each costs{' '}
            {usd(FALSE_FLAG_COST)}) and the dollars of real overcharges it let through.
          </li>
          <li>
            <b>Add them up.</b> That is the cost of that setting. Repeat for every setting from 0% to {loose.pct}%, and keep
            the cheapest.
          </li>
        </ol>
        <h3>Every setting on one chart</h3>
        <p className="muted small">
          The blue line is the total cost of mistakes at each setting. It is high on the left (too many false alarms, orange)
          and high on the right (too many missed overcharges, green), and lowest at {PRICE_TOLERANCE_PCT}%. From 8% on there are
          no false alarms left, so the total equals the missed overcharges and the blue line sits under the green one. Hover
          over the chart to see the numbers.
        </p>
        <ThresholdChart points={sweep} chosen={PRICE_TOLERANCE_PCT} />
        <h3>A few of the settings, in numbers</h3>
        <div className="table-scroll">
          <table className="gates matrix">
            <thead>
              <tr>
                <th>Setting</th>
                <th className="num">False alarms</th>
                <th className="num">+ Overcharges missed</th>
                <th className="num">= Cost</th>
              </tr>
            </thead>
            <tbody>
              {sweep
                .filter((p) => [0, 3, 5, 6, 7, 8, loose.pct].includes(p.pct))
                .map((p) => (
                  <tr key={p.pct} className={p.pct === PRICE_TOLERANCE_PCT ? 'chosen-row' : ''}>
                    <td>
                      {p.pct}%{p.pct === PRICE_TOLERANCE_PCT && ' ← chosen'}
                    </td>
                    <td className="num">
                      {p.falseFlags} × {usd(FALSE_FLAG_COST)} = {usd(p.falseFlagCost)}
                    </td>
                    <td className="num">{usd(p.dollarsMissed)}</td>
                    <td className="num">
                      <b>{usd(p.weightedCost)}</b>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="takeaway">
          <b>Why it stops at 6%:</b> going from 5% to 6% removes two false alarms (legitimate price-list changes). Going to
          7% would let through a real $604 overcharge on a knee surgery billed about 6.2% above its posted price. 6% sits
          right between the two.
        </p>

        <h3>Three settings compared</h3>
        <div className="options">
          <div>
            <span className="opt-label">Very strict · {strict.pct}%</span>
            <b>{usd(strict.weightedCost)} <span className="muted small">cost of mistakes</span></b>
            <span className="small">{strict.falseFlags} false alarms, {strict.missed} missed</span>
            <span className="muted small">Catches everything, but accuses too often.</span>
          </div>
          <div className="picked">
            <span className="opt-label">Chosen · {chosen.pct}%</span>
            <b>{usd(chosen.weightedCost)} <span className="muted small">cost of mistakes</span></b>
            <span className="small">{chosen.falseFlags} false alarms, {chosen.missed} missed</span>
            <span className="muted small">Lowest total cost: the best balance.</span>
          </div>
          <div>
            <span className="opt-label">Very loose · {loose.pct}%</span>
            <b>{usd(loose.weightedCost)} <span className="muted small">cost of mistakes</span></b>
            <span className="small">{loose.falseFlags} false alarms, {loose.missed} missed</span>
            <span className="muted small">Never wrong, but lets real overcharges through.</span>
          </div>
        </div>
      </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head with-photo photo-left">
        <h1>Mistakes the agent makes</h1>
        <p className="sub">
          Every agent makes mistakes. Here they are in plain words, and what we do about each one. All numbers come from
          the {report.cases} test bills on the <a href="#/evals">Evals</a> page.
        </p>
        <HeadQuote quote="Every agent makes mistakes. A good one knows where it's likely to be wrong, and checks with you there.">
          In testing: <b>{report.overall.missed}</b> overcharges missed and <b>{report.overall.falseFlags}</b> false alarms, traced to{' '}
          <b>{groups.length}</b> causes, each with a fix.
        </HeadQuote>
        <PagePhoto name="mistakes" />
      </section>

      <StoryCards groups={Object.fromEntries(groups)} />
      <PhotoBand name="mistakes2" layout="wide">Every mistake teaches something. Here is what we change because of each one.</PhotoBand>


      <section className="card">
        <h2>Where it goes wrong, and what we do about it</h2>
        <p className="muted">Every mistake on the test bills, grouped by cause, most costly first.</p>
        <div className="failures">
          {groups.map(([k, os]) => {
            const c = CAUSES[k];
            const missed = os[0].kind === 'missed';
            return (
              <article key={k} className={`failure ${os[0].kind}`}>
                <div className="finding-top">
                  <span className="badge">{missed ? 'Missed error' : 'False alarm'}</span>
                  <span className="muted small">
                    {os.length} time{os.length > 1 ? 's' : ''} · costs {usd(costOf(os))}
                  </span>
                </div>
                <h3 className="fail-title">{c?.title ?? TYPE_LABEL[os[0].type]}</h3>
                <p>{c?.what}</p>
                <p className="response">
                  <b>What we do:</b> {c?.response}
                </p>
                <details className="small">
                  <summary>Which test bills</summary>
                  {os.map((o) => o.caseId).join(', ')}
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

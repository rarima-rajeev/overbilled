import type { AppState } from '../state.ts';
import { pct, usd } from '../ui.ts';
import { EvalsIntro } from './EvalsIntro.tsx';
import { PagePhoto } from './PagePhoto.tsx';

export function EvalsPage({ s }: { s: AppState }) {
  return (
    <>
      <section className="page-head with-photo photo-right">
        <h1>Evals</h1>
        <p className="sub">How we check that the agent is right, and how well it does.</p>
        <OneLiner s={s} />
        <PagePhoto name="evals" />
      </section>
      <EvalsIntro report={s.report} />
      <a className="cta" href="#/mistakes">
        Next: which mistakes it makes, what they cost, and what we do about them →
      </a>
    </>
  );
}

/** The whole evaluation at a glance, with the arithmetic shown. Sits under the page heading. */
function OneLiner({ s }: { s: AppState }) {
  const o = s.report.overall;
  const real = o.caught + o.missed;
  const flags = o.caught + o.falseFlags;
  const planted = o.dollarsCaught + o.dollarsMissed;
  return (
    <div className="one-liner">
      <p>
        <b>{s.report.cases} bills</b> went into the agent, containing <b>{real} real planted errors</b>.
      </p>
      <p>
        It raised <b>{flags} flags</b>, and <b>{o.caught}</b> of them were real errors.
      </p>
      <div className="one-liner-math">
        <span>
          <b>Precision</b> = {o.caught} ÷ {flags} = <b>{pct(o.precision)}</b>
        </span>
        <span>
          <b>Recall</b> = {o.caught} ÷ {real} = <b>{pct(o.recall)}</b>
        </span>
      </div>
      <p>
        Those {o.caught} catches cover <b>{pct(o.dollarsCaught / planted)} of the overcharged dollars</b> ({usd(o.dollarsCaught)}{' '}
        of {usd(planted)}).
      </p>
    </div>
  );
}

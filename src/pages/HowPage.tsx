import { PRICE_TOLERANCE_PCT } from '../domain/checks.ts';
import { HeadQuote, PagePhoto, PhotoBand } from './PagePhoto.tsx';

export function HowPage() {
  return (
    <>
      <section className="page-head with-photo photo-left">
        <h1>How it works</h1>
        <p className="sub">The pipeline behind every audit, and the data and safety rules the project follows.</p>
        <HeadQuote quote="Code does the math. AI does the words. People make the calls.">
          <span className="hq-chips">
            <span>5 rule checks</span>
            <span>1 language model</span>
            <span>4 autonomy levels</span>
            <span>4 escalation stages</span>
          </span>
        </HeadQuote>
        <PagePhoto name="how" />
      </section>

      <section className="card">
        <h2>Pipeline</h2>
        <ol className="pipeline">
          <li>
            <b>Read</b> the itemized bill into line items: code, units, charge, date, modifier. In production a small model
            does this, checked by a line-total test.
          </li>
          <li>
            <b>Check</b> with five tools written as plain code: duplicates, bundling rules, max units per day, posted prices
            (flagged only above {PRICE_TOLERANCE_PCT}%, a threshold tuned on dollars), and visit level versus services.
          </li>
          <li>
            <b>Judge:</b> never claim the same dollars twice. Keep accusations, questions (possible upcoding) and price
            context separate.
          </li>
          <li>
            <b>Explain and draft:</b> a large model writes the summary and letter from the audit JSON only. Any dollar amount
            not in the audit is rejected.
          </li>
          <li>
            <b>Act</b> only up to the autonomy level each error type has earned in evals, and drop a level automatically if
            quality drifts.
          </li>
        </ol>
      </section>

      <PhotoBand name="how2" layout="wide">Plain code does the math. AI does the reading and writing. People make the big calls.</PhotoBand>
      <section className="card">

        <h2>Data and safety</h2>
        <ul className="notes">
          <li>All bills, patients, prices and the hospital are synthetic. No real patient or hospital data is used, and nothing is downloaded.</li>
          <li>
            Rule types are modeled on public CMS concepts (NCCI bundling edits, Medically Unlikely Edits, hospital price
            transparency). The values are illustrative, not copied from CMS files.
          </li>
          <li>Service descriptions are our own wording, not official code descriptors.</li>
          <li>Eval bills come from a seeded generator, so every number on this site is reproducible.</li>
          <li>The site makes no live AI calls. Letters are generated once offline and replayed, and nothing is ever sent.</li>
        </ul>
      </section>
    </>
  );
}

import type { Outcome } from '../domain/evals.ts';
import { usd } from '../ui.ts';

type Verdict = 'accused' | 'missed' | 'suspicion' | 'risk';

const VERDICT: Record<Verdict, string> = {
  accused: 'Wrongly accused',
  missed: 'Missed an overcharge',
  suspicion: 'Wrong suspicion',
  risk: 'Risk we guard against',
};

interface Story {
  icon: string;
  title: string;
  story: string;
  verdict: Verdict;
  lesson: string;
  /** Which group of test-set mistakes this story stands for (absent for risks not seen in testing). */
  group?: string;
}

const STORIES: Story[] = [
  {
    icon: '🧪', title: '"You were charged twice!" (but you really had two tests)', verdict: 'accused', group: 'duplicate:false_flag',
    story: 'The doctor ran the same blood test in the morning and again in the evening to recheck. The AI saw it twice and shouted "double charge!", but both tests really happened.',
    lesson: 'So the agent asks "did you really only have this once?" before disputing a duplicate.',
  },
  {
    icon: '🍟', title: 'The hidden extra (like a combo meal)', verdict: 'missed', group: 'unbundling:missed',
    story: 'A burger meal already includes fries, but the bill also charges for fries separately and labels them "special order". The AI trusted the label and stayed quiet.',
    lesson: 'Rules trust labels, and a label can be abused. Next: check when that label is allowed.',
  },
  {
    icon: '🏷️', title: 'The price dropped after your visit', verdict: 'accused', group: 'price:false_flag',
    story: 'On the day of the visit an X-ray cost $330, and that is what you were charged. A month later the hospital lowered it to $310. The AI compared your bill with today\'s price and said "overcharged!"',
    lesson: 'Next: compare against the price list in effect on the visit date.',
  },
  {
    icon: '❓', title: 'The item with no price tag', verdict: 'missed', group: 'price:missed:unknown',
    story: 'One charge was not on the hospital\'s price list at all. With nothing to compare it to, the AI could not tell it was too expensive.',
    lesson: 'Missing data hurt more than bad logic. The agent marks such lines "unchecked" instead of guessing.',
  },
  {
    icon: '🩹', title: 'The short visit that was actually serious', verdict: 'suspicion', group: 'upcoding:false_flag',
    story: 'The bill said "most serious kind of ER visit", but only one test was done. The AI suspected exaggeration. In fact the patient had a head injury and was watched by doctors for hours.',
    lesson: 'A bill cannot prove this either way, so the agent only asks, never accuses.',
  },
  {
    icon: '🔢', title: 'Reading a number wrong', verdict: 'risk',
    story: 'The bill says $1,650. The AI reads it as $16,500 and invents a huge overcharge.',
    lesson: 'Guard: every line must add up to the bill total, or the bill is read again.',
  },
  {
    icon: '✍️', title: 'Making things up in the letter', verdict: 'risk',
    story: 'The AI writes "you owe me $5,000 in damages", when nothing like that is on the bill.',
    lesson: 'Guard: a letter with any dollar amount that is not in the audit is rejected.',
  },
];

/** Seven plain-language mistakes. The first five happened on the test bills; the counts are live. */
export function StoryCards({ groups }: { groups: Record<string, Outcome[]> }) {
  return (
    <section className="card">
      <h2>7 mistakes in plain words</h2>
      <p className="muted">
        The first five actually happened on the test bills. The last two are risks we built guards against.
      </p>
      <div className="stories">
        {STORIES.map((st, i) => {
          const hits = st.group ? groups[st.group] ?? [] : [];
          const dollars = hits.reduce((s, o) => s + o.amount, 0);
          return (
            <article key={st.title} className={`story ${st.verdict}`}>
              <div className="story-top">
                <span className="story-icon" aria-hidden="true">{st.icon}</span>
                <span className="story-n">{i + 1}</span>
                <span className={`story-tag ${st.verdict}`}>{VERDICT[st.verdict]}</span>
              </div>
              <h3>{st.title}</h3>
              <p>{st.story}</p>
              <p className="story-lesson">👉 {st.lesson}</p>
              <p className="muted small">
                {st.group
                  ? hits.length
                    ? `Happened ${hits.length} time${hits.length > 1 ? 's' : ''} in testing${st.verdict === 'missed' ? `, ${usd(dollars)} missed` : ''}.`
                    : 'Did not happen in this test run.'
                  : 'Not seen in testing; guarded against by design.'}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

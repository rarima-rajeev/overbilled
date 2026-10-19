import { useState, type ReactNode } from 'react';

// An AI-generated DNA illustration (made with Gemini) that got some chemistry wrong.
// Used as a teaching example: it looks convincing, which is exactly the problem.
// Marker boxes are percentages of the image size.

interface Mistake {
  n: number;
  box: { left: number; top: number; width: number; height: number };
  title: string;
  wrong: ReactNode;
  right: ReactNode;
}

const MISTAKES: Mistake[] = [
  {
    n: 1,
    box: { left: 27, top: 22, width: 8.5, height: 20 },
    title: 'A label that belongs to a different molecule',
    wrong: <>This ring has two C=O groups (a thymine-style ring), but it is labelled C<sub>5</sub>H<sub>5</sub>N<sub>5</sub>.</>,
    right: <>C<sub>5</sub>H<sub>5</sub>N<sub>5</sub> is adenine. Thymine is C<sub>5</sub>H<sub>6</sub>N<sub>2</sub>O<sub>2</sub>.</>,
  },
  {
    n: 2,
    box: { left: 13.5, top: 45, width: 14.5, height: 15.5 },
    title: "Cytosine drawn, guanine's formula written",
    wrong: <>The ring with NH<sub>2</sub> on the left is cytosine, but the formula next to it is C<sub>5</sub>H<sub>5</sub>N<sub>5</sub>O.</>,
    right: <>Cytosine is C<sub>4</sub>H<sub>5</sub>N<sub>3</sub>O. C<sub>5</sub>H<sub>5</sub>N<sub>5</sub>O is guanine.</>,
  },
  {
    n: 3,
    box: { left: 28.5, top: 73, width: 23, height: 17 },
    title: 'A base pair that cannot exist',
    wrong: <>Two amine groups are joined ("NH<sub>2</sub>–H<sub>2</sub>N"), and the partner ring is not a real DNA base.</>,
    right: <>Base pairs hydrogen-bond an H on one base to an N or O on the other: A pairs with T (2 bonds), G with C (3 bonds).</>,
  },
  {
    n: 4,
    box: { left: 56.5, top: 79, width: 7, height: 8 },
    title: 'A formula no DNA base has',
    wrong: <>C<sub>4</sub>H<sub>5</sub>N<sub>5</sub>O does not match any of the four DNA bases.</>,
    right: <>The closest is cytosine, C<sub>4</sub>H<sub>5</sub>N<sub>3</sub>O: three nitrogens, not five.</>,
  },
  {
    n: 5,
    box: { left: 81.5, top: 25, width: 11, height: 22 },
    title: "Thymine's formula on a ring that isn't thymine",
    wrong: <>This ring is labelled C<sub>5</sub>H<sub>6</sub>N<sub>2</sub>O<sub>2</sub> (thymine), but it is drawn with an NH<sub>2</sub> group.</>,
    right: <>Thymine has no NH<sub>2</sub> group: its ring carries two C=O groups and a methyl (CH<sub>3</sub>).</>,
  },
];

const BASES = [
  { name: 'Adenine (A)', formula: <>C<sub>5</sub>H<sub>5</sub>N<sub>5</sub></>, pairs: 'pairs with T, 2 hydrogen bonds' },
  { name: 'Thymine (T)', formula: <>C<sub>5</sub>H<sub>6</sub>N<sub>2</sub>O<sub>2</sub></>, pairs: 'pairs with A, 2 hydrogen bonds' },
  { name: 'Guanine (G)', formula: <>C<sub>5</sub>H<sub>5</sub>N<sub>5</sub>O</>, pairs: 'pairs with C, 3 hydrogen bonds' },
  { name: 'Cytosine (C)', formula: <>C<sub>4</sub>H<sub>5</sub>N<sub>3</sub>O</>, pairs: 'pairs with G, 3 hydrogen bonds' },
];

export function SpotTheMistakes() {
  const [show, setShow] = useState(false);

  return (
    <section className="card spot">
      <div className="spot-head">
        <div>
          <p className="suggest-label">Try this</p>
          <h2>Spot the AI's mistakes</h2>
          <p className="muted">
            We asked an AI image tool for DNA with its chemical formulas. It looks convincing and scientific. Look closely:
            how many mistakes can you find?
          </p>
        </div>
        <button className={show ? 'btn primary big' : 'btn big'} onClick={() => setShow((v) => !v)} aria-pressed={show}>
          {show ? 'Hide the mistakes' : `Show the ${MISTAKES.length} mistakes`}
        </button>
      </div>

      <figure className="spot-figure">
        <img src="/photos/learn-ai-dna.jpg" alt="AI-generated illustration of several DNA double helices with chemical structure drawings" />
        {show &&
          MISTAKES.map((m) => (
            <span
              key={m.n}
              className="spot-mark"
              style={{ left: `${m.box.left}%`, top: `${m.box.top}%`, width: `${m.box.width}%`, height: `${m.box.height}%` }}
            >
              <b>{m.n}</b>
            </span>
          ))}
        <figcaption>AI-generated illustration (Gemini). Its chemistry is intentionally left uncorrected.</figcaption>
      </figure>

      {show ? (
        <>
          <h3>Answer key</h3>
          <ol className="answer-key">
            {MISTAKES.map((m) => (
              <li key={m.n}>
                <span className="ak-n">{m.n}</span>
                <div>
                  <b>{m.title}</b>
                  <p>
                    <span className="ak-tag wrong">AI drew</span> {m.wrong}
                  </p>
                  <p>
                    <span className="ak-tag right">Correct</span> {m.right}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="muted small">
            What it got right: the overall double-helix shape, and the adenine ring at the top centre matches its label.
          </p>

          <h3>The correct formulas</h3>
          <div className="bases-ref">
            {BASES.map((b) => (
              <div key={b.name}>
                <span>{b.name}</span>
                <b>{b.formula}</b>
                <span className="muted small">{b.pairs}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">Have a look first, then press the button to see the answer key.</p>
      )}

      <p className="takeaway">
        <b>The lesson:</b> AI output can look expert and still be wrong in ways only a specialist would notice. That is why
        high-stakes AI needs checking against a trusted source, the same way Overbilled checks every claim against the bill.
      </p>
    </section>
  );
}

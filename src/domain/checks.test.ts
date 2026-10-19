import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditBill } from './audit.ts';
import { SAMPLE_BILLS } from './bills.ts';
import { duplicateCheck, unbundlingCheck, unitsCheck } from './checks.ts';
import type { Bill, BillLine } from './types.ts';

const bill = (lines: Omit<BillLine, 'line'>[]): Bill => ({
  id: 't', title: 't', summary: '', patient: 'x', hospital: 'x', payer: 'Self-pay',
  lines: lines.map((l, i) => ({ ...l, line: i + 1 })),
});
const D = '2026-01-01';
const byId = (id: string) => auditBill(SAMPLE_BILLS.find((b) => b.id === id)!).result;
const summary = (id: string) => byId(id).findings.map((f) => `${f.line}:${f.type}:${f.overcharge}`);

test('ER sample: duplicate, unbundling, units and price are all caught', () => {
  assert.deepEqual(summary('er-chest-pain'), ['1:price:750', '5:unbundling:85', '7:duplicate:60', '8:units:190']);
  assert.equal(byId('er-chest-pain').totalOvercharge, 1085);
});

test('knee sample: nested bundling and units, no double counting', () => {
  assert.deepEqual(summary('knee-surgery'), ['1:price:115', '3:unbundling:9800', '4:unbundling:420', '5:units:100']);
  assert.equal(byId('knee-surgery').totalOvercharge, 10435);
});

test('lab sample', () => {
  assert.deepEqual(summary('annual-labs'), ['1:units:60', '3:unbundling:35', '4:price:65']);
});

test('clean sample has no findings (repeat test with modifier 91 is allowed)', () => {
  assert.deepEqual(summary('clean-er'), []);
});

test('same code on different dates is not a duplicate', () => {
  const b = bill([
    { code: '85025', date: D, units: 1, charge: 60 },
    { code: '85025', date: '2026-01-02', units: 1, charge: 60 },
  ]);
  assert.equal(duplicateCheck(b).length, 0);
});

test('modifier 59 bypasses a bundling rule', () => {
  const b = bill([
    { code: '80053', date: D, units: 1, charge: 120 },
    { code: '80048', date: D, units: 1, charge: 85, modifier: '59' },
  ]);
  assert.equal(unbundlingCheck(b).length, 0);
});

test('units at exactly the daily limit are fine; units are summed across lines', () => {
  const atLimit = bill([{ code: '84484', date: D, units: 3, charge: 285 }]);
  assert.equal(unitsCheck(atLimit).findings.length, 0);
  const split = bill([
    { code: '84484', date: D, units: 2, charge: 190 },
    { code: '84484', date: D, units: 2, charge: 190, modifier: '91' },
  ]);
  const r = unitsCheck(split);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].overcharge, 95);
});

test('unknown codes are reported as unchecked, not guessed', () => {
  const r = auditBill(bill([{ code: '99999', date: D, units: 1, charge: 5000 }])).result;
  assert.equal(r.findings.length, 0);
  assert.deepEqual(r.uncheckedLines, [1]);
});

test('grounding check rejects invented dollar amounts', async () => {
  const { ungroundedAmounts } = await import('./letter.ts');
  const b = SAMPLE_BILLS[0];
  const r = auditBill(b).result;
  assert.deepEqual(ungroundedAmounts('Please refund $1,085 for Line 7 ($60).', b, r), []);
  assert.deepEqual(ungroundedAmounts('You owe me $5,000 in damages.', b, r), ['$5,000']);
});

test('L4: only rule-based items under $500 are chased automatically', async () => {
  const { l4Eligibility, buildTimeline } = await import('./followup.ts');
  const { findings } = auditBill(SAMPLE_BILLS[0]).result;
  const eligible = findings.filter((f) => l4Eligibility(f).eligible).map((f) => f.line);
  assert.deepEqual(eligible, [5, 7, 8]); // the $750 price dispute stays with the patient
  const t = buildTimeline('no_reply', findings.filter((f) => l4Eligibility(f).eligible), []);
  assert.equal(t.filter((e) => e.attach === 'followup1' || e.attach === 'followup2').length, 2);
  assert.equal(t.at(-1)!.attach, 'handoff');
  assert.ok(!buildTimeline('denied', findings, []).some((e) => e.attach?.startsWith('followup')));
});

test('generator is reproducible and its answer key matches the tools', async () => {
  const { generateCases } = await import('./generator.ts');
  const a = generateCases(100, 2), b = generateCases(100, 2);
  assert.deepEqual(a, b);
  for (const c of a) {
    const r = auditBill(c.bill, 0).result;
    for (const e of c.expected) {
      const f = [...r.findings, ...r.questions].find((x) => x.line === e.line && x.type === e.type);
      if (f) assert.equal(f.overcharge, e.amount, `${c.id} line ${e.line}`);
    }
  }
});

test('price tolerance in use is the one that minimizes dollar cost on the tuning set', async () => {
  const { PRICE_TOLERANCE_PCT } = await import('./checks.ts');
  const { bestTolerance } = await import('./evals.ts');
  assert.equal(bestTolerance().pct, PRICE_TOLERANCE_PCT);
});

test('eval suite: per-type results and earned levels', async () => {
  const { runEvals, TEST_SET } = await import('./evals.ts');
  const { earnedLevels } = await import('./autonomy.ts');
  assert.equal(TEST_SET.length, 115);
  const r = runEvals();
  const lv = earnedLevels(r);
  assert.equal(lv.upcoding, 1); // capped, whatever its score
  assert.equal(lv.duplicate, 1); // forgotten-modifier repeats keep precision below 90%
  assert.equal(lv.unbundling, 3);
  assert.equal(lv.units, 3);
  // Hand-written traps still behave as designed.
  const kinds = (id: string) => r.outcomes.filter((o) => o.caseId === id && o.kind !== 'caught').map((o) => o.kind);
  assert.deepEqual(kinds('E06'), ['missed']);
  assert.deepEqual(kinds('E13'), ['false_flag']);
  assert.deepEqual(kinds('E14'), ['missed']); // 3% over posted: below the tuned tolerance on purpose
});

test('upcoding is asked about, never disputed', () => {
  const r = byId('er-minor-cut');
  assert.equal(r.findings.length, 0);
  assert.equal(r.totalOvercharge, 0);
  assert.deepEqual(r.questions.map((q) => `${q.line}:${q.overcharge}`), ['1:550']);
});

test('demotion rules: hysteresis and incidents', async () => {
  const { levelAfterDrift } = await import('./autonomy.ts');
  assert.equal(levelAfterDrift(3, 0.94), 3); // below promotion bar (95%) but above demotion bar (92%)
  assert.equal(levelAfterDrift(3, 0.9), 2);
  assert.equal(levelAfterDrift(3, 0.8), 1);
  assert.equal(levelAfterDrift(3, 0.99, true), 2);
});

test('model routing is cheaper than the large model everywhere', async () => {
  const { auditCosts } = await import('./economics.ts');
  const c = auditCosts();
  assert.ok(c.routed < c.allLarge && c.routed > 0);
});

test('sandbox: visitor-planted truth gives real precision and recall', async () => {
  const { scoreSandbox } = await import('./sandbox.ts');
  const { runEvals } = await import('./evals.ts');
  const { earnedLevels } = await import('./autonomy.ts');
  const row = (id: number, code: string, charge: number, units = 1, extra = {}) => ({ id, code, units, charge: String(charge), ...extra });
  const rows = [
    row(1, '99284', 1100),
    row(2, '85025', 60), row(3, '85025', 60, 1, { repeatOf: 2 }), // planted duplicate
    row(4, '80053', 120), row(5, '80048', 85), // unbundled
    row(6, '84484', 95), row(7, '84484', 95, 1, { repeatOf: 6, reallyHadTwice: true }), // real repeat: a trap
    row(8, '71046', 360), // 16% over
    row(9, 'J7030', 93), // 3% over: under tolerance
    row(10, 'J1885', 250, 10), // 2 units over the limit
    row(11, '36415', 0), // not on the bill
  ];
  const r = scoreSandbox(rows, earnedLevels(runEvals()), 6);
  assert.equal(r.lines, 10);
  assert.equal(r.caught, 4);
  assert.equal(r.falseFlags, 1);
  assert.deepEqual(r.missed.map((m) => `${m.code}:${m.type}:${m.amount}`), ['J7030:price:3']);
  assert.equal(r.precision, 0.8);
  assert.equal(r.recall, 0.8);
  assert.equal(r.trueTotal, 248);
  assert.equal(r.agentTotal, 340);
  assert.equal(r.findings.find((f) => f.type === 'unbundling')!.level, 3);
  assert.equal(r.findings.find((f) => f.type === 'duplicate' && f.outcome === 'false_flag')!.level, 1);
});

test('bill recommendation: grade, level and plan per sample bill', async () => {
  const { recommendForBill } = await import('./recommend.ts');
  const { runEvals } = await import('./evals.ts');
  const { earnedLevels } = await import('./autonomy.ts');
  const report = runEvals();
  const lv = earnedLevels(report);
  const rec = (id: string) => {
    const b = SAMPLE_BILLS.find((x) => x.id === id)!;
    return recommendForBill(auditBill(b).result, b.lines.length, report, lv);
  };

  const knee = rec('knee-surgery');
  assert.equal(knee.kind, 'dispute');
  assert.equal(knee.level, 3);
  assert.equal(knee.strength, 'Strong');
  assert.equal(knee.severity, 'High');
  assert.deepEqual(knee.plan.map((p) => `L${p.level}:${p.total}`), ['L3:10320', 'L2:115']);
  assert.ok(Math.abs(knee.likelyToHold - 10425.4) < 1);

  const er = rec('er-chest-pain');
  assert.equal(er.level, 3);
  assert.equal(er.strength, 'Moderate'); // the $750 price finding and the $60 duplicate are less reliable types
  assert.deepEqual(er.plan.map((p) => `L${p.level}:${p.total}`), ['L3:275', 'L2:750', 'L1:60']);
  assert.deepEqual([er.issues, er.lines], [4, 12]);

  assert.equal(rec('er-minor-cut').kind, 'ask');
  assert.equal(rec('clean-er').kind, 'none');
});

test('escalation: autonomy shrinks as the dispute climbs', async () => {
  const { effectiveLevel, STAGES } = await import('./escalation.ts');
  assert.deepEqual(STAGES.map((s) => s.maxLevel), [4, 3, 2, 1]);
  assert.equal(effectiveLevel(3, 1), 3); // billing office: earned level applies
  assert.equal(effectiveLevel(3, 2), 3); // supervisor: L3 still allowed
  assert.equal(effectiveLevel(3, 3), 2); // patient advocate: capped to drafting
  assert.equal(effectiveLevel(3, 4), 1); // outside the hospital: the patient decides
  assert.equal(effectiveLevel(1, 1), 1); // a stage never raises a level
});

test('Mistakes page claim: 7% would miss a real $604 knee-surgery overcharge that 6% catches', async () => {
  const { runEvals, TUNING_SET } = await import('./evals.ts');
  const missedAt = (t: number) => runEvals(TUNING_SET, t).outcomes.filter((o) => o.type === 'price' && o.kind === 'missed').map((o) => `${o.caseId}:${o.amount}`);
  assert.ok(!missedAt(6).includes('U066:604'));
  assert.ok(missedAt(7).includes('U066:604'));
});

test('saved AI letters pass both guardrails (no invented dollars, citations quoted exactly)', async () => {
  const { ungroundedAmounts } = await import('./letter.ts');
  const { readFileSync } = await import('node:fs');
  const letters = JSON.parse(readFileSync(new URL('../data/ai-letters.json', import.meta.url), 'utf8')) as Record<string, { letter: string; summary: string }>;
  for (const [id, v] of Object.entries(letters)) {
    const b = SAMPLE_BILLS.find((x) => x.id === id)!;
    const r = auditBill(b).result;
    assert.deepEqual(ungroundedAmounts(`${v.summary}\n${v.letter}`, b, r), [], `${id}: invented amounts`);
    for (const f of r.findings) {
      assert.ok(v.letter.includes(`Line ${f.line}`), `${id}: line ${f.line} missing`);
      assert.ok(v.letter.includes(f.citation), `${id}: citation for line ${f.line} reworded`);
    }
  }
});

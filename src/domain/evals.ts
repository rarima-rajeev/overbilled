import { auditBill } from './audit.ts';
import { PRICE_TOLERANCE_PCT } from './checks.ts';
import { EVAL_CASES, type EvalCase } from './evalSet.ts';
import { generateCases } from './generator.ts';
import type { ErrorType } from './types.ts';

export const ERROR_TYPES: ErrorType[] = ['duplicate', 'unbundling', 'units', 'price', 'upcoding'];

/**
 * Error-cost assumptions. A miss costs the patient exactly the dollars missed.
 * A false flag costs depend on what the agent DID with it:
 * - a false accusation in a dispute letter: staff time, a weaker dispute, lost trust;
 * - a false "worth asking about" question: a few minutes of the patient's time.
 */
export const FALSE_FLAG_COST = 150;
export const FALSE_QUESTION_COST = 20;
const falseCost = (t: ErrorType) => (t === 'upcoding' ? FALSE_QUESTION_COST : FALSE_FLAG_COST);

// Two separate generated sets: thresholds are tuned on one and scored on the other,
// so the reported numbers are not graded on the bills used to choose them.
export const TUNING_SET = generateCases(100, 1, 'U');
export const TEST_SET: EvalCase[] = [...EVAL_CASES, ...generateCases(100, 2, 'T')];

export interface Outcome {
  caseId: string;
  caseName: string;
  why: string;
  line: number;
  type: ErrorType;
  kind: 'caught' | 'missed' | 'false_flag';
  amount: number;
}

export interface TypeScore {
  type: ErrorType;
  caught: number;
  missed: number;
  falseFlags: number;
  precision: number;
  recall: number;
  dollarsCaught: number;
  dollarsMissed: number;
  costPerFalseFlag: number;
  weightedCost: number;
}

export function runEvals(cases: EvalCase[] = TEST_SET, priceTolerancePct = PRICE_TOLERANCE_PCT) {
  const outcomes: Outcome[] = [];
  for (const c of cases) {
    const { findings, questions } = auditBill(c.bill, priceTolerancePct).result;
    const flagged = [...findings, ...questions];
    const base = { caseId: c.id, caseName: c.name, why: c.why };
    for (const e of c.expected) {
      const hit = flagged.some((f) => f.line === e.line && f.type === e.type);
      outcomes.push({ ...base, line: e.line, type: e.type, kind: hit ? 'caught' : 'missed', amount: e.amount });
    }
    for (const f of flagged) {
      if (!c.expected.some((e) => e.line === f.line && e.type === f.type)) {
        outcomes.push({ ...base, line: f.line, type: f.type, kind: 'false_flag', amount: f.overcharge });
      }
    }
  }

  const of = (kind: Outcome['kind'], type?: ErrorType) => outcomes.filter((o) => o.kind === kind && (!type || o.type === type));
  const dollars = (os: Outcome[]) => os.reduce((s, o) => s + o.amount, 0);
  const ratio = (a: number, b: number) => (a + b === 0 ? 1 : a / (a + b));

  const byType: TypeScore[] = ERROR_TYPES.map((type) => {
    const caught = of('caught', type).length, missed = of('missed', type).length, falseFlags = of('false_flag', type).length;
    const dollarsMissed = dollars(of('missed', type));
    return {
      type, caught, missed, falseFlags,
      precision: ratio(caught, falseFlags),
      recall: ratio(caught, missed),
      dollarsCaught: dollars(of('caught', type)),
      dollarsMissed,
      costPerFalseFlag: falseCost(type),
      weightedCost: dollarsMissed + falseFlags * falseCost(type),
    };
  });

  const caught = of('caught').length, missed = of('missed').length, falseFlags = of('false_flag').length;
  return {
    cases: cases.length,
    outcomes,
    byType,
    overall: {
      caught, missed, falseFlags,
      precision: ratio(caught, falseFlags),
      recall: ratio(caught, missed),
      dollarsCaught: dollars(of('caught')),
      dollarsMissed: dollars(of('missed')),
      weightedErrorCost: byType.reduce((s, t) => s + t.weightedCost, 0),
    },
  };
}

export type EvalReport = ReturnType<typeof runEvals>;

/** Sweep the price-check tolerance and report the dollar-weighted cost of price errors at each setting. */
export function sweepPriceTolerance(cases: EvalCase[] = TUNING_SET, maxPct = 20) {
  return Array.from({ length: maxPct + 1 }, (_, pct) => {
    const price = runEvals(cases, pct).byType.find((t) => t.type === 'price')!;
    return {
      pct,
      falseFlags: price.falseFlags,
      missed: price.missed,
      dollarsMissed: price.dollarsMissed,
      falseFlagCost: price.falseFlags * FALSE_FLAG_COST,
      weightedCost: price.weightedCost,
      precision: price.precision,
      recall: price.recall,
    };
  });
}

export function bestTolerance(sweep = sweepPriceTolerance()) {
  return sweep.reduce((best, p) => (p.weightedCost < best.weightedCost ? p : best));
}

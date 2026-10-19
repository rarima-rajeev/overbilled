import type { Level } from './autonomy.ts';
import type { EvalReport } from './evals.ts';
import { L4_RULES, l4Eligibility } from './followup.ts';
import type { AuditResult, ErrorType, Finding } from './types.ts';

// Turns one bill's audit into a grade and a suggested next step.
// The GRADE is about the bill (how much is wrong, how solid the evidence is).
// The LEVEL is about the agent: the most it may do, as earned by each error type in evals.

export type Strength = 'Strong' | 'Moderate' | 'Needs your review';
export type Severity = 'High' | 'Medium' | 'Low';

export interface PlanStep {
  level: Level;
  action: string;
  findings: Finding[];
  total: number;
}

export interface Recommendation {
  kind: 'dispute' | 'ask' | 'none';
  overcharge: number;
  shareOfBill: number;
  /** Distinct bill lines with at least one finding. */
  issues: number;
  lines: number;
  /** Dollar-weighted eval precision of the finding types on this bill (0-1). */
  evidence: number;
  /** Overcharge expected to hold up: each finding x how often its type is right in evals. */
  likelyToHold: number;
  strength: Strength;
  severity: Severity;
  level: Level;
  plan: PlanStep[];
  reasons: string[];
}

const ACTION: Record<Level, string> = {
  1: 'Check these with you first',
  2: 'Draft the letter; you send it',
  3: 'Send the dispute after you approve',
  4: 'Send, then follow up on its own',
};

const WHY_NOT_HIGHER: Record<1 | 2 | 3, string> = {
  1: "Why not L2: none of these error types is reliable enough (90%+) for me to draft a letter without checking with you first.",
  2: 'Why not L3: sending for you needs 95%+ accuracy over at least 20 test cases, and no error type on this bill has reached that yet.',
  3: 'Why not L4: following up on my own needs 99%+ accuracy over at least 50 test cases, and no error type on this bill has reached that yet.',
};

const RULE_NAME: Record<ErrorType, string> = {
  duplicate: 'duplicate charge',
  unbundling: 'bundling rule',
  units: 'daily-limit rule',
  price: "hospital's own posted price",
  upcoding: 'visit-level check',
};

export function strengthOf(evidence: number): Strength {
  return evidence >= 0.95 ? 'Strong' : evidence >= 0.85 ? 'Moderate' : 'Needs your review';
}

export function severityOf(share: number): Severity {
  return share >= 0.2 ? 'High' : share >= 0.05 ? 'Medium' : 'Low';
}

export function recommendForBill(
  result: AuditResult,
  lineCount: number,
  report: EvalReport,
  earned: Record<ErrorType, Level>,
): Recommendation {
  const precisionOf = (t: ErrorType) => report.byType.find((x) => x.type === t)!.precision;
  const levelOf = (f: Finding): Level => {
    const lv = earned[f.type];
    // Level 4 also needs the item to be rule-based and under the auto-follow-up dollar cap.
    return lv >= 4 && !l4Eligibility(f).eligible ? 3 : lv;
  };
  const fs = result.findings;
  const overcharge = result.totalOvercharge;
  const likelyToHold = fs.reduce((s, f) => s + f.overcharge * precisionOf(f.type), 0);
  const evidence = overcharge > 0 ? likelyToHold / overcharge : 0;
  const shareOfBill = result.totalBilled ? overcharge / result.totalBilled : 0;

  const plan: PlanStep[] = ([4, 3, 2, 1] as Level[])
    .map((level) => {
      const items = fs.filter((f) => levelOf(f) === level);
      return { level, action: ACTION[level], findings: items, total: items.reduce((s, f) => s + f.overcharge, 0) };
    })
    .filter((p) => p.findings.length > 0);

  const base = {
    overcharge,
    shareOfBill,
    issues: new Set(fs.map((f) => f.line)).size,
    lines: lineCount,
    evidence,
    likelyToHold,
    strength: strengthOf(evidence),
    severity: severityOf(shareOfBill),
    plan,
  };

  if (fs.length === 0) {
    const ask = result.questions.length > 0;
    return {
      ...base,
      kind: ask ? 'ask' : 'none',
      level: 1,
      reasons: ask
        ? ['Nothing breaks a billing rule or the posted prices.', 'One charge looks higher than the visit suggests. Only your medical record can confirm it, so the agent will only ask, never accuse.']
        : ['Every line matches the posted prices and billing rules.'],
    };
  }

  const level = plan[0].level;
  const reasons: string[] = [];
  // Group the evidence by type: "breaks the bundling rule twice (agent is right 100% of the time on these)".
  const types = [...new Set(fs.map((f) => f.type))].sort((a, b) => precisionOf(b) - precisionOf(a));
  for (const t of types) {
    const n = fs.filter((f) => f.type === t).length;
    const total = fs.filter((f) => f.type === t).reduce((s, f) => s + f.overcharge, 0);
    const p = Math.round(precisionOf(t) * 100);
    const one = n === 1;
    const verb =
      t === 'price' ? (one ? 'charges more than the' : 'charge more than the') : t === 'duplicate' ? (one ? 'is a possible' : 'are possible') : one ? 'breaks the' : 'break the';
    const what = t === 'duplicate' ? `${RULE_NAME[t]}${one ? '' : 's'}` : RULE_NAME[t];
    reasons.push(`${one ? 'One line' : `${n} lines`} ${verb} ${what} (${fmt(total)}). In testing, I'm right about this kind of error ${p}% of the time.`);
  }
  if (level < 4) reasons.push(WHY_NOT_HIGHER[level as 1 | 2 | 3]);
  if (fs.some((f) => f.overcharge >= L4_RULES.maxAmountPerItem)) {
    reasons.push(`Items of ${fmt(L4_RULES.maxAmountPerItem)} or more always need you in the loop, however reliable I am.`);
  }
  return { ...base, kind: 'dispute', level, reasons };
}

const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

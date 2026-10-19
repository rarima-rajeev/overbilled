import { auditBill } from './audit.ts';
import { L4_RULES, l4Eligibility } from './followup.ts';
import type { Level } from './autonomy.ts';
import type { Bill, BillLine, ErrorType, Finding } from './types.ts';

// "Try it yourself": the visitor plants the errors, so the page knows the truth and can score the agent.

export const SANDBOX_CODES = [
  '99283', '99284', '99285', '93005', '71046', '96374', '96375', 'J1885', 'J7030', '36415',
  '80053', '80048', '82947', '85025', '84484', '80061', '83036', '84443', '29881', '20610',
];

export interface SandboxRow {
  id: number;
  code: string;
  units: number;
  /** Total charged for this line, as typed. Empty or 0 means "not on my bill". */
  charge: string;
  /** Set on an extra row the visitor added: the same service billed again. */
  repeatOf?: number;
  /** Visitor says the repeat was real (e.g. a second heart test hours later). */
  reallyHadTwice?: boolean;
}

const DATE = '2026-10-01';

/**
 * Builds two bills from the rows:
 * - `agentBill` is what the agent sees: no modifiers, exactly like a real bill with a forgotten modifier.
 * - `truthBill` encodes the visitor's truth: real repeats carry the "repeat test" modifier.
 */
function toBills(rows: SandboxRow[]) {
  const billed = rows.filter((r) => Number(r.charge) > 0 && r.units > 0);
  const lines = (withTruth: boolean): BillLine[] =>
    billed.map((r, i) => ({
      line: i + 1,
      code: r.code,
      date: DATE,
      units: r.units,
      charge: Number(r.charge),
      ...(withTruth && r.repeatOf !== undefined && r.reallyHadTwice ? { modifier: '91' } : {}),
    }));
  const base = { title: 'Your bill', summary: '', patient: 'You (sandbox)', hospital: 'Lakeside General Hospital', payer: 'Self-pay' as const };
  return {
    rowByLine: billed,
    agentBill: { ...base, id: 'sandbox', lines: lines(false) } as Bill,
    truthBill: { ...base, id: 'sandbox-truth', lines: lines(true) } as Bill,
  };
}

export interface ScoredFinding extends Finding {
  outcome: 'caught' | 'false_flag';
  level: Level;
  action: string;
  why: string;
}

export interface Missed {
  line: number;
  code: string;
  type: ErrorType;
  amount: number;
  why: string;
}

const ACTION: Record<Level, string> = {
  1: 'Flag only: you decide',
  2: 'Draft letter: you send it',
  3: 'Send after your approval',
  4: 'Send, then follow up on its own',
};

export function scoreSandbox(rows: SandboxRow[], earned: Record<ErrorType, Level>, tolerancePct: number) {
  const { agentBill, truthBill, rowByLine } = toBills(rows);
  // Truth: every cent above the posted price is an overcharge, and real repeats are not duplicates.
  const truth = auditBill(truthBill, 0).result;
  const agent = auditBill(agentBill).result;
  const isTrue = (f: Finding) => truth.findings.some((t) => t.line === f.line && t.type === f.type);

  const findings: ScoredFinding[] = agent.findings.map((f) => {
    const typeLevel = earned[f.type];
    // L4 additionally needs the item to be rule-based and under the dollar cap.
    const level: Level = typeLevel >= 4 && !l4Eligibility(f).eligible ? 3 : typeLevel;
    const row = rowByLine[f.line - 1];
    return {
      ...f,
      outcome: isTrue(f) ? 'caught' : 'false_flag',
      level,
      action: ACTION[level],
      why:
        !isTrue(f) && f.type === 'duplicate' && row?.reallyHadTwice
          ? 'You marked this as a real repeat, but the bill has no "repeat test" modifier, so it looks identical to a duplicate.'
          : '',
    };
  });

  const missed: Missed[] = truth.findings
    .filter((t) => !agent.findings.some((f) => f.line === t.line && f.type === t.type))
    .map((t) => ({
      line: t.line,
      code: t.code,
      type: t.type,
      amount: t.overcharge,
      why: t.type === 'price' ? `Less than ${tolerancePct}% above the posted price, so it is below the tuned threshold.` : 'Not caught by the rules.',
    }));

  const caught = findings.filter((f) => f.outcome === 'caught').length;
  const falseFlags = findings.length - caught;
  return {
    lines: agentBill.lines.length,
    findings,
    missed,
    questions: agent.questions,
    agentTotal: agent.totalOvercharge,
    trueTotal: truth.totalOvercharge,
    caught,
    falseFlags,
    precision: findings.length ? caught / findings.length : null,
    recall: caught + missed.length ? caught / (caught + missed.length) : null,
    l4Cap: L4_RULES.maxAmountPerItem,
  };
}

export type SandboxResult = ReturnType<typeof scoreSandbox>;

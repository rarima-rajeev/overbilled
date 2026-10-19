import type { EvalReport, TypeScore } from './evals.ts';
import type { ErrorType } from './types.ts';

// The autonomy ladder. An error type moves UP a level only when the eval data says it has earned it,
// and moves DOWN automatically when production quality drifts.

export type Level = 1 | 2 | 3 | 4;

export interface LevelSpec {
  level: Level;
  name: string;
  does: string;
  gate: string;
  minPrecision: number;
  minCases: number;
  /** Demotion: drop one level if precision over the last `demoteWindow` real disputes falls below this. */
  demoteBelow: number;
  demoteRule: string;
}

export const DEMOTE_WINDOW = 50;

export const LEVELS: LevelSpec[] = [
  {
    level: 1, name: 'Flag only', does: 'Shows findings. The patient decides everything.', gate: 'Always on.',
    minPrecision: 0, minCases: 0, demoteBelow: 0, demoteRule: 'Floor. Cannot drop lower.',
  },
  {
    level: 2, name: 'Draft letter', does: 'Writes a dispute letter with citations for the patient to send.',
    gate: 'Precision of 90% or higher on this error type.', minPrecision: 0.9, minCases: 1,
    demoteBelow: 0.85, demoteRule: `Below 85% precision over the last ${DEMOTE_WINDOW} disputes.`,
  },
  {
    level: 3, name: 'Send after approval', does: 'Sends the letter once the patient clicks approve.',
    gate: 'Precision of 95% or higher across at least 20 labeled cases of this type.', minPrecision: 0.95, minCases: 20,
    demoteBelow: 0.92, demoteRule: `Below 92% over the last ${DEMOTE_WINDOW}, or any false accusation that was actually sent.`,
  },
  {
    level: 4, name: 'Follow up on its own', does: 'Chases unanswered disputes without asking.',
    gate: 'Precision of 99% or higher across at least 50 labeled cases, rule-based types only, under $500 per item.',
    minPrecision: 0.99, minCases: 50,
    demoteBelow: 0.97, demoteRule: `Below 97% over the last ${DEMOTE_WINDOW}, or any complaint from a hospital.`,
  },
];

const RULE_BASED: ErrorType[] = ['duplicate', 'unbundling', 'units'];
/** Hard cap: suspicions the bill alone cannot prove never get past "flag only", whatever the scores. */
const CAPPED_AT_L1: ErrorType[] = ['upcoding'];

export function earned(score: TypeScore, spec: LevelSpec): boolean {
  if (spec.level === 1) return true;
  if (CAPPED_AT_L1.includes(score.type)) return false;
  const labeled = score.caught + score.missed + score.falseFlags;
  if (spec.level === 4 && !RULE_BASED.includes(score.type)) return false;
  return score.precision >= spec.minPrecision && labeled >= spec.minCases;
}

/** Highest level each error type has earned. */
export function earnedLevels(report: EvalReport): Record<ErrorType, Level> {
  return Object.fromEntries(
    report.byType.map((s) => [s.type, LEVELS.filter((spec) => earned(s, spec)).at(-1)!.level]),
  ) as Record<ErrorType, Level>;
}

/**
 * Production drift: given the level a type earned and its rolling precision in production,
 * where does it end up? Demotion thresholds sit below promotion thresholds (hysteresis),
 * so a type does not flip between levels on small wobbles. Getting back up means
 * re-passing the promotion gate on freshly labeled cases.
 */
export function levelAfterDrift(earnedLevel: Level, rollingPrecision: number, incident = false): Level {
  let level = earnedLevel;
  if (incident && level >= 3) level = (level - 1) as Level;
  while (level > 1 && rollingPrecision < LEVELS[level - 1].demoteBelow) level = (level - 1) as Level;
  return level;
}

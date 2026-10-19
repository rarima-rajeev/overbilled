import type { Level } from './autonomy.ts';

// The escalation ladder: WHO receives the dispute. Separate from the autonomy ladder (how much the AI does alone).
// Rule: the higher the escalation, the less the agent may do on its own.
// Titles vary by hospital; these are typical roles for a self-pay hospital bill.

export type Stage = 1 | 2 | 3 | 4;

export interface StageSpec {
  stage: Stage;
  who: string;
  example: string;
  when: string;
  /** The most autonomy the agent may use at this stage, whatever an error type has earned. */
  maxLevel: Level;
  why: string;
}

export const STAGES: StageSpec[] = [
  {
    stage: 1, who: 'Billing office', example: 'Customer service or the billing department',
    when: 'First dispute', maxLevel: 4,
    why: 'Routine corrections. The agent may use whatever level each error type has earned.',
  },
  {
    stage: 2, who: 'Billing supervisor', example: 'Patient financial services manager',
    when: 'No fix within 30 days, or the dispute was rejected', maxLevel: 3,
    why: 'Someone already said no once. Every message needs your approval.',
  },
  {
    stage: 3, who: 'Patient advocate', example: 'Patient relations office',
    when: 'Still unresolved after the supervisor', maxLevel: 2,
    why: 'A formal complaint inside the hospital. The agent drafts; you send it yourself.',
  },
  {
    stage: 4, who: 'Outside the hospital', example: 'A state consumer-protection office or regulator',
    when: 'The hospital will not engage', maxLevel: 1,
    why: 'Regulators and legal steps are your decision alone. The agent only prepares the facts.',
  },
];

/** What the agent may actually do for an error type at a given stage: the lower of earned level and stage cap. */
export function effectiveLevel(earned: Level, stage: Stage): Level {
  return Math.min(earned, STAGES[stage - 1].maxLevel) as Level;
}

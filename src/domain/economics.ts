// Cost model for one audit with model routing.
// Large tier: Claude Sonnet 5.5's OpenRouter list price, with token counts measured from the real
// letter-writing run (scripts/generate-ai-letters.ts, average of 3 bills).
// Small tier and the extraction step are ASSUMPTIONS: extraction is modeled, not run, in this demo.

export const MODEL_TIERS = {
  small: { label: 'Small, fast model', inPerM: 0.15, outPerM: 0.6 },
  large: { label: 'Large, strong model', inPerM: 2, outPerM: 10 },
} as const;
export type Tier = keyof typeof MODEL_TIERS;

export interface Step {
  id: string;
  name: string;
  does: string;
  runner: Tier | 'code';
  tokensIn: number;
  tokensOut: number;
  why: string;
}

export const PIPELINE: Step[] = [
  {
    id: 'extract', name: 'Read the bill', does: 'Turn a PDF or scan into line items: code, units, charge, date, modifier.',
    runner: 'small', tokensIn: 2500, tokensOut: 900,
    why: 'Pattern-following, not judgment. A plain-code check catches its mistakes: line items must add up to the bill total, or the step retries on the large model.',
  },
  {
    id: 'checks', name: 'Run the checks', does: 'Duplicates, bundling, units, posted prices, visit level.',
    runner: 'code', tokensIn: 0, tokensOut: 0,
    why: 'Rules and math have exact answers. Code is free, instant and always right; a model would only add risk.',
  },
  {
    id: 'letter', name: 'Explain and draft', does: 'Plain-English summary and a cited dispute letter.',
    runner: 'large', tokensIn: 1024, tokensOut: 1347,
    why: 'Tone, clarity and staying grounded matter here. A failed grounding check costs more than the price difference.',
  },
];

export function stepCost(step: Step, tier: Tier | 'code' = step.runner): number {
  if (tier === 'code') return 0;
  const m = MODEL_TIERS[tier];
  return (step.tokensIn * m.inPerM + step.tokensOut * m.outPerM) / 1_000_000;
}

/** Cost with routing vs. sending every LLM step to the large model. */
export function auditCosts() {
  const routed = PIPELINE.reduce((s, p) => s + stepCost(p), 0);
  const allLarge = PIPELINE.reduce((s, p) => s + stepCost(p, p.runner === 'code' ? 'code' : 'large'), 0);
  return { routed, allLarge, savedPct: 1 - routed / allLarge };
}

/** Expected dollars recovered per audit: dollars found per audit x share of disputes that succeed (assumption). */
export function roi(dollarsFoundPerAudit: number, successRate: number, costPerAudit: number) {
  const recovered = dollarsFoundPerAudit * successRate;
  return { recovered, roi: recovered / costPerAudit };
}

import { usd } from './checks.ts';
import { HOSPITAL, REFERENCE } from './reference.ts';
import type { AuditResult, Bill } from './types.ts';

export const LETTER_DISCLAIMER =
  'DEMO ONLY: generated from a synthetic bill for a fictional hospital. Not legal, medical or billing advice.';

/** Deterministic fallback letter. The AI version (scripts/generate-ai-letters.ts) must pass the grounding check below. */
export function templateLetter(bill: Bill, result: AuditResult): string {
  const items = result.findings
    .map((f, i) => `${i + 1}. Line ${f.line} (${f.code}, ${REFERENCE[f.code]?.description ?? ''}): ${f.explanation}\n   Requested adjustment: ${usd(f.overcharge)}\n   Basis: ${f.citation}`)
    .join('\n\n');
  const date = bill.lines[0]?.date ?? '';
  return `${LETTER_DISCLAIMER}

To: ${HOSPITAL.billingAddress}
From: ${bill.patient}
Re: Itemized bill, date of service ${date}, self-pay account

To the Billing Department,

I have reviewed my itemized bill (total billed: ${usd(result.totalBilled)}) and found the following charges that appear to be incorrect:

${items}

Total requested adjustment: ${usd(result.totalOvercharge)}

Please review these items, send me a corrected itemized bill, and hold this account from collections while the review is in progress. If you believe any charge is correct, please explain the basis in writing.

Thank you,
${bill.patient}`;
}

/**
 * Grounding check: every dollar amount in AI-written text must come from the audit or the bill.
 * An AI letter that invents a number is rejected and the template letter is used instead.
 */
export function ungroundedAmounts(text: string, bill: Bill, result: AuditResult): string[] {
  const allowed = new Set<number>([result.totalBilled, result.totalOvercharge]);
  for (const f of result.findings) allowed.add(f.overcharge);
  for (const l of bill.lines) {
    allowed.add(l.charge);
    allowed.add(Math.round((l.charge / l.units) * 100) / 100);
    const ref = REFERENCE[l.code];
    if (ref) allowed.add(ref.postedCashPrice);
  }
  const found = text.match(/\$\s?[\d,]+(?:\.\d{1,2})?/g) ?? [];
  return found.filter((m) => !allowed.has(Number(m.replace(/[$,\s]/g, ''))));
}

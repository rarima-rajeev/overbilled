import { BUNDLING_RULES, MODIFIERS, REFERENCE } from './reference.ts';
import type { BenchmarkNote, Bill, BillLine, Finding } from './types.ts';

// The agent's tools. Each one is plain, deterministic code: the AI decides what to do
// with the results, but it never does the math or the rule lookups itself.

const money = (n: number) => Math.round(n * 100) / 100;
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const unitPrice = (l: BillLine) => l.charge / l.units;
const describe = (code: string) => REFERENCE[code]?.description ?? 'Unknown service';

/** Tool 1: the same service billed twice on the same day without a "repeat test" modifier. */
export function duplicateCheck(bill: Bill): Finding[] {
  const seen = new Map<string, BillLine>();
  const findings: Finding[] = [];
  for (const l of bill.lines) {
    const key = `${l.code}|${l.date}`;
    const first = seen.get(key);
    if (!first) {
      seen.set(key, l);
      continue;
    }
    if (l.modifier && MODIFIERS.repeatTest.includes(l.modifier)) continue;
    findings.push({
      line: l.line,
      code: l.code,
      type: 'duplicate',
      overcharge: money(l.charge),
      explanation: `"${describe(l.code)}" appears again on line ${l.line}, same day as line ${first.line}, with no modifier saying it was repeated on purpose.`,
      citation: 'Duplicate charge: same code, same date of service, no repeat-test modifier (91, 76 or 77).',
    });
  }
  return findings;
}

/** Tool 2: a component service billed separately when a comprehensive service already includes it. */
export function unbundlingCheck(bill: Bill, exclude: Set<number> = new Set()): Finding[] {
  const active = bill.lines.filter((l) => !exclude.has(l.line));
  const flagged = new Set<number>();
  const findings: Finding[] = [];
  for (const rule of BUNDLING_RULES) {
    for (const comp of active.filter((l) => l.code === rule.comprehensive && !flagged.has(l.line))) {
      for (const part of active.filter((l) => l.code === rule.component && l.date === comp.date)) {
        if (flagged.has(part.line)) continue;
        if (part.modifier && MODIFIERS.distinctProcedure.includes(part.modifier)) continue;
        flagged.add(part.line);
        findings.push({
          line: part.line,
          code: part.code,
          type: 'unbundling',
          overcharge: money(part.charge),
          explanation: `Line ${part.line} ("${describe(part.code)}") is billed separately, but line ${comp.line} ("${describe(comp.code)}") already includes it. ${rule.why}`,
          citation: `Bundling rule modeled on CMS NCCI procedure-to-procedure edits: ${rule.comprehensive} includes ${rule.component}.`,
        });
      }
    }
  }
  return findings;
}

/**
 * Tool 3: more units of a service in one day than is plausible.
 * Returns the findings plus how many units of each line are within the limit,
 * so the price check does not count the same dollars twice.
 */
export function unitsCheck(bill: Bill, exclude: Set<number> = new Set()) {
  const findings: Finding[] = [];
  const allowedUnits = new Map<number, number>();
  const usedByDay = new Map<string, number>();
  for (const l of bill.lines) {
    if (exclude.has(l.line)) continue;
    const ref = REFERENCE[l.code];
    if (!ref) {
      allowedUnits.set(l.line, l.units);
      continue;
    }
    const key = `${l.code}|${l.date}`;
    const used = usedByDay.get(key) ?? 0;
    const allowed = Math.max(0, Math.min(l.units, ref.maxUnitsPerDay - used));
    usedByDay.set(key, used + l.units);
    allowedUnits.set(l.line, allowed);
    const excess = l.units - allowed;
    if (excess > 0) {
      findings.push({
        line: l.line,
        code: l.code,
        type: 'units',
        overcharge: money(excess * unitPrice(l)),
        explanation: `Line ${l.line} bills ${l.units} units of "${ref.description}" in one day; the limit is ${ref.maxUnitsPerDay}. ${excess} extra unit${excess > 1 ? 's' : ''} at ${usd(unitPrice(l))} each.`,
        citation: `Max-units rule modeled on CMS Medically Unlikely Edits: ${l.code} allows ${ref.maxUnitsPerDay} per day.`,
      });
    }
  }
  return { findings, allowedUnits };
}

/**
 * Flag a price only when it is more than this % above the posted price.
 * Tuned on the eval set to minimize dollar-weighted error (see tuning.ts); a test keeps it in sync.
 */
export const PRICE_TOLERANCE_PCT = 6;

/** Tool 4: a unit price above the hospital's own posted cash price (the bills are self-pay). */
export function priceCheck(
  bill: Bill,
  exclude: Set<number> = new Set(),
  allowedUnits?: Map<number, number>,
  tolerancePct = PRICE_TOLERANCE_PCT,
): Finding[] {
  const findings: Finding[] = [];
  for (const l of bill.lines) {
    if (exclude.has(l.line)) continue;
    const ref = REFERENCE[l.code];
    if (!ref) continue;
    const units = allowedUnits?.get(l.line) ?? l.units;
    const diff = unitPrice(l) - ref.postedCashPrice;
    if (units <= 0 || diff <= 0.005) continue;
    if ((diff / ref.postedCashPrice) * 100 <= tolerancePct) continue;
    findings.push({
      line: l.line,
      code: l.code,
      type: 'price',
      overcharge: money(diff * units),
      explanation: `Line ${l.line} charges ${usd(unitPrice(l))} per unit for "${ref.description}", but the hospital's own posted cash price is ${usd(ref.postedCashPrice)}.`,
      citation: `Hospital's posted standard charges (cash price) under the federal hospital price transparency rule, 45 CFR Part 180: ${usd(ref.postedCashPrice)} per unit.`,
    });
  }
  return findings;
}

// Tool 5: possible upcoding. A bill cannot prove the visit was simpler than billed (that needs the
// medical record), so this is a heuristic that only produces a question, never a dispute.
const ER_LEVELS = ['99283', '99284', '99285'];
const WORKUP_CODES = new Set(['93005', '71046', '84484', '96374', '96375', '80053', '80048', '85025', 'J7030', 'J1885']);

export function upcodingCheck(bill: Bill): Finding[] {
  return bill.lines.flatMap((l) => {
    const level = ER_LEVELS.indexOf(l.code);
    if (level < 1) return [];
    const workup = bill.lines.filter((o) => o.date === l.date && WORKUP_CODES.has(o.code)).length;
    // Rough expectation: high complexity usually comes with 3+ tests or treatments, moderately high with 1+.
    const supported = workup >= 3 ? 2 : workup >= 1 ? 1 : 0;
    if (supported >= level) return [];
    const billed = REFERENCE[l.code];
    const suggested = REFERENCE[ER_LEVELS[supported]];
    return [{
      line: l.line,
      code: l.code,
      type: 'upcoding' as const,
      overcharge: money(billed.postedCashPrice - suggested.postedCashPrice),
      explanation: `Line ${l.line} bills "${billed.description}", but only ${workup} test${workup === 1 ? '' : 's'} or treatment${workup === 1 ? ' was' : 's were'} billed that day. Visits like this are often "${suggested.description.toLowerCase()}". Only your medical record can confirm it.`,
      citation: 'Heuristic only: ask the hospital for the documentation supporting this visit level. Not disputed automatically.',
    }];
  });
}

/** Context only: how far a charge sits above an illustrative Medicare-style benchmark. Never disputed. */
export function benchmarkContext(bill: Bill, minMultiple = 8): BenchmarkNote[] {
  return bill.lines.flatMap((l) => {
    const ref = REFERENCE[l.code];
    if (!ref) return [];
    const multiple = unitPrice(l) / ref.benchmarkRate;
    if (multiple < minMultiple) return [];
    return [{ line: l.line, code: l.code, unitCharge: money(unitPrice(l)), benchmarkRate: ref.benchmarkRate, multiple: Math.round(multiple) }];
  });
}

export { usd };

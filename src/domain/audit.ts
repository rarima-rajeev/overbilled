import { PRICE_TOLERANCE_PCT, benchmarkContext, duplicateCheck, priceCheck, unbundlingCheck, unitsCheck, upcodingCheck } from './checks.ts';
import { REFERENCE } from './reference.ts';
import type { AuditResult, Bill } from './types.ts';

export interface ToolStep {
  tool: string;
  label: string;
  found: number;
}

/**
 * Runs the tools in a fixed order. Lines already disputed in full (duplicate or unbundled)
 * are excluded from later checks so the same dollars are never claimed twice.
 */
export function auditBill(bill: Bill, priceTolerancePct = PRICE_TOLERANCE_PCT): { result: AuditResult; steps: ToolStep[] } {
  const dup = duplicateCheck(bill);
  const fullyDisputed = new Set(dup.map((f) => f.line));

  const unb = unbundlingCheck(bill, fullyDisputed);
  unb.forEach((f) => fullyDisputed.add(f.line));

  const units = unitsCheck(bill, fullyDisputed);
  const price = priceCheck(bill, fullyDisputed, units.allowedUnits, priceTolerancePct);
  const questions = upcodingCheck(bill);
  const notes = benchmarkContext(bill);

  const findings = [...dup, ...unb, ...units.findings, ...price].sort((a, b) => a.line - b.line);
  const totalOvercharge = Math.round(findings.reduce((s, f) => s + f.overcharge, 0) * 100) / 100;

  return {
    result: {
      billId: bill.id,
      findings,
      questions,
      notes,
      totalBilled: bill.lines.reduce((s, l) => s + l.charge, 0),
      totalOvercharge,
      uncheckedLines: bill.lines.filter((l) => !REFERENCE[l.code]).map((l) => l.line),
    },
    steps: [
      { tool: 'parse_bill', label: `Read ${bill.lines.length} line items`, found: 0 },
      { tool: 'duplicate_check', label: 'Checked for duplicate charges', found: dup.length },
      { tool: 'unbundling_check', label: 'Checked bundling rules', found: unb.length },
      { tool: 'units_check', label: 'Checked max units per day', found: units.findings.length },
      { tool: 'price_check', label: `Compared to posted prices (flags over ${priceTolerancePct}% above)`, found: price.length },
      { tool: 'upcoding_check', label: 'Checked visit level vs. services (ask only)', found: questions.length },
      { tool: 'benchmark_context', label: 'Compared to benchmark rates (context only)', found: notes.length },
    ],
  };
}

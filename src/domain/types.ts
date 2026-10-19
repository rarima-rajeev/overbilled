// Core data shapes shared by the check tools, the audit, the evals and the UI.

export type ErrorType = 'duplicate' | 'unbundling' | 'units' | 'price' | 'upcoding';

/** Types the agent may put in a dispute. Upcoding is never disputed: it can only be asked about. */
export const DISPUTABLE: ErrorType[] = ['duplicate', 'unbundling', 'units', 'price'];

export interface ReferenceCode {
  code: string;
  /** Plain-language description written for this demo (not an official code descriptor). */
  description: string;
  /** Max units billable per day for this code (modeled on CMS "Medically Unlikely Edits"). */
  maxUnitsPerDay: number;
  /** The fictional hospital's own posted cash price, per unit. */
  postedCashPrice: number;
  /** Illustrative Medicare-style benchmark, per unit. Context only, never an accusation. */
  benchmarkRate: number;
}

/** "comprehensive" already includes "component"; billing both on one day is unbundling. */
export interface BundlingRule {
  comprehensive: string;
  component: string;
  why: string;
}

export interface BillLine {
  line: number;
  code: string;
  date: string; // YYYY-MM-DD
  units: number;
  /** Total charge for the line (units x unit price). */
  charge: number;
  /** Billing modifier, e.g. "59" (distinct procedure) or "91" (repeat lab test). */
  modifier?: string;
}

export interface Bill {
  id: string;
  title: string;
  summary: string;
  patient: string;
  hospital: string;
  payer: 'Self-pay';
  lines: BillLine[];
}

export interface Finding {
  line: number;
  code: string;
  type: ErrorType;
  /** Dollars the patient should not owe because of this finding. */
  overcharge: number;
  explanation: string;
  citation: string;
}

/** Price context the agent shows but never disputes on its own. */
export interface BenchmarkNote {
  line: number;
  code: string;
  unitCharge: number;
  benchmarkRate: number;
  multiple: number;
}

export interface AuditResult {
  billId: string;
  findings: Finding[];
  /** "Worth asking about": suspicions the bill alone cannot prove (upcoding). Never disputed. */
  questions: Finding[];
  notes: BenchmarkNote[];
  totalBilled: number;
  totalOvercharge: number;
  /** Lines whose code is missing from the reference data, so price and units could not be checked. */
  uncheckedLines: number[];
}

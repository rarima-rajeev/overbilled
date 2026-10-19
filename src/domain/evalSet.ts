import type { Bill, BillLine, ErrorType } from './types.ts';

// Labeled eval cases: synthetic bills plus the answer key a human billing reviewer would give.
// Several cases are deliberately hard, so the scores show where the agent fails.

export interface ExpectedError {
  line: number;
  type: ErrorType;
  amount: number;
}

export interface EvalCase {
  id: string;
  name: string;
  why: string;
  bill: Bill;
  expected: ExpectedError[];
}

const D = '2026-06-01';
const mk = (id: string, lines: Omit<BillLine, 'line' | 'date'>[]): Bill => ({
  id,
  title: id,
  summary: '',
  patient: 'Eval patient (fictional)',
  hospital: 'Lakeside General Hospital',
  payer: 'Self-pay',
  lines: lines.map((l, i) => ({ date: D, ...l, line: i + 1 })),
});

export const EVAL_CASES: EvalCase[] = [
  {
    id: 'E01', name: 'Plain duplicate', why: 'Same blood count billed twice, no modifier.',
    bill: mk('E01', [{ code: '85025', units: 1, charge: 60 }, { code: '85025', units: 1, charge: 60 }]),
    expected: [{ line: 2, type: 'duplicate', amount: 60 }],
  },
  {
    id: 'E02', name: 'Same test, different days', why: 'Not a duplicate: different dates of service.',
    bill: { ...mk('E02', [{ code: '85025', units: 1, charge: 60 }]), lines: [
      { line: 1, code: '85025', date: '2026-06-01', units: 1, charge: 60 },
      { line: 2, code: '85025', date: '2026-06-02', units: 1, charge: 60 },
    ] },
    expected: [],
  },
  {
    id: 'E03', name: 'Repeat test with modifier 91', why: 'Legitimate repeat, correctly marked.',
    bill: mk('E03', [{ code: '84484', units: 1, charge: 95 }, { code: '84484', units: 1, charge: 95, modifier: '91' }]),
    expected: [],
  },
  {
    id: 'E04', name: 'Basic panel inside comprehensive panel', why: 'Classic unbundling.',
    bill: mk('E04', [{ code: '80053', units: 1, charge: 120 }, { code: '80048', units: 1, charge: 85 }]),
    expected: [{ line: 2, type: 'unbundling', amount: 85 }],
  },
  {
    id: 'E05', name: 'Injection in the other knee (modifier 59)', why: 'Legitimately separate procedure.',
    bill: mk('E05', [{ code: '29881', units: 1, charge: 9800 }, { code: '20610', units: 1, charge: 420, modifier: '59' }]),
    expected: [],
  },
  {
    id: 'E06', name: 'Modifier 59 misused', why: 'Glucose is inside the panel; 59 is not valid here. Rules alone trust the modifier.',
    bill: mk('E06', [{ code: '80053', units: 1, charge: 120 }, { code: '82947', units: 1, charge: 35, modifier: '59' }]),
    expected: [{ line: 2, type: 'unbundling', amount: 35 }],
  },
  {
    id: 'E07', name: 'Too many units', why: '10 units of a drug limited to 8 per day.',
    bill: mk('E07', [{ code: 'J1885', units: 10, charge: 250 }]),
    expected: [{ line: 1, type: 'units', amount: 50 }],
  },
  {
    id: 'E08', name: 'Units exactly at the limit', why: 'Three troponin tests is allowed.',
    bill: mk('E08', [{ code: '84484', units: 3, charge: 285 }]),
    expected: [],
  },
  {
    id: 'E09', name: 'Above posted price', why: 'Chest X-ray billed at $450 vs $310 posted.',
    bill: mk('E09', [{ code: '71046', units: 1, charge: 450 }]),
    expected: [{ line: 1, type: 'price', amount: 140 }],
  },
  {
    id: 'E10', name: 'At posted price', why: 'Charge equals the posted price.',
    bill: mk('E10', [{ code: '71046', units: 1, charge: 310 }]),
    expected: [],
  },
  {
    id: 'E11', name: 'Code missing from reference data', why: 'Critical-care code not in our price list, so it cannot be checked.',
    bill: mk('E11', [{ code: '99291', units: 1, charge: 3800 }]),
    expected: [{ line: 1, type: 'price', amount: 1200 }],
  },
  {
    id: 'E12', name: 'Three errors on one ER bill', why: 'Price, unbundling and units together.',
    bill: mk('E12', [
      { code: '99284', units: 1, charge: 1300 },
      { code: '80053', units: 1, charge: 120 },
      { code: '80048', units: 1, charge: 85 },
      { code: '36415', units: 2, charge: 60 },
    ]),
    expected: [
      { line: 1, type: 'price', amount: 200 },
      { line: 3, type: 'unbundling', amount: 85 },
      { line: 4, type: 'units', amount: 30 },
    ],
  },
  {
    id: 'E13', name: 'Real repeat test, modifier forgotten', why: 'Second troponin was medically needed; only the modifier is missing. Rules call it a duplicate.',
    bill: mk('E13', [{ code: '84484', units: 1, charge: 95 }, { code: '84484', units: 1, charge: 95 }]),
    expected: [],
  },
  {
    id: 'E14', name: 'Small price difference', why: '$62 vs $60 posted: small, still an error.',
    bill: mk('E14', [{ code: '85025', units: 1, charge: 62 }]),
    expected: [{ line: 1, type: 'price', amount: 2 }],
  },
  {
    id: 'E15', name: 'Both-menisci surgery plus one-meniscus surgery', why: 'Expensive unbundling.',
    bill: mk('E15', [{ code: '29880', units: 1, charge: 10500 }, { code: '29881', units: 1, charge: 9800 }]),
    expected: [{ line: 2, type: 'unbundling', amount: 9800 }],
  },
];

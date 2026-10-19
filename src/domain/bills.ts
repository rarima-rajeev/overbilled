import { HOSPITAL } from './reference.ts';
import type { Bill } from './types.ts';

// Synthetic, self-pay sample bills with errors planted on purpose.
// Patients are fictional placeholders; no real bill was used.

export const SAMPLE_BILLS: Bill[] = [
  {
    id: 'er-chest-pain',
    title: 'ER visit: chest pain',
    summary: 'Evening ER visit with heart tests, labs and IV medication.',
    patient: 'Sample Patient A (fictional)',
    hospital: HOSPITAL.name,
    payer: 'Self-pay',
    lines: [
      { line: 1, code: '99285', date: '2026-09-14', units: 1, charge: 2400 },
      { line: 2, code: '93005', date: '2026-09-14', units: 1, charge: 140 },
      { line: 3, code: '71046', date: '2026-09-14', units: 1, charge: 310 },
      { line: 4, code: '80053', date: '2026-09-14', units: 1, charge: 120 },
      { line: 5, code: '80048', date: '2026-09-14', units: 1, charge: 85 },
      { line: 6, code: '85025', date: '2026-09-14', units: 1, charge: 60 },
      { line: 7, code: '85025', date: '2026-09-14', units: 1, charge: 60 },
      { line: 8, code: '84484', date: '2026-09-14', units: 5, charge: 475 },
      { line: 9, code: '36415', date: '2026-09-14', units: 1, charge: 30 },
      { line: 10, code: '96374', date: '2026-09-14', units: 1, charge: 260 },
      { line: 11, code: 'J1885', date: '2026-09-14', units: 2, charge: 50 },
      { line: 12, code: 'J7030', date: '2026-09-14', units: 1, charge: 90 },
    ],
  },
  {
    id: 'knee-surgery',
    title: 'Outpatient knee surgery',
    summary: 'Same-day knee arthroscopy with imaging and pain medication.',
    patient: 'Sample Patient C (fictional)',
    hospital: HOSPITAL.name,
    payer: 'Self-pay',
    lines: [
      { line: 1, code: '73562', date: '2026-07-21', units: 1, charge: 395 },
      { line: 2, code: '29880', date: '2026-07-21', units: 1, charge: 10500 },
      { line: 3, code: '29881', date: '2026-07-21', units: 1, charge: 9800 },
      { line: 4, code: '20610', date: '2026-07-21', units: 1, charge: 420 },
      { line: 5, code: 'J1885', date: '2026-07-21', units: 12, charge: 300 },
      { line: 6, code: '97161', date: '2026-07-21', units: 1, charge: 240 },
    ],
  },
  {
    id: 'annual-labs',
    title: 'Annual lab work',
    summary: 'Routine yearly blood tests ordered by a primary care doctor.',
    patient: 'Sample Patient B (fictional)',
    hospital: HOSPITAL.name,
    payer: 'Self-pay',
    lines: [
      { line: 1, code: '36415', date: '2026-08-03', units: 3, charge: 90 },
      { line: 2, code: '80053', date: '2026-08-03', units: 1, charge: 120 },
      { line: 3, code: '82947', date: '2026-08-03', units: 1, charge: 35 },
      { line: 4, code: '80061', date: '2026-08-03', units: 1, charge: 140 },
      { line: 5, code: '83036', date: '2026-08-03', units: 1, charge: 55 },
      { line: 6, code: '84443', date: '2026-08-03', units: 1, charge: 70 },
    ],
  },
  {
    id: 'er-minor-cut',
    title: 'ER visit: minor cut',
    summary: 'Short ER visit for a small cut, billed at the highest complexity level.',
    patient: 'Sample Patient E (fictional)',
    hospital: HOSPITAL.name,
    payer: 'Self-pay',
    lines: [
      { line: 1, code: '99285', date: '2026-10-02', units: 1, charge: 1650 },
      { line: 2, code: 'J1885', date: '2026-10-02', units: 1, charge: 25 },
    ],
  },
  {
    id: 'clean-er',
    title: 'ER visit: dehydration (clean)',
    summary: 'A correctly billed visit, including a legitimate repeat blood test.',
    patient: 'Sample Patient D (fictional)',
    hospital: HOSPITAL.name,
    payer: 'Self-pay',
    lines: [
      { line: 1, code: '99283', date: '2026-09-30', units: 1, charge: 650 },
      { line: 2, code: '85025', date: '2026-09-30', units: 1, charge: 60 },
      { line: 3, code: '85025', date: '2026-09-30', units: 1, charge: 60, modifier: '91' },
      { line: 4, code: '80048', date: '2026-09-30', units: 1, charge: 85 },
      { line: 5, code: 'J7030', date: '2026-09-30', units: 1, charge: 90 },
      { line: 6, code: '96374', date: '2026-09-30', units: 1, charge: 260 },
    ],
  },
];

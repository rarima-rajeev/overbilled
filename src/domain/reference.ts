import type { BundlingRule, ReferenceCode } from './types.ts';

// ALL VALUES IN THIS FILE ARE SYNTHETIC.
// - Hospital, prices and benchmark rates are invented for the demo.
// - Rule *types* (bundling pairs, max units per day) are modeled on public CMS concepts
//   (NCCI procedure-to-procedure edits and Medically Unlikely Edits), but the values here
//   were written by hand for illustration and are not copied from any CMS file.
// - Descriptions are our own plain-language wording, not official code descriptors.
// Nothing was downloaded to build this file.

export const HOSPITAL = {
  name: 'Lakeside General Hospital',
  note: 'Fictional hospital created for this demo',
  billingAddress: 'Billing Department, Lakeside General Hospital (fictional)',
  /** Reserved ".example" domain: it can never belong to a real inbox. */
  billingEmail: 'billing@lakeside-general.example',
};

const codes: ReferenceCode[] = [
  // Emergency department
  { code: '99283', description: 'Emergency visit, moderate complexity', maxUnitsPerDay: 1, postedCashPrice: 650, benchmarkRate: 80 },
  { code: '99284', description: 'Emergency visit, moderately high complexity', maxUnitsPerDay: 1, postedCashPrice: 1100, benchmarkRate: 130 },
  { code: '99285', description: 'Emergency visit, high complexity', maxUnitsPerDay: 1, postedCashPrice: 1650, benchmarkRate: 180 },
  { code: '93005', description: 'Heart rhythm tracing (ECG), tracing only', maxUnitsPerDay: 3, postedCashPrice: 140, benchmarkRate: 9 },
  { code: '71046', description: 'Chest X-ray, two views', maxUnitsPerDay: 2, postedCashPrice: 310, benchmarkRate: 35 },
  { code: '96374', description: 'IV push medication, first drug', maxUnitsPerDay: 1, postedCashPrice: 260, benchmarkRate: 40 },
  { code: '96375', description: 'IV push medication, each additional drug', maxUnitsPerDay: 6, postedCashPrice: 120, benchmarkRate: 18 },
  { code: 'J1885', description: 'Pain-relief injection (ketorolac), per 15 mg', maxUnitsPerDay: 8, postedCashPrice: 25, benchmarkRate: 1 },
  { code: 'J7030', description: 'Saline IV fluid, 1000 cc bag', maxUnitsPerDay: 5, postedCashPrice: 90, benchmarkRate: 2 },
  // Lab
  { code: '36415', description: 'Routine blood draw from a vein', maxUnitsPerDay: 1, postedCashPrice: 30, benchmarkRate: 3 },
  { code: '80053', description: 'Comprehensive metabolic blood panel (14 tests)', maxUnitsPerDay: 1, postedCashPrice: 120, benchmarkRate: 11 },
  { code: '80048', description: 'Basic metabolic blood panel (8 tests)', maxUnitsPerDay: 1, postedCashPrice: 85, benchmarkRate: 9 },
  { code: '82947', description: 'Blood glucose test', maxUnitsPerDay: 3, postedCashPrice: 35, benchmarkRate: 4 },
  { code: '85025', description: 'Complete blood count with differential', maxUnitsPerDay: 2, postedCashPrice: 60, benchmarkRate: 8 },
  { code: '84484', description: 'Troponin (heart muscle damage) blood test', maxUnitsPerDay: 3, postedCashPrice: 95, benchmarkRate: 11 },
  { code: '80061', description: 'Cholesterol (lipid) panel', maxUnitsPerDay: 1, postedCashPrice: 75, benchmarkRate: 13 },
  { code: '83036', description: 'Hemoglobin A1c (3-month blood sugar) test', maxUnitsPerDay: 1, postedCashPrice: 55, benchmarkRate: 10 },
  { code: '84443', description: 'Thyroid stimulating hormone (TSH) test', maxUnitsPerDay: 1, postedCashPrice: 70, benchmarkRate: 17 },
  // Outpatient orthopedics
  { code: '29880', description: 'Knee arthroscopy, trimming both menisci', maxUnitsPerDay: 1, postedCashPrice: 10500, benchmarkRate: 560 },
  { code: '29881', description: 'Knee arthroscopy, trimming one meniscus', maxUnitsPerDay: 1, postedCashPrice: 9800, benchmarkRate: 520 },
  { code: '20610', description: 'Large joint injection or fluid removal', maxUnitsPerDay: 2, postedCashPrice: 420, benchmarkRate: 60 },
  { code: '73562', description: 'Knee X-ray, three views', maxUnitsPerDay: 2, postedCashPrice: 280, benchmarkRate: 38 },
  { code: '97161', description: 'Physical therapy evaluation, low complexity', maxUnitsPerDay: 1, postedCashPrice: 240, benchmarkRate: 100 },
];

export const REFERENCE: Record<string, ReferenceCode> = Object.fromEntries(codes.map((c) => [c.code, c]));

export const BUNDLING_RULES: BundlingRule[] = [
  { comprehensive: '80053', component: '80048', why: 'Every test in the basic panel is already part of the comprehensive panel.' },
  { comprehensive: '80053', component: '82947', why: 'Glucose is one of the tests inside the comprehensive panel.' },
  { comprehensive: '80048', component: '82947', why: 'Glucose is one of the tests inside the basic panel.' },
  { comprehensive: '29880', component: '29881', why: 'Trimming both menisci already includes trimming one meniscus.' },
  { comprehensive: '29881', component: '20610', why: 'A joint injection in the same knee during arthroscopy is part of the surgery.' },
  { comprehensive: '29880', component: '20610', why: 'A joint injection in the same knee during arthroscopy is part of the surgery.' },
];

/** Modifiers that tell the payer "this repeat or pair is intentional". */
export const MODIFIERS = {
  repeatTest: ['91', '76', '77'],
  distinctProcedure: ['59', 'XS', 'XU'],
};

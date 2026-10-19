import type { EvalCase, ExpectedError } from './evalSet.ts';
import { BUNDLING_RULES, REFERENCE } from './reference.ts';
import type { BillLine, ErrorType } from './types.ts';

// Seeded generator for labeled synthetic bills. Same seed, same bills, so results are reproducible.
// It plants real errors AND traps that look like errors but are not (legit repeats, price-list
// changes, genuinely complex visits), so precision is tested, not just recall.

/** mulberry32: tiny deterministic PRNG. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Draft = Omit<BillLine, 'line' | 'date'> & { used?: boolean };
interface Plant { target: Draft; type: ErrorType; amount: number }

export type PlantKind =
  | 'duplicate' | 'repeat_modifier_forgotten' | 'repeat_with_91'
  | 'unbundling' | 'modifier59_legit' | 'modifier59_misused'
  | 'units' | 'price_large' | 'price_small' | 'price_list_changed'
  | 'upcoding' | 'complex_visit_few_tests';

const posted = (code: string) => REFERENCE[code].postedCashPrice;
const line = (code: string, units = 1): Draft => ({ code, units, charge: posted(code) * units });

export function generateCases(n: number, seed: number, prefix = 'G'): EvalCase[] {
  const r = rng(seed);
  const int = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const cases: EvalCase[] = [];

  for (let i = 0; i < n; i++) {
    const template = pick(['er_high', 'er_mid', 'labs', 'knee', 'er_minor'] as const);
    let lines: Draft[];
    switch (template) {
      case 'er_high':
        lines = [line('99285'), line('93005'), line('71046'), line('80053'), line('85025'), line('84484', int(1, 2)), line('96374'), line('J7030')];
        break;
      case 'er_mid':
        lines = [line('99284'), line('85025'), line('80048'), line('J7030')];
        break;
      case 'labs':
        lines = [line('36415'), line('80053'), line('80061'), line('83036'), line('84443')];
        break;
      case 'knee':
        lines = [line('73562'), line('29881'), line('J1885', int(4, 6)), line('97161')];
        break;
      case 'er_minor':
        // Billed as high complexity with little workup: sometimes upcoding, sometimes a genuinely complex visit.
        lines = [line('99285'), ...(r() < 0.5 ? [line('J1885', 2)] : []), ...(r() < 0.4 ? [line('85025')] : [])];
        break;
    }

    const plants: Plant[] = [];
    const kinds: PlantKind[] = [];
    const free = () => lines.filter((l) => !l.used && REFERENCE[l.code]);
    const has = (code: string) => lines.find((l) => l.code === code);

    const tryPlant = (kind: PlantKind): boolean => {
      switch (kind) {
        case 'duplicate': {
          const t = pick(free().filter((l) => !['99283', '99284', '99285', '29881'].includes(l.code) && l.units === 1));
          if (!t) return false;
          const copy = { ...t, used: true };
          t.used = true;
          lines.push(copy);
          plants.push({ target: copy, type: 'duplicate', amount: copy.charge });
          return true;
        }
        case 'repeat_modifier_forgotten':
        case 'repeat_with_91': {
          const t = has('84484');
          if (!t || t.used || t.units > 2) return false;
          t.used = true;
          lines.push({ ...line('84484'), used: true, modifier: kind === 'repeat_with_91' ? '91' : undefined });
          return true; // not an error either way
        }
        case 'unbundling': {
          const options = BUNDLING_RULES.filter((b) => has(b.comprehensive) && !has(b.component));
          if (!options.length) return false;
          const rule = pick(options);
          const comp = { ...line(rule.component), used: true };
          lines.push(comp);
          plants.push({ target: comp, type: 'unbundling', amount: comp.charge });
          return true;
        }
        case 'modifier59_legit': {
          if (!has('29881') || has('20610')) return false;
          lines.push({ ...line('20610'), modifier: '59', used: true }); // injection in the other knee
          return true;
        }
        case 'modifier59_misused': {
          if (!has('80053') || has('82947')) return false;
          const comp = { ...line('82947'), modifier: '59', used: true };
          lines.push(comp);
          plants.push({ target: comp, type: 'unbundling', amount: comp.charge });
          return true;
        }
        case 'units': {
          const t = pick(free().filter((l) => ['J1885', '36415', 'J7030', '85025'].includes(l.code)));
          if (!t) return false;
          const max = REFERENCE[t.code].maxUnitsPerDay;
          const units = max + int(1, 3);
          t.units = units;
          t.charge = posted(t.code) * units;
          t.used = true;
          plants.push({ target: t, type: 'units', amount: posted(t.code) * (units - max) });
          return true;
        }
        case 'price_large':
        case 'price_small':
        case 'price_list_changed': {
          const t = pick(free());
          if (!t) return false;
          const pct = kind === 'price_large' ? 15 + r() * 45 : kind === 'price_small' ? 2 + r() * 10 : 1 + r() * 6;
          const unit = Math.round(posted(t.code) * (1 + pct / 100));
          if (unit <= posted(t.code)) return false;
          t.charge = unit * t.units;
          t.used = true;
          // A price-list change is legitimate: the hospital lowered its posted price after the visit, so the charge
          // matched the (higher) list in effect on the date of service.
          if (kind !== 'price_list_changed') plants.push({ target: t, type: 'price', amount: (unit - posted(t.code)) * t.units });
          return true;
        }
        case 'upcoding':
        case 'complex_visit_few_tests': {
          if (template !== 'er_minor') return false;
          const t = lines[0];
          t.used = true;
          if (kind === 'upcoding') {
            const workup = lines.length - 1;
            const fair = workup >= 1 ? '99284' : '99283';
            plants.push({ target: t, type: 'upcoding', amount: posted('99285') - posted(fair) });
          }
          return true;
        }
      }
    };

    if (template === 'er_minor') {
      const kind = r() < 0.65 ? 'upcoding' : 'complex_visit_few_tests';
      tryPlant(kind);
      kinds.push(kind);
    }
    const count = r() < 0.15 ? 0 : int(1, 2);
    const weighted: PlantKind[] = [
      'duplicate', 'duplicate', 'repeat_modifier_forgotten', 'repeat_with_91',
      'unbundling', 'unbundling', 'unbundling', 'modifier59_legit', 'modifier59_misused',
      'units', 'units', 'units', 'price_large', 'price_large', 'price_small', 'price_small',
      'price_list_changed', 'price_list_changed', 'price_list_changed',
    ];
    // On a minor-ER bill, adding lines would change the visit-level evidence, so only price/units plants apply.
    const pool = template === 'er_minor' ? weighted.filter((k) => k.startsWith('price') || k === 'units') : weighted;
    for (let k = 0, tries = 0; k < count && tries < 20; tries++) {
      const kind = pick(pool);
      if (tryPlant(kind)) {
        kinds.push(kind);
        k++;
      }
    }

    const numbered = lines.map((l, idx) => ({ draft: l, line: idx + 1 }));
    const lineOf = (d: Draft) => numbered.find((x) => x.draft === d)!.line;
    const expected: ExpectedError[] = plants.map((p) => ({ line: lineOf(p.target), type: p.type, amount: p.amount }));
    const id = `${prefix}${String(i + 1).padStart(3, '0')}`;

    cases.push({
      id,
      name: `${template.replace('_', ' ')}: ${kinds.join(', ').replace(/_/g, ' ') || 'clean'}`,
      why: kinds.length ? `Generated with: ${kinds.join(', ').replace(/_/g, ' ')}.` : 'Generated clean bill.',
      bill: {
        id,
        title: id,
        summary: '',
        patient: 'Eval patient (fictional)',
        hospital: 'Lakeside General Hospital',
        payer: 'Self-pay',
        lines: numbered.map(({ draft, line: n }) => ({
          line: n,
          code: draft.code,
          date: '2026-05-01',
          units: draft.units,
          charge: draft.charge,
          ...(draft.modifier ? { modifier: draft.modifier } : {}),
        })),
      },
      expected,
    });
  }
  return cases;
}

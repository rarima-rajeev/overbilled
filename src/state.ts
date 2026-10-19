import { useEffect, useMemo, useState } from 'react';
import { auditBill } from './domain/audit.ts';
import { earnedLevels, type Level } from './domain/autonomy.ts';
import { SAMPLE_BILLS } from './domain/bills.ts';
import { runEvals } from './domain/evals.ts';
import { templateLetter } from './domain/letter.ts';
import type { Finding } from './domain/types.ts';
import { AI_LETTERS, findingKey } from './ui.ts';

/** State shared across pages: the picked bill, the autonomy level, and which findings the patient confirmed. */
export function useAppState() {
  const [billId, setBillId] = useState(SAMPLE_BILLS[0].id);
  const [level, setLevel] = useState<Level>(2);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const bill = SAMPLE_BILLS.find((b) => b.id === billId)!;
  const { result, steps } = useMemo(() => auditBill(bill), [bill]);
  const report = useMemo(() => runEvals(), []);
  const levels = useMemo(() => earnedLevels(report), [report]);

  useEffect(() => setConfirmed(new Set()), [billId]);

  // A finding goes into the letter automatically only if its type earned Level 2; otherwise the patient confirms it.
  const needsConfirm = (f: Finding) => levels[f.type] < 2;
  const inLetter = result.findings.filter((f) => !needsConfirm(f) || confirmed.has(findingKey(f)));
  const letterResult = { ...result, findings: inLetter, totalOvercharge: inLetter.reduce((s, f) => s + f.overcharge, 0) };
  const ai = AI_LETTERS[bill.id];
  const useAi = !!ai && inLetter.length === result.findings.length;
  const letter = useAi ? ai!.letter : templateLetter(bill, letterResult);

  const toggle = (f: Finding) =>
    setConfirmed((prev) => {
      const next = new Set(prev);
      const k = findingKey(f);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return {
    bill, billId, setBillId, level, setLevel, result, steps, report, levels,
    confirmed, toggle, needsConfirm, inLetter, letterResult, letter, ai, useAi,
  };
}

export type AppState = ReturnType<typeof useAppState>;

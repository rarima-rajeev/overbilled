// Generates the AI-written summary and dispute letter for each sample bill, once, offline.
// The website only replays the saved output, so public visitors never trigger an API call.
//
// Usage: put OPENROUTER_API_KEY and OPENROUTER_MODEL in .env, then `npm run ai:letters`.

import { writeFileSync } from 'node:fs';
import { auditBill } from '../src/domain/audit.ts';
import { SAMPLE_BILLS } from '../src/domain/bills.ts';
import { LETTER_DISCLAIMER, ungroundedAmounts } from '../src/domain/letter.ts';
import { HOSPITAL, REFERENCE } from '../src/domain/reference.ts';

const key = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL;
if (!key || !model) {
  console.error('Set OPENROUTER_API_KEY and OPENROUTER_MODEL in .env first (see .env.example).');
  process.exit(1);
}

const SYSTEM = `You write patient-friendly billing summaries and dispute letters.
Rules:
- Use ONLY the facts in the AUDIT JSON. Do not add charges, codes, laws or dollar amounts that are not in it.
- Every flagged line must be mentioned as "Line N".
- For every finding, include its citation WORD FOR WORD on its own line, starting with "Basis: ". Do not shorten, reword or strengthen it.
- Polite, firm, specific. No threats, no legal claims beyond the citations given.
- Reply with JSON only: {"summary": "<2-3 plain-English sentences for the patient>", "letter": "<the full letter>"}.`;

const out: Record<string, unknown> = {};

for (const bill of SAMPLE_BILLS) {
  const { result } = auditBill(bill);
  if (result.findings.length === 0) {
    console.log(`- ${bill.id}: no findings, skipped`);
    continue;
  }
  const audit = {
    hospital: HOSPITAL.billingAddress,
    patient: bill.patient,
    payer: bill.payer,
    totalBilled: result.totalBilled,
    totalRequestedAdjustment: result.totalOvercharge,
    findings: result.findings.map((f) => ({ ...f, description: REFERENCE[f.code]?.description })),
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      // Cap the reply: without this, OpenRouter reserves credit for the model's maximum output.
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `AUDIT JSON:\n${JSON.stringify(audit, null, 2)}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`- ${bill.id}: API error ${res.status} ${await res.text()}`);
    continue;
  }
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? '';
  let parsed: { summary: string; letter: string };
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    console.error(`- ${bill.id}: model did not return JSON, skipped`);
    continue;
  }

  // Guardrails: reject output that invents dollar amounts or skips a flagged line.
  const bad = ungroundedAmounts(`${parsed.summary}\n${parsed.letter}`, bill, result);
  const missing = result.findings.filter((f) => !parsed.letter.includes(`Line ${f.line}`)).map((f) => f.line);
  // Citations must be quoted exactly, so the model cannot turn "modeled on CMS" into "CMS says".
  const reworded = result.findings.filter((f) => !parsed.letter.includes(f.citation)).map((f) => f.line);
  if (bad.length || missing.length || reworded.length) {
    console.error(
      `- ${bill.id}: REJECTED (ungrounded amounts: ${bad.join(', ') || 'none'}; missing lines: ${missing.join(', ') || 'none'}; reworded citations: ${reworded.join(', ') || 'none'})`,
    );
    continue;
  }

  out[bill.id] = {
    model,
    generatedAt: new Date().toISOString(),
    summary: parsed.summary,
    letter: `${LETTER_DISCLAIMER}\n\n${parsed.letter}`,
    usage: { inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0 },
  };
  console.log(`- ${bill.id}: ok (${data.usage?.prompt_tokens ?? '?'} in / ${data.usage?.completion_tokens ?? '?'} out tokens)`);
}

writeFileSync(new URL('../src/data/ai-letters.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('Saved src/data/ai-letters.json');

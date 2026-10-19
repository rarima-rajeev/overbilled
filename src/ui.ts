import aiLettersJson from './data/ai-letters.json';
import type { ErrorType, Finding } from './domain/types.ts';

export { usd } from './domain/checks.ts';

export interface AiLetter {
  model: string;
  generatedAt: string;
  summary: string;
  letter: string;
  usage: { inputTokens: number; outputTokens: number };
}
export const AI_LETTERS = aiLettersJson as Record<string, AiLetter | undefined>;

export const TYPE_LABEL: Record<ErrorType, string> = {
  duplicate: 'Duplicate',
  unbundling: 'Unbundled',
  units: 'Too many units',
  price: 'Above posted price',
  upcoding: 'Possible upcoding',
};

export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const findingKey = (f: Finding) => `${f.line}-${f.type}`;

export function saveFile(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

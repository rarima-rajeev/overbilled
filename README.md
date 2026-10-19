# Overbilled

**An AI agent that audits medical bills against billing rules and the hospital's own posted prices, then drafts a cited dispute letter.**

> Educational portfolio demo. All bills, patients, prices and the hospital are synthetic. Not medical, legal or billing advice.

## What it shows (AI PM skills)

| Skill | Where to see it |
|---|---|
| **Tool-using agent design** | Five check tools written as plain code (`src/domain/checks.ts`). The LLM writes the explanations, never the math. |
| **Autonomy ladder (L1–L4)** | Autonomy page, `src/domain/autonomy.ts`, `src/LevelPanels.tsx`. Each error type earns a level from eval precision and sample size. L3 sends only the types that earned it; the rest stay drafts. |
| **Demotion rules** | Promotion and demotion thresholds with hysteresis, plus a drift simulator (`levelAfterDrift`). |
| **Cost-aware error analysis** | Evals page: an error-cost matrix per type. Misses cost the dollars missed, false accusations $150, false questions $20. |
| **Dollar-weighted threshold tuning** | The price tolerance (6%) is the minimum-cost point of a sweep on a separate tuning set, then scored on a held-out test set. A test keeps the constant in sync. |
| **Model routing and unit economics** | Economics page, `src/domain/economics.ts`: small model to read, plain code to check, large model to write. Cost per audit, ROI, and what would change the routing decision. |
| **Knowing what AI shouldn't decide** | Possible upcoding is a heuristic capped at L1: it asks, never accuses, because only the medical record can confirm it. |
| **Grounding guardrail** | `ungroundedAmounts()` rejects any AI letter that mentions a dollar amount not in the audit. |

## Eval design

- **Tuning set:** 100 generated bills (seed 1). Used only to choose the price tolerance.
- **Test set:** 15 hand-written edge cases + 100 generated bills (seed 2). Every reported number comes from here.
- The generator (`src/domain/generator.ts`) plants real errors **and traps that only look like errors**: repeat tests with a forgotten modifier, price-list changes, genuinely complex ER visits, legitimate modifier 59.
- Current test-set results: recall 86%, precision 83% overall. Unbundling and units earn L3; price earns L2; duplicates and upcoding stay at L1. All numbers are synthetic and illustrative.

## Run it

```bash
npm install
npm run dev      # website
npm test         # 16 tests: tools, generator, tuning, levels, demotion, routing
npm run build    # production build in dist/
```

### AI-written letters

The sample-bill summaries and letters on the site were written by `anthropic/claude-sonnet-5.5` via OpenRouter and passed two guardrails: no dollar amount that isn't in the audit, and every rule citation quoted word for word. (The first run passed the dollar check but reworded "modeled on CMS" as "CMS", overstating the evidence; that is why the citation check exists.) Total cost of all runs: about $0.12.

To regenerate them:

1. Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.
2. Run `npm run ai:letters`. This calls the model once per sample bill, runs the grounding check, and saves the passing output to `src/data/ai-letters.json`.
3. Commit that JSON. The deployed site only replays it, so visitors never trigger API calls and the key never reaches the browser.

## Deploy (Vercel)

Import the repo in Vercel. It detects Vite automatically (build command `npm run build`, output `dist`). No environment variables are needed on Vercel.

## Data and safety

- **No downloads, no real data.** Every bill, patient, price and the hospital ("Lakeside General Hospital") is invented.
- **Rules are illustrative.** Rule *types* are modeled on public CMS concepts (NCCI procedure-to-procedure edits, Medically Unlikely Edits, and the hospital price transparency rule, 45 CFR Part 180). The *values* were written by hand for this demo and are not copied from CMS files.
- **No official code descriptors.** Service descriptions are original plain-language wording. CPT® is a registered trademark of the American Medical Association; this project does not include or redistribute the CPT code set.
- **Photos:** all page photos are from Unsplash under the free Unsplash License (checked per photo; none are Unsplash+). The license does not require credit, so none is shown on the site; each photo's source and photographer are recorded in `src/pages/PagePhoto.tsx`. The landing image is AI-generated and labelled as such.
- **Nothing is sent.** Levels 3–4 (send, follow up) are simulation previews. The hospital email uses the reserved `.example` domain, and the calendar reminder is a local .ics download.
- **Level 4 stop rules** (`src/domain/followup.ts`): only rule-based items under $500, at most 2 follow-ups 14 days apart, stop on any reply, never escalate.

## Project layout

```
src/domain/
  reference.ts   synthetic hospital, code reference and bundling rules
  bills.ts       5 sample bills (3 with errors, 1 upcoding question, 1 clean)
  checks.ts      the 5 tools + price tolerance + price-context note
  audit.ts       runs the tools, avoids double counting
  letter.ts      template letter + grounding check
  evalSet.ts     15 hand-written labeled cases
  generator.ts   seeded generator for labeled bills
  evals.ts       test/tuning sets, cost matrix, threshold sweep
  autonomy.ts    L1–L4 promotion and demotion rules
  economics.ts   model routing cost model and ROI
  followup.ts    L4 eligibility, timeline, follow-up letters, .ics reminder
src/pages/            one file per page
src/LevelPanels.tsx   what each level does in the UI
scripts/generate-ai-letters.ts   offline LLM step (OpenRouter)
```

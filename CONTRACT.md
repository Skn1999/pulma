# Module contract (for parallel builders)

Read `CLAUDE.md` (hard rules) and `lib/types.ts` first. Build ONLY the files assigned to you.
Next.js 16 App Router, React 19, Tailwind v4 (CSS-first, `app/globals.css`), shadcn/ui in `components/ui`.
Route handler `params` and `cookies()` are async in Next 16: `const { id } = await params`.

## lib/store.ts (server only)
```ts
export function getDB(): DB                // read (cached in memory)
export function mutate<T>(fn: (db: DB) => T): T   // apply change, persist, return fn result
export function resetDB(): void            // restore from seed
```
Persistence: if `process.env.VERCEL` is set, memory only (seeded from `data/seed.ts`); otherwise
`data/db.json` written atomically (tmp file + rename), created from seed on first read.
Helpers (also exported): `newId(prefix)`, `nextPublicCode(db, cardId)`.

## data/seed.ts
`export const seed: DB` — fully typed. Event date `2026-12-05`, 10:00–14:00, 10-min slots, 6 tables.
Fixed ids the app relies on:
- company `co-cleantech` (clean-tech), card `card-cleantech` (≈8 responses incl. 3 generic AI fluff)
- talent `t-olena` (Olena, preferredLanguage "Ukrainian") — has NOT answered `card-cleantech`
- persona defaults: company `co-cleantech`, talent `t-olena`

## lib/persona.ts (server only)
```ts
export async function getRole(): Promise<Role>                // cookie "pulma_role", default "talent"
export async function getCompanyId(): Promise<string>         // cookie "pulma_company", default "co-cleantech"
export async function getTalentId(): Promise<string>          // cookie "pulma_talent", default "t-olena"
```
Set via `POST /api/persona` `{ role?, companyId?, talentId? }`.

## lib/ai.ts (server only) — every function MUST return a fallback, never throw
```ts
export async function generateProblemCard(a: IntakeAnswers): Promise<{ draft: CardDraft; suggestions: string[]; fallback: boolean }>
export async function suggestClarity(text: string): Promise<{ suggestion: string | null; fallback: boolean }>
export async function translate(text: string, from: string, to: string): Promise<{ text: string | null; fallback: boolean }>
```
Model `claude-sonnet-5-5`, key `ANTHROPIC_API_KEY`, 8s timeout. Prompts in `lib/prompts.ts`.

## lib/schedule.ts / lib/stats.ts — pure, no I/O
```ts
// schedule.ts
export interface Slot { meetingId: string; cardId: string; companyId: string; responseId: string; talentId: string; table: number; start: string; end: string }
export function buildSchedule(db: DB): { slots: Slot[]; arrivals: Record<string /*talentId*/, string /*ISO*/>; unscheduled: string[] /*meetingIds*/ }
// stats.ts
export function getStats(db: DB): {
  counts: { cards: number; responses: number; shortlists: number; meetings: number };
  sectors: { name: string; count: number }[];
  languages: { name: string; count: number }[];
  timeline: { cardId: string; title: string; createdAt: string; daysBeforeEvent: number }[];
  noInvite: { responseId: string; publicCode: string; cardTitle: string; talentId: string }[];
}
```
Each company has one fixed table: index of company in `db.companies` (1-based, mod tables).
Talent arrival = 15 min before their first slot.

## API routes (app/api/…)
| Method + path | Body / returns |
|---|---|
| GET `/api/cards` | published cards + company |
| POST `/api/cards` | `{draft, companyId}` → card (published) |
| POST `/api/ai/card` | `IntakeAnswers` → generateProblemCard result |
| POST `/api/ai/clarity` | `{text}` |
| POST `/api/ai/translate` | `{text, from, to}` |
| POST `/api/responses` | `{cardId, text, originalLanguage, translatedText?, aiAssisted}` (talent from cookie) |
| GET `/api/cards/[id]/responses` | `BlindResponse[]` — NEVER talentId/names |
| POST `/api/shortlists` | `{cardId, responseId, note?}` max 5 per card → 409 when full |
| DELETE `/api/shortlists/[id]` / PATCH `{note}` | |
| POST `/api/shortlists/[id]/respond` | `{accept: boolean}`; accept creates Meeting then rebuilds schedule |
| POST `/api/reset` | resetDB |

## Shared UI components (components/)
- `ProblemCardView` (`components/problem-card.tsx`): props `{ card: ProblemCard | CardDraft; company?: Company; compact?: boolean }` — index-card look.
- `AiLabel` (`components/ai-label.tsx`): small badge, text "AI-assisted wording" + icon (not colour alone).
- `PageHeader` (`components/page-header.tsx`): `{ title; subtitle?; }`.

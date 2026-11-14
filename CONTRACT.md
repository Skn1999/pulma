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

---

# v2: Accounts, profile, app shell (supersedes "persona" and the role switcher)

**Rule: one email = one account = one role, permanently.** The role is chosen once at
registration. No endpoint, form or cookie may change an account's role. To act in another
role you register a different email. There are no passwords (demo; email-only sign-in).

## Data
`Account` in `lib/types.ts`, stored in `db.accounts`. Seed creates accounts for:
every company (`hiring@<company-slug>.example`, displayName = an invented hiring contact,
companyId set), every talent (their existing `email`, talentId set), and one organiser
`events@talentday.example` ("Event team"). Demo accounts shown on the sign-in page:
Kiertovolt (company `co-cleantech`), Olena (`t-olena`), Event team (organiser).

## lib/session.ts (server only) — replaces cookie-persona logic
```ts
export const SESSION_COOKIE = "pulma_session";              // httpOnly, sameSite lax, path /, value = account.id
export async function getAccount(): Promise<Account | null>
export async function requireAccount(role?: Role): Promise<Account>
  // pages/layouts: no session → redirect("/signin"); wrong role → redirect(roleHome(account.role))
export async function apiAccount(role?: Role): Promise<Account | NextResponse>
  // routes: 401 {error} if no session, 403 {error} if wrong role
export function roleHome(role: Role): string                 // company "/company", talent "/talent", organiser "/organiser"
export function normEmail(s: string): string
```
`lib/persona.ts` stays as thin wrappers so existing pages keep working:
`getRole()` = account role; `getCompanyId()` / `getTalentId()` = from the account (throw-free:
fall back to "" if missing).

## Auth & profile API
| Route | Behaviour |
|---|---|
| POST `/api/auth/signin` `{email}` | existing account → set cookie, `{status:"signed-in", role, home}`; unknown → `{status:"new"}` (no cookie) |
| POST `/api/auth/register` `{email, role, profile}` | 409 `{error, role}` if email exists ("already registered as Talent — sign in instead"). talent profile `{displayName, preferredLanguage?}` creates Talent; company profile `{displayName, companyName, sector, size, about}` creates Company; organiser `{displayName}`. Sets cookie, returns `{home}` |
| POST `/api/auth/signout` | clears cookie |
| GET/PATCH `/api/profile` | edit own profile fields only; a `role` or `email` key in the body → 400 "Account type and email can't be changed" |
| DELETE `/api/profile` | talent only: deletes account, talent, their responses + shortlists + meetings; clears cookie |
Existing routes get guards via `apiAccount`: company → POST cards, GET cards/[id]/responses (and only for own card), shortlists POST/PATCH/DELETE (own cards); talent → POST responses, shortlists/[id]/respond; organiser → POST reset. `/api/persona` is deleted.

## Pages
- `/` → signed in: redirect to roleHome; signed out: redirect `/signin`.
- `/signin` (no shell): one-line explainer, email field, "Demo accounts" one-click list.
- `/signin/new?email=` : choose account type (3 tiles) with a clear lock warning, then the profile fields for that type → register.
- `/profile` (inside shell): email + account type shown read-only with a lock icon and
  "Account type is tied to this email. To use Pulma as a [other], sign in with a different email.";
  editable profile fields; "What we store about you" list; Sign out; talent: "Delete my data".

## App shell (components/shell/*, lib/nav.ts)
```ts
// lib/nav.ts
export interface NavItem { href: string; label: string; icon: string /* lucide name */; badge?: number }
export function navFor(account: Account, db: DB): NavItem[]
// components/shell/app-shell.tsx  (server component)
export async function AppShell({ children }: { children: React.ReactNode })   // calls requireAccount(), builds nav
```
Nav — company: Problems `/company` (badge = new answers), New problem `/company/intake`, Event day `/event?company=me`.
Talent: Explore `/talent`, My answers `/talent/answers`, Invites `/talent/inbox` (badge = pending), My day `/event?talent=me`.
Organiser: Overview `/organiser`, Schedule `/event`.
Desktop: left sidebar (wordmark, nav, account menu at bottom). Mobile (<768px): top bar + bottom tab bar.
Account menu: initials avatar, name, role badge with a lock icon, Profile, Sign out.
Role layouts `app/{company,talent,organiser,event,profile}/layout.tsx` wrap children in `AppShell`;
company/talent/organiser layouts call `requireAccount(role)`; event/profile allow any role.
Toasts: `import { toast } from "sonner"`; `<Toaster />` is mounted once in the root layout.

---

# v3: Follow-up, invite message, edit/withdraw

## A. Post-meeting follow-up (uses existing `Feedback` type, `db.feedback`)
- POST `/api/feedback` `{meetingId, outcome: "next-step"|"not-now", note?}`; side comes from the session
  (company account must own the meeting's card; talent must own the meeting's response); one row per
  (meetingId, side) — re-posting replaces it (people can change their mind). 403/404 otherwise.
- Visibility: each side sees only its own choice, EXCEPT when both chose "next-step": then both see
  "You both want a next step", and the company sees the talent's email (mutual consent — the only
  place an email is ever shown). The other side's "not-now" is never revealed (show nothing / "No reply yet").
- Organiser sees aggregates only: conversations held (meetings), follow-ups answered, mutual next steps.
  Add to `getStats(db)`: `followUps: { meetings, answered, mutualNextSteps }`.
- For the demo, follow-up buttons are available for any scheduled meeting (no time gating).

## B. Invite message from the company
- POST `/api/shortlists` and PATCH `/api/shortlists/[id]` accept optional `message` (trim, ≤200 chars, else 400).
  Editable only while status is "invited". GET `/api/cards/[id]/responses` includes `shortlist.message`.
- Talent sees it in Invites as a quote from the company: "Why we'd like to talk: …".
- Human-written only. No AI drafting of this message.

## C. Talent edits or withdraws an answer
- PATCH `/api/responses/[id]` `{text, originalLanguage, translatedText?, aiAssisted}`; DELETE `/api/responses/[id]`.
  Talent must own it. Only allowed while NO shortlist row exists for the response → else 409
  "The company has already shortlisted this answer, so it can't be changed." PATCH sets `updatedAt`, keeps
  `publicCode`. DELETE hard-deletes the response (data minimisation).
- After a shortlist exists, the talent can still decline the invite (existing flow).

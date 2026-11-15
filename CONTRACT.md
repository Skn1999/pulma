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

---

# v4: Activity log, match thread, notifications, close the loop, language needs

Types are in `lib/types.ts`: `Activity`, `ActivityView`, `Closure`, `CLOSURE_REASONS`,
`ProblemCard.languagesNeeded`, `Account.notificationsSeenAt`, `db.closures`, `db.activity`.

## Privacy rules for everything below (non-negotiable)
- A company viewer NEVER receives a talent's name/email/talentId for a response unless that response's
  shortlist is "accepted" (email only on mutual next step, as in v3). Before that it is "#A3".
- A talent never learns another side's "not-now", and never sees other people's answers.
- Raw `Activity` rows never leave the server. Only `ActivityView`s built for the viewer.

## lib/activity.ts (server, pure helpers + one writer)
```ts
export function logActivity(db: DB, a: Omit<Activity, "id" | "at"> & { at?: string }): void   // call INSIDE mutate()
export function viewActivity(db: DB, account: Account, a: Activity): ActivityView | null       // null = not for this viewer
export function feedFor(db: DB, account: Account, opts?: { responseId?: string; limit?: number }): ActivityView[] // newest first
export function unseenCount(db: DB, account: Account): number   // items in feedFor not byMe and after notificationsSeenAt
```
Who sees what (feed/notifications):
- company (own cards only): card_published (byMe), answer_sent / answer_edited / answer_withdrawn ("New answer #A3 on
  'Battery sensor data'"), its own shortlist actions (byMe), invite_accepted ("#A3 accepted — you'll meet Olena Kovalenko"),
  invite_declined ("#A3 declined your invite"), meeting_scheduled, mutual_next_step.
- talent (own responses only): answer_sent/edited (byMe), shortlisted ("Kiertovolt shortlisted your answer #A3"),
  message_updated, answer_closed ("Kiertovolt: not this time — {reason}"), answer_reopened, invite_accepted/declined (byMe),
  meeting_scheduled ("Meeting booked: Table 2 · 10:10"), mutual_next_step. NOT shortlist_removed (silently becomes "Sent" again).
- organiser: none (totals only elsewhere).
Text must contain no identity the viewer may not see. `href`: company → `/company/card/{cardId}?r={responseId}`,
talent → `/talent/answers/{responseId}`.

## Closures (close the loop)
- POST `/api/closures` `{cardId, responseIds: string[], reason?}` (company, own card). Skips responses that have a shortlist
  row or are already closed. Logs answer_closed per response. Returns `{closed: n}`.
- DELETE `/api/closures/[id]` reopens (company, own card) → logs answer_reopened.
- Closed answers cannot be shortlisted (POST /api/shortlists → 409 "Reopen this answer first") and cannot be edited by the
  talent (409); the talent CAN still withdraw.
- GET `/api/cards/[id]/responses` adds `closed?: { id: string; reason?: string }` to each BlindResponse.
- Stats: `getStats(db).replies = { answers, shortlisted, closed, open, replyRate }` (replyRate = (shortlisted+closed)/answers).

## Match thread
`lib/thread.ts`: `buildThread(db, account, responseId) → ThreadView | null` (null if the viewer has no right to it).
```ts
interface ThreadView {
  responseId: string; publicCode: string; card: { id; title; companyName };
  stage: "sent" | "shortlisted" | "accepted" | "declined" | "closed" | "booked" | "withdrawn";
  steps: { key: string; label: string; state: "done" | "current" | "todo" | "skipped"; at?: string }[]; // Sent → Shortlisted → Accepted → Meeting booked → Follow-up
  privacy: { label: string; hiddenFrom: "company" | "talent"; unlocked: boolean; unlockHint: string }[];
     // e.g. {label:"Your name", hiddenFrom:"company", unlocked:false, unlockHint:"Shared only if you accept an invite"}
  events: ActivityView[]; // oldest first, for this response only
  message?: string; closedReason?: string; meeting?: { table: number; start: string };
  counterpartName?: string; // company: talent displayName only when accepted; talent: company name always
}
```
GET `/api/thread/[responseId]` returns the viewer's ThreadView. `components/thread/match-thread.tsx` exports
`<MatchThread responseId />` (client: fetches, renders steps + privacy lock chips + event list, polls every 5s).

## Notifications
GET `/api/notifications` → `{ unseen: number; items: ActivityView[] }` (latest 20, not byMe). POST `/api/notifications/seen`
sets account.notificationsSeenAt = now. Bell in the shell polls every 5s; when `unseen` grows it shows a toast for the new
item(s) and calls `router.refresh()` so the visible screen updates live.

## Language needs
Problem cards split languages: `languagesNeeded` (needed for the work) ⊆ `languages`; others are "nice to have".
Intake Q5 asks which languages are realistic AND which are truly needed for the work; the AI/fallback fills both; the
editor lets the human set each language to Needed / Nice to have; ProblemCardView shows "Needed for the work" vs
"Nice to have" (text labels, not colour alone). If Finnish is marked needed, the editor shows a gentle human-facing hint
"Is Finnish needed for the work itself, or for the team's social life? Many teams start in English." — dismissible, never automatic.

---

# v5: Goals, no ghosting, changes on either side, meeting beyond the event day

Principle: **intent drives your own workflow, never decisions about other people.** Goals and deadlines are
promises people make; nothing is ranked, filtered, rejected or closed automatically. Expired invites can be re-opened.

Core (already written, do not rewrite; import from them):
- `lib/types.ts`: `MeetMode`, `MEET_MODE_LABEL`, `HiringGoal`, `CardState`, `PAUSE_REASONS`, `FILLED_REASONS`, `TalentGoal`
  (PRIVATE), `Availability`, `MEETING_CHANGE_REASONS`, new fields on Company (`office`), ProblemCard (`goal`, `state`,
  `stateReason`, `stateAt`), Talent (`goal`), Response (`steppedBack`), Shortlist (`createdAt`, `respondBy`), Meeting
  (`mode`, `status`, `durationMin`, `place`, `lastChange`), `db.availability`, new ActivityKinds, actor `"system"`.
- `lib/deadlines.ts`: `goalOf`, `defaultGoal`, `GOAL_LIMITS`, `isOpen`, `cardState`, `replyStatus`, `inviteStatus`,
  `inviteRespondBy`, `companyRecord` (+`MIN_RECORD`), `goalProgress`, `decideByDays`, `addDays`.
- `lib/next-steps.ts`: `nextSteps(db, account, now) → { waitingOnYou, waitingOnThem }` (privacy-safe), `shortDate`.
- `lib/slots.ts`: `slotOptions(db, meetingId, now)`, `isOptionFree`, `placeFor`, `meetingMode`, `meetingStatus`,
  `meetingEnd`, `localNow`, `addMinutesLocal`, `OFF_EVENT_MINUTES`.
- `lib/sweep.ts`: `sweepDeadlines` (already called from GET /api/notifications).
- `lib/activity.ts`: texts for all new kinds, `formatLocalSlot(local)`. `lib/thread.ts`: ThreadView now has `goal`,
  `reply`, `invite?`, `cardState?`, `steppedBack?`, `companyRecord?` (talent only), and `meeting?` {id, mode, status,
  start?, end?, table?, place?, lastChange?}.
- `lib/schedule.ts` only places booked event-day meetings.
Always pass `Date.now()` as `now` from routes/pages. Log activity inside `mutate()` with `logActivity`.
Local meeting times are wall-clock Helsinki strings "YYYY-MM-DDTHH:MM:00": format with `formatLocalSlot`, never `new Date(local)`.

## Step 0: Goals + Next steps
- Company goal per problem (public promise): `decideBy`, `replyWithinDays` (1–14), `inviteDays` (1–7), `meetModes` (≥1).
  - Intake: the card editor gets a "Your goal for this problem" section before Publish (defaults from `defaultGoal`).
    POST /api/cards accepts optional `goal` (validated; invalid → 400).
  - PATCH `/api/cards/[id]/goal` (company, own card) with a full or partial HiringGoal; validate; returns the card.
  - Company card page header shows the goal ("Deciding by 12 Dec · Replying within 7 days · Office, video, event day")
    and an "Edit goal" dialog.
- Talent goal (PRIVATE): PATCH `/api/profile` accepts `goal: {status, availableFrom?, meetModes} | null`. It is never
  included in any company-facing payload. UI copy: "Only you see this. Companies never see it, and it never changes who
  sees your answers."
- GET `/api/next-steps` → `nextSteps(db, viewer, Date.now())` (organiser → both lists empty).
- Talent **Home** `/talent/home` (new first nav item "Home", icon "House"; `roleHome` for talent → `/talent/home`):
  goal card (id="goal"), "Waiting on you", "Waiting on them" (each item: text, due date, an "Overdue" text badge when
  overdue, link). Empty states. Mobile-first.
- Company home `/company`: "Waiting on you" / "Waiting on them" panel above the table; table gains "Decide by" and
  "Replies" (e.g. "3/7 · 1 overdue") columns from `goalProgress`.
- Explore cards and the card detail show the promise: "Replies within 7 days", "Deciding by 12 Dec", ways to meet, and
  the company record: rate !== null → "On time for 93% of answers (14)"; else "New on Pulma, no record yet".
  Explore lists only `isOpen` cards.

## Step 1: No ghosting
- GET `/api/cards/[id]/responses` adds `replyDue`, `shortlist.respondBy`, `shortlist.expired`, `steppedBack` (see BlindResponse).
- POST `/api/shortlists` sets `createdAt = now`, `respondBy = now + inviteDays`.
- POST `/api/shortlists/[id]/reinvite` (company, own): only when status "invited" and expired → `respondBy = now + inviteDays`,
  log `reinvited`; else 409.
- POST `/api/shortlists/[id]/respond`: 409 "This invite has expired" when expired.
- Triage: each list item and the reader show the reply promise as text: "Reply by 17 Nov" / "Overdue · 2 days" (icon +
  text, not colour alone). Shortlisted+expired shows "Invite expired" with a **Re-invite** button.
- Talent inbox: "Reply by 17 Nov" on each invite; expired invites read "This invite expired on 16 Nov" with no Accept.
- Talent answers list + thread: promise state ("Kiertovolt promised a reply by 17 Nov" / "…is 2 days past its reply date.
  You can keep waiting or withdraw.").
- MatchThread renders the new ThreadView fields (promise, invite deadline, card state banner, stepped back, meeting
  mode/place/status).
- Organiser overview: "Promises kept" panel: every company in ALPHABETICAL order (never sorted by score) with on-time
  rate (or "Not enough answers yet"), answers counted, overdue now; plus problems past their decide-by date.

## Step 2: Changes on either side
- PATCH `/api/cards/[id]/state` `{state, reason?}` (company, own). paused → reason ∈ PAUSE_REASONS, filled → reason ∈
  FILLED_REASONS (else 400), open → reason cleared. Sets `stateAt`. Logs ONE card-level row (no responseId) plus one row
  per response on the card (with responseId/talentId) of kind card_paused / card_filled / card_reopened.
- Paused/filled cards: POST /api/responses → 409 "This problem isn't taking new answers right now"; POST /api/shortlists
  → 409. Talent card/answer pages show a banner ("Kiertovolt paused this problem: Budget is on hold") and no form.
- Company card page: "Problem status" control (Open / Pause… / Mark as filled…) with a reason dialog that says
  "Everyone who answered will be told: '<reason>'".
- POST `/api/responses/[id]/step-back` `{until?: "YYYY-MM-DD"}` (talent, own): sets `steppedBack {at: now, until}`;
  invited shortlist → "declined"; pending/booked meeting → status "cancelled", slotStart "", table 0, then applySchedule;
  logs `stepped_back`. DELETE same path undoes it (only `steppedBack` is cleared). The reason is NEVER sent or stored.
- POST /api/shortlists on a stepped-back answer → 409 "This person has stepped back".
- Talent Home: "My situation changed" card: "I took another role" (step back from all active answers),
  "I'm not available for a while" + date (step back all, with `until`), "I need to move a meeting" (links to
  meetings). Shows exactly what each company will see: "#A7 stepped back" (+ "available again from …").
- Company triage shows "Stepped back · available from 12 Jan" on such answers.

## Step 3: Meeting beyond the event day
- Availability (company): GET/POST `/api/availability` `{mode: "office"|"video", date, from, to}` (future, from<to,
  30-minute multiples, ≤10 h); DELETE `/api/availability/[id]` (own).
- Accept (POST /api/shortlists/[id]/respond accept): if the card's goal meetModes is exactly ["event"] → as before
  (mode "event", booked, applySchedule). Otherwise create the meeting with `status: "pending"` and return
  `{ status: "accepted", needsSlot: true, meetingId }`; the client sends the talent to their answer thread to pick.
- GET `/api/meetings/[id]/options` (talent who owns it) → `slotOptions(...)`.
- POST `/api/meetings/[id]/book` `{mode, start?, reason?}` (talent, own): allowed when pending, reschedule or booked
  (booked = the talent moves it: `reason` ∈ MEETING_CHANGE_REASONS required). Check `isOptionFree` (409 "That time was
  just taken"). Event → mode event, slotStart "", status booked, applySchedule. Office/video → slotStart=start,
  durationMin=30, table 0, place=placeFor(...). Log meeting_scheduled (first booking) or meeting_rescheduled.
- POST `/api/meetings/[id]/reschedule` `{reason}` (company, own card): status "reschedule", clear slot, lastChange
  {by:"company"}, applySchedule, log reschedule_requested.
- POST `/api/meetings/[id]/cancel` `{reason}` (either party): status "cancelled", clear slot, lastChange, applySchedule,
  log meeting_cancelled.
- GET `/api/meetings/[id]/ics` (either party, booked with a start) → `text/calendar` download, TZID Europe/Helsinki.
- Talent thread: "Pick a time" (options grouped by mode; modes in the talent's own goal listed first — that only orders
  the talent's own options). Booked: mode, time, place or link, "Add to calendar", "Move meeting" (reason + pick),
  "Cancel" (reason). Company reader: same booked details + "Ask to move" + "Cancel".
- `/company/meetings` (nav "Meetings", icon "CalendarClock"): availability windows editor + upcoming meetings (all modes).
- `/talent/meetings` (nav "Meetings" replaces "My day"): all meetings by date; event-day ones link to `/event`.

---
# v6 — Espoo events first (Steps A–D)
Scope: Pulma focuses on recruitment events organised by the City of Espoo (fictional demo events). Office/video
meetings stay as they are. All seed data stays fictional: fictional venues marked "(demo venue)".

## Step A: Several events, each problem belongs to one
Types (lib/types.ts):
- `Event` gains `venue: string` (e.g. "Otaniemi Hall A (demo venue)"), `address?: string`, `focus?: string` (one line,
  e.g. "Software, games, data and robotics"), `createdAt?: string`.
- `DB.event` is REMOVED and replaced by `DB.events: Event[]`.
- `ProblemCard.eventId?: string` — missing means `defaultEvent(db)`.
- `Slot` (lib/schedule.ts) gains `eventId`.
lib/events.ts (new, pure, no Next imports):
- `eventById(db, id)`, `defaultEvent(db)` (earliest by date, ties by id), `eventOf(db, card)`,
  `eventOfMeeting(db, meeting)` (via its card), `upcomingEvents(db, now)` (date ≥ Helsinki today, sorted by date),
  `eventLabel(ev)` → "Espoo Tech Talent Day · Sat 5 Dec · Otaniemi Hall A (demo venue)".
Replace every `db.event` use:
- deadlines `defaultGoal(db, ev?)` → decideBy = that event's date; `goalOf(card, db)` passes `eventOf(db, card)`.
- slots: `meetingEnd` and the event option in `slotOptions` use the meeting's/card's event.
- next-steps `eventAhead`: the card's event.
- stats: `daysBeforeEvent` uses the card's event; `buildStats(db, eventId?)` (or the existing entry point) can be
  limited to one event's cards.
- schedule: `buildSchedule(db, eventId)` schedules only booked event-day meetings whose card belongs to that event,
  with that event's times/tables. Company table = (index among companies that have a card in that event) % tables + 1.
  `applySchedule` (store) runs it for every event. Same greedy, deterministic rules as before.
- respond/book routes: `durationMin` from the card's event. ics: location "Table N, <event name>, <venue>".
Store: re-seed when `!Array.isArray(db.events)`.
API: GET `/api/events` (anyone signed in) → events sorted by date. POST `/api/events` (organiser only)
`{name, date, startTime, endTime, tables, venue, focus?}`: name 3–80 chars, date today or later, start<end, times on
10-minute marks, tables 1–30, slotMinutes fixed 10. Log nothing about people.
Cards: POST `/api/cards` takes `eventId` (must exist and be upcoming; default `defaultEvent`); the card editor/intake
gets a required "Which event?" select of upcoming events (label via eventLabel). Company can change it while the card
has no booked event meetings.
Pages:
- Organiser `/organiser`: event picker (`?event=`, default = next upcoming, else defaultEvent); subtitle, needs
  timeline and counts are for that event. New page `/organiser/events` (nav item "Events", icon "CalendarDays" —
  add the icon to nav-link's map if missing): list of events (name, date, hours, venue, tables, #problems, #meetings)
  + "New event" form.
- `/event`: event picker. Organiser sees all events; company/talent see only events they have problems/meetings in
  (fallback: next upcoming). Timetable + "your day" per chosen event.
- Explore (`/talent`): an "Event" filter chip group (`?event=`), and each card + card detail shows the event label.
- Company home: each problem row shows its event name + date. Intake as above.
- Invite (inbox), meeting panel, my-day, talent meetings: event-day meetings say "Table N at <event name>, <weekday
  date>, <venue>" instead of only "Table N".
Seed: `events` = [
  ev-1 "Espoo Tech Talent Day", 2026-12-05 10:00–14:00, 6 tables, "Otaniemi Hall A (demo venue)", focus "Software, games, data and robotics";
  ev-2 "Espoo Green Transition Jobs Morning", 2026-12-10 09:00–12:00, 4 tables, "Keilaniemi Pavilion (demo venue)", focus "Clean-tech, logistics and health tech";
  ev-3 "Espoo International Talent Evening", 2027-01-21 16:00–19:00, 4 tables, "Espoo Centre Library Hall (demo venue)", focus "Any field; English-friendly teams" (no problems yet) ].
  card-cleantech, card-logistics, card-medtech → ev-2; all other cards → ev-1. card-medtech goal decideBy → 2026-12-12.
Tests: fixtures use `events: [...]`; add tests for defaultEvent/eventOf, buildSchedule per event (two events, the same
company gets tables in both without clashing) and slotOptions using the card's event.

## Step B: Skills from the CV — for the candidate only
Purpose: help a candidate find problems that use their skills and answer them well. Skills are PRIVATE to the
candidate: they never appear in any company or organiser API/page, never change what a company sees, never change the
random order of answers. EU AI Act: no AI ranking of jobs for people — matching is a deterministic, visible tag overlap
the candidate can switch on; every problem stays listed.
Types:
- `TalentSkill { label: string /* ≤60 chars, phrased as work */; source: "cv" | "self"; addedAt: string }`
- `Talent.skills?: TalentSkill[]` (max 15, unique case-insensitively).
- `ProblemCard.skills?: string[]` — 3–6 short work tags on each problem (e.g. "Messy sensor data", "Python",
  "Explaining results to non-experts"). Generated with the card by the intake LLM (add to CARD_SYSTEM output + the
  canned fallback), editable in the card editor, shown on the problem card as "Work involved". Seed: tags on all cards.
lib/skills.ts (new, pure): `normaliseSkill`, `skillMatches(talentSkills, cardSkills) → string[]` (the card tags that
  match; match = case-insensitive equality, or they share a meaningful word ≥4 letters after dropping a small stopword
  list; deterministic, no AI), `FALLBACK_VOCAB` (≈60 work skills) + `fallbackExtract(text) → string[]` (vocab terms
  found in the text, max 12).
API (talent only):
- POST `/api/skills/extract` `{text}` (≤15 000 chars) → `{ suggestions: string[], fallback: boolean }`. Calls
  `extractSkills` in lib/ai.ts (prompt `SKILLS_SYSTEM` in lib/prompts.ts: max 12 skills phrased as work the person has
  done; NEVER employers, schools, degrees, years, job titles, nationality, age or other personal details); on no key /
  error → `fallbackExtract`. The CV text is NOT stored, NOT logged, NOT written to activity. Suggestions already in the
  talent's skills are left out.
- PUT `/api/skills` `{skills: {label, source}[]}` → replaces the list (validated, max 15). 
Pages:
- `/profile` (talent): section `id="skills"` "Your skills — only you see these". Paste CV text (textarea) or choose a
  .txt/.md file (read in the browser) → "Suggest skills" → suggestions as chips, each with Add / Dismiss, plus
  "Add all" (still a human choice). Own skill input. Current skills listed with Remove. Note under the textarea:
  "Your CV is used once to suggest skills. It is not saved, and companies never see it or your skills."
  Accepted CV suggestions get source "cv"; typed ones "self". Show no AI label on skills (they are the person's
  choices), but say "Suggested by AI from your CV — you choose which to keep" above the suggestion chips.
- Explore (`/talent`): when the talent has skills, each card shows "Uses your skills: X, Y" (only matched tags), and a
  sort toggle "Newest | Uses my skills" (`?sort=skills`, default newest; ties keep newest order). Nothing is hidden.
  Without skills: a small link "Add your skills to see which problems use them" → /profile#skills.
- Card detail / respond page: if matches, a quiet box beside the answer form: "Your related skills: …. Use them as a
  starting point and write in your own words." 
- Talent next steps: if no skills, waitingOnYou gets "Add your skills so Explore can show which problems use them"
  (href /profile#skills), placed last.
Seed: skills on Olena (cv: "Battery data analysis", "Python", "Cleaning messy sensor data", "Technical translation
Ukrainian–English") and Yuki (a few). Tests: skillMatches, fallbackExtract, and that GET /api/cards/[id]/responses and
buildThread for a company never contain a talent's skills.

## Step C: Event-day identity card (after mutual opt-in only)
Purpose: at the event both sides can confirm they are at the right table with the right person/company.
- Exists only for a meeting that is `mode` event, `status` booked, with a scheduled slot (table + slotStart), i.e.
  after the company shortlisted AND the candidate accepted (names already revealed). Nothing before that.
- `Meeting.cardSkills?: string[]` — up to 3 of the candidate's own skills they choose to show (default none).
- `meetCode(meeting)` (lib/meet-card.ts, pure): stable 6-char code from the meeting id (A–Z without I/O, 2–9),
  shown as "PUL-XXXXXX". Both sides see the same code.
- Page `/meet/[meetingId]` (company of the card, the candidate, or organiser; others 404): a big index-card style
  card: event name, weekday date, venue, table number, slot time, problem title, company name, the company contact's
  first name, the candidate's first name, chosen skills (if any), the code, and a QR code of the absolute URL of this
  page (use the `qrcode` npm package, render SVG server-side; no external services). Validity: "Valid on <date>";
  after the event date it shows "This card has expired" and hides the QR. Candidate sees a small form "Show up to 3 of
  your skills on this card" (checkboxes from their skills) → PATCH `/api/meetings/[id]/card` `{skills}` (talent own,
  each must be one of their skills). Print-friendly (print CSS hides the shell).
- Links: "Your event card" in the talent's match thread meeting panel, my-day and talent meetings; "Event card" in the
  company reader meeting panel and company my-day. 
- Privacy: no email, no surname, no other data. Expires with the event.

---
# v7 — Events run by the organiser (Step E)
Decisions (user, 14 Nov): the organiser invites companies to an event; companies accept or decline; up to
3 problems per company per event; candidates do not register for events (later: organisers add candidates
through a separate onboarding flow — NOT in this step). Existing seed companies become confirmed for the
events their problems are in, with their current tables.

## Types (lib/types.ts)
- `EventStage = "draft" | "open" | "locked" | "done"`. `Event` gains `stage: EventStage`,
  `problemDeadline: string` ("YYYY-MM-DD"), `description?: string` (≤400 chars).
  - draft: only the organiser sees it. open: invited companies see it, confirmed companies publish problems,
    candidates see its problems and answer. locked (the organiser locks it, e.g. the day before): no new
    problems, answers, invites or table changes; the schedule is final. done: after the event (the organiser
    marks it, or it is shown as done once its date has passed).
- `Participation { id; eventId; companyId; status: "invited" | "confirmed" | "declined" | "withdrawn";
  table?: number; invitedAt: string; respondedAt?: string; note?: string /* organiser's message, ≤300 */ }`
- `DB.participations: Participation[]`. `MAX_PROBLEMS_PER_EVENT = 3`.
- Store `isCurrentShape` also requires `participations` to be an array.

## lib/participation.ts (new, pure)
- `participationOf(db, eventId, companyId)`, `confirmedEvents(db, companyId)`, `eventStage(ev, now)`
  (returns "done" when the date has passed even if the stored stage is earlier).
- `canPublishTo(db, companyId, eventId, now) → { ok: true } | { ok: false; reason: string }` — confirmed,
  stage open, today ≤ problemDeadline, fewer than 3 published problems from this company in this event.
  Reasons are short, human sentences ("The problem deadline for this event has passed.").
- `freeTable(db, eventId)` = lowest table number 1..tables not held by a confirmed participation.
  `seatsLeft(db, eventId)` = tables − (confirmed + invited). Inviting beyond seatsLeft is refused ("Full").
- Schedule (lib/schedule.ts): a company's table in an event = its confirmed participation's `table`; fall back
  to the old index rule only when no participation exists.

## API
- POST `/api/events` (organiser): as now, plus `problemDeadline` (default date − 14 days, must be ≤ date) and
  `description`; new events start as **draft**.
- PATCH `/api/events/[id]` (organiser): `{stage?, problemDeadline?, description?}`. Allowed stage moves:
  draft→open, open→locked, locked→open (unlock), locked→done, open→done only after the date.
- POST `/api/events/[id]/invites` (organiser) `{companyIds: string[], note?: string}`: creates `invited`
  participations (skip companies already invited/confirmed), refuse when seatsLeft would go below 0, only for
  draft/open events. Log activity kind `event_invited` (company sees "The event team invited you to <event>").
- POST `/api/participations/[id]/respond` (company, own) `{accept: boolean}`: accept → `confirmed` with
  `table = freeTable` (409 "This event is full" if none); decline → `declined`. Log `event_joined` /
  `event_declined` (organiser-side rows; the organiser has no bell, they show on the event page).
- PATCH `/api/participations/[id]` (organiser) `{table}`: 1..tables, unique among confirmed in that event,
  not when locked/done; re-run applySchedule.
- POST `/api/participations/[id]/withdraw` (company or organiser): only while the company has no booked
  event-day meetings in that event; its problems in that event become `state: "paused"` with reason "The
  company is no longer taking part in this event" (reuse card_paused so everyone who answered is told).
- POST `/api/cards` and PATCH `/api/cards/[id]/event`: enforce `canPublishTo` (400 with the reason).
- Answers (POST /api/responses) and invites (shortlists) are refused when the card's event is locked/done
  ("Answers for this event have closed.").

## Pages
Organiser
- `/organiser/events`: event list with a stage badge (word + icon), date, venue, problem deadline,
  "4 of 6 tables taken", problems count; "New event" creates a draft.
- `/organiser/events/[id]` (new) with tabs via `?tab=` (real links, aria-current): 
  - **Overview**: stage panel with the one next action and a plain explanation ("Open the event: invited
    companies can publish problems and candidates can see them"), problem deadline (editable), description,
    counts, the needs timeline for this event.
  - **Employers**: participations table (company, status badge, table select for confirmed, invited date,
    remove/withdraw); "Invite companies" dialog: checkbox list of companies not yet invited (name, sector),
    optional note, shows seats left.
  - **Problems**: this event's problems (title, company, published date, answers count, state). No people.
  - **Schedule**: link to `/event?event=<id>`.
- Draft events never appear to companies or candidates.
Employer
- Nav item "Events" (icon CalendarDays) → `/company/events`: **Invitations** (event details, organiser note,
  Accept / Decline), **Your events** (stage, date, venue, table, problem deadline, "2 of 3 problems",
  "Publish a problem" → `/company/intake?event=<id>` when canPublishTo ok, otherwise the reason), **Past**.
- Intake: the event is chosen FIRST. With `?event=` (and allowed) show it fixed at the top ("For: <event
  label> · Table N"); otherwise the first step lists events where canPublishTo is ok; if none, an empty state
  linking to Events ("You can publish a problem once you have accepted an event invitation."). Remove the old
  "Which event?" select at the end.
- Company home (Problems): grouped under one heading per event (event label, table, stage, deadline).
- "Change event" dialog: only events where canPublishTo is ok.
Candidate
- Explore and card pages only show problems of open/locked events; on locked events the answer button is
  replaced by "Answers for this event have closed."
Seed
- ev-1, ev-2 stage open, ev-3 stage open with no problems; problemDeadline = date − 14 days (ev-1: 2026-11-21,
  ev-2: 2026-11-26, ev-3: 2027-01-07). Confirmed participations for every company with problems in ev-1/ev-2,
  table = the table it has today. Plus ONE pending invitation: Kiertovolt (co-cleantech) invited to ev-3 with
  note "We'd love a clean-tech problem at the International Talent Evening." (demo: accept, then publish).
Tests: canPublishTo (each reason), freeTable/seatsLeft, schedule uses participation tables, draft events
hidden from candidates' card list helper, respond/accept assigns a table.

---
# v8 — Calmer Explore for candidates (`/talent`)
Goal: less to process. One glance should tell a candidate which problems are new to them, which they answered,
which need action, and which are parked or closed. Mobile-first (375px), 44px targets, keyboard, no colour alone.

## Status per problem (lib/candidate-status.ts, pure)
`candidateStatus(db, talentId, cardId, now) → { kind, label, detail? }`, first match wins:
1. `invited`  — shortlist "invited" and not expired → label "Invited", detail "Reply by 17 Nov" (action needed)
2. `meeting`  — shortlist "accepted" → "Meeting booked" (detail: slot/day if booked, else "Pick a time")
3. `stepped_back` — the talent's answer has `steppedBack` → "Stepped back" (detail "until 12 Jan" if any)
4. `closed`   — closure on the answer, invite declined/expired, or card not open → "Not this time"
5. `answered` — the talent has an answer → "Answered", detail "Reply by <reply due>" (or "Overdue" if past)
6. `saved`    — card id in `Talent.saved` → "Saved"
7. `new`      — none of the above (no badge)
Visual treatment (tokens only; each also has an icon + word):
- invited: primary left rule (4px) + filled primary badge "Invited · Reply by …" — the only loud one.
- meeting: primary outline badge with CalendarCheck.
- answered: accent badge with CheckCircle2; tile otherwise normal.
- saved: Bookmark icon badge (accent).
- stepped_back: muted badge with PauseCircle; tile at reduced emphasis (muted text, no shadow).
- closed: muted badge with XCircle; tile at reduced emphasis.
- new: no badge.

## Saved for later (candidate-private)
- `Talent.saved?: string[]` (card ids, max 50). PUT `/api/saved` `{cardId, saved: boolean}` (talent only, card
  must exist). Never shown to companies or organisers.
- A Bookmark toggle button on every tile (grid and list) and on the card detail page: aria-pressed,
  aria-label "Save for later" / "Remove from saved". Tiles must not nest interactive elements inside a link:
  use an `<article>` with the title as the link (stretched-link pattern via `after:absolute after:inset-0`) and
  the bookmark button above it (`relative z-10`).

## Layout: grid or list
- `?view=list` | default grid. A two-button segmented control (LayoutGrid / List icons, text labels visible on
  ≥sm, sr-only on phones, aria-pressed). Keep other params when switching.
- Grid tile (trimmed): status badge (if any) + bookmark; company · sector (one line); title; context (2 lines);
  one meta line: event short label "Tech Talent Day · Sat 5 Dec"; chips: needed languages only + format;
  "Uses your skills: …" only when there are matches; "Help for international hires" as ONE small chip
  ("International support") with the full list in `title` + sr-only text. Remove the 4-line promise block from
  tiles; keep one line "Replies within N days" only. (The full promise and record stay on the card page.)
- List row: one line on desktop / two lines on phones: title (link), company, event day, status badge,
  bookmark. No context, no chips.

## Filters (replace the four chip rows)
- Always visible, one row: a **status** segmented filter `?show=` — All · To answer (status new or saved) ·
  Answered (answered, invited, meeting) · Saved — plus a "Filters" button with a count of active filters, the
  sort select and the layout toggle.
- "Filters" opens a panel (Dialog on phones as a bottom sheet is fine; a popover/sheet on desktop) with
  groups: Event, Sector, Language, Format, and checkboxes "International support" (`?intl=1`) and
  "Uses my skills" (`?skills=1`, only when the talent has skills). Radio-style per group (one value, as now),
  "Clear all", "Show N problems". Applying writes URL params (`router.replace`, scroll false).
- Active filters show as removable chips under the bar ("Clean-tech ✕"), so state is visible without opening.
- Sort: a small select "Newest" | "Uses my skills" (only with skills) — replaces the sort chip row.
- Counts: "7 problems" (one short line). Empty state: "No problems match." + "Clear filters".

## Remove explainer text that adds no value
- PageTitle subtitle → none (title "Explore" only).
- Remove "Only you see this. Every problem stays listed." (move that sentence into the Filters panel next to
  "Uses my skills", where it explains the control).
- Remove the always-on "Add your skills…" link; instead the Filters panel shows it when the talent has no skills.
- Keep sr-only labels where needed.

## Tests
- candidateStatus: each kind and its priority (invited beats answered; closed beats answered; saved only
  when unanswered). Saved list never appears in company-facing payloads (blind responses / company thread).

---
# v9 — After the event: next-step promises, outcomes, the report, and ESCO skills
Principle stays: intent drives your own workflow, never decisions about other people. Outcomes are recorded by
people, never inferred. Organisers see anonymous counts only. All seed data fictional.

## Step F1: Next-step promises and outcomes (company ↔ candidate, after the meeting)
Types:
- `NextStepKind = "interview" | "trial" | "offer" | "other"`; labels "Interview", "Trial day", "Offer", "Next step".
- `Meeting.nextStep?: { kind: NextStepKind; by: string /* YYYY-MM-DD */; note?: string /* ≤200 */; plannedAt: string; updatedAt?: string }`
- `OUTCOME_REASONS = ["We filled it another way", "Our needs changed", "Not the right fit for this role"] as const`
- `Meeting.outcome?: { kind: "hired" | "still_talking" | "not_this_time" | "talent_withdrew"; at: string; reason?: OutcomeReason }`
- ActivityKinds: `next_step_planned`, `next_step_overdue` (system, once per plan), `outcome_recorded`.
Rules (lib/follow-up.ts, pure):
- A meeting is eligible once BOTH sides chose "next-step" in Feedback (the existing "mutual" condition).
- `nextStepStatus(meeting, now)` → none | planned (daysLeft) | overdue (daysOver) | done (outcome recorded,
  except still_talking which needs a new `by`). Overdue = Helsinki today > `by` and no final outcome.
API:
- POST `/api/meetings/[id]/next-step` (company, own card, mutual only) `{kind, by, note?}`: by = 1–30 days from
  today; re-planning allowed (updates `updatedAt`). Log next_step_planned (candidate told).
- POST `/api/meetings/[id]/outcome` (company) `{kind: "hired"|"still_talking"|"not_this_time", reason?, by?}`:
  not_this_time requires a reason from OUTCOME_REASONS; still_talking requires a new `by` (1–30 days) and keeps
  the plan open. Talent (own meeting) may post `{kind: "talent_withdrew"}` ("I've taken another job").
  Log outcome_recorded (other side told). No free text is sent with an outcome.
- Sweep: log next_step_overdue once per plan when overdue (actor "system"), told to both sides.
UI:
- Match thread (both viewers) after mutual next step: a "Next step" section.
  - Company, no plan: "Plan the next step" (dialog: kind radio, date input with min/max, optional note).
  - Planned: "Interview by Fri 20 Dec" (+ note); company sees "Record how it went" (Hired / Still talking → new
    date / Not this time → reason) and "Change plan"; candidate sees "<Company> will contact you about an
    interview by Fri 20 Dec" and "I've taken another job".
  - Overdue: wording like reply promises ("<Company> is 2 days past its next-step date").
  - Outcome: one line ("Hired" / "Not this time: Our needs changed" / "You took another job").
  - After "Hired" (company only): "You may be eligible for a pay subsidy or the Espoo supplement" linking to
    https://www.espoo.fi/en/business-espoo-helping-companies-thrive/financial-support-and-employment
- Next steps lists (lib/next-steps.ts): company "Plan the next step with <name>" (mutual, no plan),
  "Tell <name> how it went by <date>" (planned; overdue first); talent waitingOnThem "<Company>: interview by
  <date>" (overdue flagged). Names only where already revealed (they are, after acceptance).
- Company "Promises kept" record (lib/deadlines companyRecord) also counts next-step promises: kept = outcome or
  re-plan before `by`; late = recorded after `by`; overdue now counts as not kept. Keep MIN_RECORD rule.

## Step F2: Follow-up window and the organiser outcome report
Types:
- `Event.followUpDays?: number` (default 60). `Event.report?: OutcomeReport` (final snapshot) and
  `Event.closedAt?: string`.
- `OutcomeReport` = the anonymous figures below + `asOf` (ISO).
Rules (lib/outcomes.ts — this file already holds `exampleAnswer`; add to it):
- `eventOutcomes(db, eventId, now): OutcomeReport` — counts only, for that event's problems:
  funnel { problems, answers, shortlisted, accepted, meetingsHeld (booked event/office/video meetings whose start
  has passed), nextStepAgreed (mutual), nextStepPlanned by kind, hired, stillTalking, notThisTime,
  talentWithdrew }, promises { medianReplyDays (null under 5 replies), replyKeptPct, nextStepKeptPct (null
  under 5), overdueNow }, problemsWithoutNextStep: [{ cardId, title, companyName }] (problems, never people).
- Follow-up window: open from the event date for `followUpDays`. `followUpState(ev, now)` → "before" |
  "settling" (last updated now) | "final" (report snapshot exists).
- Closing (`closeFollowUp(db, eventId, now)`): store `report = eventOutcomes(...)`, `closedAt`, then DELETE that
  event's personal data: its responses, shortlists, meetings, feedback, closures, activity rows for those
  responses; problem cards stay (they describe companies), with no answers. Accounts/talents are NOT deleted
  (they may take part in other events). Runs when the window ends (in freshDB / notifications sweep like the
  deadline sweep) or when the organiser presses "Close follow-up now" (confirm dialog that says exactly what is
  deleted and that it can't be undone).
API: POST `/api/events/[id]/close-follow-up` (organiser). GET `/api/events/[id]/outcomes.csv` (organiser):
  the same anonymous figures as CSV (metric,value).
UI:
- Organiser event page: new tab **Outcomes** (`?tab=outcomes`): status line ("Still settling · last updated
  14 Nov · window closes 16 Dec" | "Final · closed 9 Feb"), the funnel as a horizontal bar list with count and
  % of the previous step (words, not colour, carry meaning), "At the event" (meetings held) vs "Since"
  (next steps, hires), the promises block, "Problems with no next step" (cue to talk with the company),
  "Download CSV", and while settling "Close follow-up now".
- Organiser Overview: a compact "After the event" summary for the most recent past event (hires, next steps,
  % promises kept) linking to its Outcomes tab.
- Candidate/company pages for a closed event's data simply no longer show it (it is deleted).
Seed:
- ev-0 "Espoo Autumn Talent Day", 2026-10-17 10:00–14:00, 6 tables, "Leppävaara Hall (demo venue)", stage done,
  followUpDays 60 (settling during the demo). 4 problems from existing companies (confirmed participations),
  ~16 answers, shortlists, ~8 held meetings, feedback with 5 mutual next steps, next-step plans (interview,
  trial, offer), outcomes: 2 hired, 1 still talking, 1 not this time, 1 planned & overdue. Keep it consistent
  with existing talents (reuse t-* ids; no new real-looking people).
- ev-old "Espoo Spring Talent Day", 2026-04-18, stage done, already closed: only `report` + `closedAt` (a final
  snapshot with plausible counts), no personal data.

## Step E1: ESCO skills (phase 1) and supply vs. demand (phase 2)
ESCO = European Skills, Competences, Qualifications and Occupations (public API, no key, CC-BY style reuse with
attribution "Skills data: ESCO, European Commission").
- lib/esco.ts (server): `suggestSkills(text, lang = "en")` → `[{ uri, label }]` via
  `https://ec.europa.eu/esco/api/suggest2?text=…&type=skill&language=…&limit=8`, 2.5s timeout, in-memory LRU
  cache; on error/timeout fall back to a bundled list `data/esco-skills.json` (≈150–250 real ESCO skills
  relevant to our sectors, each `{uri, label}` — generate it with a script `scripts/fetch-esco.mjs` that queries
  the API for our FALLBACK_VOCAB terms; commit the JSON; matching on the fallback = case-insensitive prefix/word
  match). Never throws (hard rule 7).
- GET `/api/esco/skills?q=&lang=` (signed in; q ≥ 2 chars) → suggestions.
- Types: `TalentSkill.esco?: { uri: string; label: string }`; `ProblemCard.skillRefs?: { label: string;
  esco?: { uri; label } }[]` alongside the existing `skills: string[]` (keep `skills` as the visible labels so
  nothing else breaks).
- UI: an accessible combobox (`components/esco-skill-input.tsx`: input + listbox, aria-activedescendant,
  arrow keys, Enter, Escape) used (a) in the candidate's profile skills ("Add a skill") and (b) in the card editor
  "Work involved". Picking an ESCO suggestion stores its uri + label; free text is still allowed (no esco).
  CV skill suggestions get their best ESCO match (first suggest2 hit) attached, still accepted per skill by the
  person. Show a small "ESCO" tag on linked skills with a title tooltip of the ESCO label; attribution line
  under the profile skills and in the card editor.
- Matching (lib/skills.ts `skillMatches`): match by ESCO uri first, then the existing word rule. Explore's "Uses
  your skills" unchanged otherwise.
- Phase 2 — organiser supply vs demand (Overview, per event picker): for each ESCO skill (or plain label when no
  uri), "Problems that need it" (count of this event's problems) vs "Candidates who list it" (count of talents
  with that skill — talents who answered any problem in this event, opt-in implicit by having skills; counts
  under 5 shown as "fewer than 5"). Top 10 by demand. Words + numbers, no colour-only meaning. Note: "Counts
  only. Skills are private to each candidate; no one is identified."
- Seed: give ESCO uris to existing seeded skills/tags where a real match exists (from the bundled JSON).
- Tests: suggestSkills fallback when fetch fails; uri-first matching; supply/demand suppression under 5; no
  talent skills leak to company payloads (existing tests stay green).

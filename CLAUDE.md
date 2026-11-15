# Pulma — problem-first matchmaking for City of Espoo recruitment events

Junction 2026 (13–15 Nov 2026, Espoo) · "Rethinking Recruitment" challenge by the City of Espoo.
Working name **Pulma** (Finnish for "puzzle / tricky problem"). Live demo: https://pulma-phi.vercel.app
This file is both the product brief (what exists, why, and which challenge it answers: usable for slides) and the
working instructions for anyone building on the code. CHALLENGE.md has the verbatim brief, JUDGING.md the
point-by-point analysis, DEMO.md the click-by-click demo sheet, DESIGN.md the visual language, CONTRACT.md the
technical contracts (v1–v9).

---

## 1. One-liner and closing line

**Companies bring a real problem, not a job ad. Candidates answer it in their own words, not with a CV.
Companies choose whom to meet without seeing names, and the event becomes booked 10-minute conversations.**

Closing line: *"We didn't build a smarter matching algorithm. We took the algorithm out and made the humans better
at choosing."*

---

## 2. The challenge we are solving

The City of Espoo runs recruitment and matchmaking events (in person, online, hybrid) between companies and
jobseekers. The brief asks for **more relevant, efficient and meaningful connections** at any stage: registering,
attending and following up, with **stronger signal and less noise**, and **without bias** by nationality,
language, education or career path.

The brief's nine insights (problems at today's events), in short:

| # | Problem today |
|---|---|
| 1 | Companies are hard to engage: they doubt the city's jobseeker pool, and a free public service sounds low quality. |
| 2 | Companies describe their needs unclearly, and too late (often the day before the event). |
| 3 | Organisers get many applications but can't see real capability against company needs, especially tech skills. |
| 4 | Companies get flooded with irrelevant approaches during the event. |
| 5 | Professionals struggle to describe their competencies and transferable skills. |
| 6 | CVs are written by AI and screened by AI: both sides match on synthetic representations. |
| 7 | Event platforms with matching algorithms feel cumbersome. |
| 8 | The platform crashes when everyone logs in at the start of the event. |
| 9 | International recruitment adds compliance, language, culture, relocation and onboarding complexity. |

Judges care about: better matching, discovery and communication; privacy; transparency; fairness and inclusion;
no automated decision-making about individuals; minimal personal data; EU AI Act awareness; synthetic data; open data
(ESCO, Work in Finland, Business Espoo are suggested sources).

---

## 3. Our answer, in five ideas

1. **Problem first, not job ad.** A company describes one concrete problem its team is stuck on: what the person
   would do in week one, what is genuinely hard, which languages the work really needs. Five questions, minutes,
   weeks before the event.
2. **Answer, not CV.** Candidates answer the problem in 3–5 sentences, in their own words. Transferable skills show
   up as *how someone would approach the work*. Generic AI text is easy to see through next to a specific problem.
3. **Blind first round, humans choose.** Companies see "Response #A7" and the text, nothing else, in random order.
   No AI ranks, scores or filters anyone. A company shortlists up to 5 per problem.
4. **Names only by mutual yes.** The company invites, the candidate accepts, then names are exchanged and a meeting
   is booked (event-day table, office visit or video call).
5. **The event is pre-agreed conversations.** Every meeting at the event was agreed by both sides beforehand:
   no cold queue at the booth, staggered arrival times, an event card that says you're at the right table. After
   the event, promises and outcomes are tracked, then personal data is deleted.

---

## 4. Hard rules (never break these)

1. **No ranking, scoring or filtering of people by AI.** AI never decides who is shown, hidden or shortlisted.
   Answers are shown to companies in random order.
2. **AI only helps people write things down.** It structures the company intake into a problem card, offers
   optional clarity edits to candidates, and suggests skills from a candidate's own CV. Every suggestion is accepted
   by a human; text edited with AI help carries a visible "AI-assisted wording" label. (Translation was removed on
   14 Nov 2026: many jobs have strict language requirements, so answers are written in one of the problem's working
   languages.)
3. **Blind first round.** Companies see a response code, the answer text and nothing else: no name, photo,
   nationality, age, school or CV.
4. **Identity only by mutual opt-in:** company shortlists → candidate accepts → names exchanged.
5. **Synthetic data only.** All people and companies are fictional. No real logos, including the City of Espoo's.
6. **Data minimisation.** Candidate account = display name + email (fake) + optional language. Skills and goals are
   private to the candidate. The CV is used once and never stored.
7. **The demo must never break:** every AI call and every external API (ESCO, Redis) has a fallback.
8. **The card describes the work, not the person.** Experience the work needs is fine (e.g. years of experience).
   Never demographic or discriminating requirements (age or proxies, gender, nationality, citizenship, ethnicity,
   "native speaker", religion, family status, health, photos); the AI gently suggests rephrasing them as the need.
9. **Aggregates for the organiser, with a floor.** Organiser views show counts, never individuals' answers or
   skills; any group under 5 reads "fewer than 5".

---

## 5. Three roles, one journey

Email-only accounts (no passwords in the demo). **One email = one account type, fixed forever** (Employer,
Candidate, Event team); to act in another role, use another email. The sign-in page lists one-click demo
accounts. Each role has its own app shell with a subtly different look (Espoo-inspired blue for all; role label
always written, never told by colour alone).

| Stage | Event team (organiser) | Employer (company) | Candidate (talent) |
|---|---|---|---|
| Before | Creates the event, invites companies, assigns tables, sets the problem deadline | Accepts the invitation, publishes up to 3 problems | Explores problems, answers in own words |
| Selection | Watches needs arrive and supply vs demand (counts only) | Reads blind answers, shortlists up to 5, closes the loop with a reason | Sees status of each answer, accepts or declines invites |
| Event day | Schedule built automatically, staggered arrivals | "My day" view, table, event card | "My day", arrival time, event card with QR |
| After | Outcomes report, follow-up window, then deletion | Plans next steps, records outcomes | Sees promises, can say "I've taken another job" |

### Navigation per role
- **Employer:** Problems · Events · New problem · Meetings · Event day
- **Candidate:** Home · Explore · My answers · Invites · Meetings
- **Event team:** Overview · Events · Schedule · Follow-ups

---

## 6. Features, why they exist, and which insight they answer

Insight numbers refer to the table in section 2.

### 6.1 Event team (organiser)

| Feature | What it does | Why / insight |
|---|---|---|
| **Events with stages** | Each event moves Draft → Open → Locked → Done. Drafts are invisible to others; Locked blocks new problems, answers, invites and table changes. One "next step" button guides the organiser. | Organiser stays in control of the event lifecycle (scope: register → attend → follow up). |
| **Invite companies** | Tick companies, add a personal message, send. Only while tables are free. Accepting gives the company a table. | The city decides who takes part; companies get a personal, low-effort way in (1). |
| **Problem deadline** | Default two weeks before the event, enforced when publishing. | Needs arrive early instead of the day before (2). |
| **Needs timeline** | Shows when each problem arrived versus the event date: "Problems arrived on average 27 days before the event · Typical: the day before". | Makes the "needs arrive early" story visible (2). |
| **Overview counts** | Problems, answers per problem, shortlists, meetings; sectors and languages in demand. | Organiser sees the event's health at a glance (3). |
| **Skills: supply and demand (ESCO)** | Per event: how many problems need a skill vs how many answering candidates list it, e.g. "Data analysis: 2 problems need it · 7 candidates list it". Under 5 reads "fewer than 5". | Organisers see capability against needs in tech skills without reading anyone's answers (3, open data). |
| **Promises kept** | Every company in alphabetical order (never sorted by score) with its on-time reply rate, answers counted, overdue now. | Accountability for companies, so candidates aren't ghosted. |
| **Follow-ups** | Answers that got no invite are listed as a cue to support that person, never as a ranking. | Nobody silently falls through (fairness). |
| **Schedule** | Auto-built 10-minute slots per company table from accepted meetings, no double booking, personal arrival times. | No crowd at the booth, no login stampede (4, 8). |
| **Outcomes report** | Per finished event: funnel problems → answers → shortlisted → accepted → meetings held → next step agreed → hired; "at the event" vs "since the event"; promises kept; problems with no next step. CSV download (counts only). | Follow-up stage of the journey; proves the event's value to the city and to companies (1). |
| **Follow-up window and deletion** | 60 days after the event, then an anonymous snapshot is kept and the event's personal data (answers, shortlists, meetings, next steps, feedback, activity) is deleted. "Close follow-up now" shows exactly what goes and what stays. | Data minimisation with a clear end date (GDPR, EU AI Act talking point). |
| **After the event summary** | Overview opens with hires, next steps planned, reply promises kept, next-step promises kept. | The outcome is the headline, not the activity. |
| **Reset demo data** | Re-seeds everything for everyone. | The demo must never break. |

### 6.2 Employer (company)

| Feature | What it does | Why / insight |
|---|---|---|
| **Invitation with reasons** | Each invitation says why to join a City of Espoo event: meet jobseekers and international professionals you won't find on job boards; free, with Business Espoo's recruitment specialists; possible help with hiring costs (pay subsidy, Espoo supplement). Links to espoo.fi pages; "What would we read?" shows one anonymous example answer. | Companies doubt the city's pool and a free service (1). |
| **Problem intake (chat)** | Five questions asked one at a time: the problem the team is stuck on, the first week, the hard part, bonuses, realistic languages. Chat-like pacing: your answer pops in, a short "typing" beat, then the next question. **Dictate** button (browser speech, English/Finnish) that keeps listening until Stop and never overwrites typing. | Needs described clearly, in minutes, early (2). Low effort for busy hiring managers (7). |
| **AI-structured problem card** | The AI turns the answers into a card (title, context, week-one reality, hard part, nice to have, languages). It describes the work, not the person, and suggests rephrasing any demographic ask. Canned fallback without an API key. The company edits everything before publishing. | AI as a writing aid only; steers away from bias (2, bias). |
| **Card editor** | Live preview as an index card. Languages split into *needed for the work* vs *nice to have* (gentle hint when Finnish is marked needed for non-customer work). **Work involved** tags linked to ESCO skills. **International support** ticks: work-permit help, relocation help, onboarding in English (shown as badges with a Work in Finland link). **Goal**: decide-by date, reply within N days, invite valid N days, ways to meet. | Honest language needs (9, bias); shared skill vocabulary (open data); public promises (no ghosting). |
| **Up to 3 problems per event** | Per event, until the problem deadline. | Focus: real problems, not a job board. |
| **Problems table** | Per event: status, decide-by date (amber within a week, red with "Date passed" once passed, always with words), replies kept, answers, new, open, shortlisted, accepted. "Waiting on you / Waiting on them" lists above. | Calm overview; the next action is obvious. |
| **Blind review (triage)** | Answers as "#A7" + text + AI-assisted label if used, in random order. Keyboard: j/k to move, s to shortlist. Shortlist up to 5 with an optional human-written "Why we'd like to talk" message; private notes; "Not this time" with an optional reason; close the remaining in one go. | Signal over noise; humans choose; no flood at the event (4, 6, bias). |
| **No ghosting** | Each answer shows "Reply by …" or "Overdue · 2 days". Invites expire after the promised days; **Re-invite** reopens them. Nothing is rejected automatically. | Candidates always hear back; companies keep their promise (fairness). |
| **Problem status** | Open / Pause… / Mark as filled…, with a reason that everyone who answered is told. | Changes are communicated, not silent. |
| **Meetings beyond the event day** | Availability windows for office visits and video calls; candidate picks a time; move or cancel with a reason; "Add to calendar" (.ics). | Real hiring doesn't fit only the event day. |
| **Next steps and outcomes** | After a meeting: plan the next step (interview / trial day / offer / other, by a date, optional note) and later record how it went (hired / still talking with a new date / not this time with a fixed reason). Overdue promises are flagged to both sides. "Hired" links to the pay-subsidy page. | Follow-up after the event (scope); counts toward the company's promise record. |

### 6.3 Candidate (talent)

| Feature | What it does | Why / insight |
|---|---|---|
| **Home** | Private goal (looking / open to offers, available from, ways to meet): set once, then a compact summary. "Waiting on you / Waiting on them" lists. "Took a role, or need a break?" lets the candidate step back from all answers (optionally until a date); companies see only "#A7 stepped back", the reason is never stored. | Calm, mobile-first start; the candidate controls their own situation (7, privacy). |
| **Explore** | Grid or list of open problems. Each tile shows its status in words and shape (Answered · "Reply expected by …" or "Company reply late", Invited, Meeting booked, Not this time, Stepped back; saved ones carry a filled bookmark). Filters (event, sector, language, format) in one dialog; Saved for later (bookmark, private). No hidden recommendations. | Discovery without an algorithm deciding what you see (7). |
| **Uses your skills** | Optional, visible tag match ("Uses your skills: Python, Data analysis") and an opt-in "Uses my skills" sort. Nothing is hidden; skills never reach companies. | Helps people find problems that fit, without filtering anyone out (5). |
| **Skills from the CV** | Paste a CV; the AI suggests skills phrased as work; the candidate adds or dismisses each. ESCO combobox for adding skills ("Python (computer programming)" with an ESCO tag, or own words). The CV is never stored. Offline fallback list. | Transferable skills in a shared EU vocabulary, candidate-only (5, open data, privacy). |
| **Problem detail** | The card as an index card, the company's public promises ("Replies within 7 days", "Deciding by 12 Dec", ways to meet) and its record ("On time for 93% of answers (14)" or "New, no record yet"). International support badges. | Trust and transparency about the company (1, 9). |
| **Answer** | A text box with a soft limit of ~600 characters ("3–5 sentences on how you'd approach this"). Privacy note listing exactly what the company will see. Optional **Make this clearer**: AI suggests edits as a diff the candidate accepts or rejects; then the answer carries "AI-assisted wording". Edit or withdraw until shortlisted. | Show capability in your own words instead of a CV (5, 6). |
| **My answers** | Each answer with a slim stepper (Sent → Shortlisted → Invited → Meeting booked) and a match thread: every event on that answer, the company's reply promise, what is still hidden and when it unlocks. | Transparency about where you stand; no black box (7). |
| **Invites** | The company's message, "Reply by …"; **Accept & share my name** reveals both identities and goes straight to **Pick a time** (event-day table, office visit or video call). Decline shares nothing. | Identity only by mutual opt-in (bias, privacy). |
| **Event card** | After a mutual yes, an event-day meeting gets a card at `/meet/<id>`: first names, company, problem, event, venue, table, time, a code (PUL-XXXXXX) and a QR. Candidate can show up to 3 of their skills on it. Printable; expires after the event. | Both sides know they're at the right table with the right person (attend). |
| **Meetings and "My day"** | All meetings by date; event-day ones show table and a personal arrival time. | Staggered arrivals, no rush at the door (4, 8). |
| **After the meeting** | Sees the company's promise ("Karavaani Freight will contact you about an interview by …"), flagged when past its date; **I've taken another job** closes it for both sides. | Follow-up; no ghosting after the event. |

### 6.4 Shared

- **Notifications bell** (checks every 5 seconds; a toast and a live refresh when something new arrives). Texts never
  reveal an identity the viewer may not see.
- **Match thread** per answer, for both sides, with privacy lock chips ("Your name: shared only if you accept").
- **Role-specific app shells**, collapsible accessible sidebar, mobile bottom nav.
- **Design:** calm and civic, inspired by espoo.fi (blue #0050BB, navy #012169, Work Sans + Lato), problem cards as
  index cards, WCAG AA, visible focus, no information by colour alone, purposeful motion (Emil Kowalski's
  principles: short ease-out transitions, reduced-motion respected). See DESIGN.md.

---

## 7. Challenge insight → Pulma answer (summary for slides)

| Insight | Pulma's answer | Status |
|---|---|---|
| Goal: relevant, meaningful connections | Problem cards, blind answers, mutual opt-in, pre-booked conversations | Strong |
| 1 Companies hard to engage | Organiser invitations with reasons to join Espoo events, example answer, outcome report | Strong |
| 2 Needs unclear and late | 5-question chat intake with dictation, AI-structured card, problem deadline, needs timeline | Strong |
| 3 Can't see capability vs needs | Answers to real problems; organiser supply vs demand by ESCO skill (counts only) | Strong |
| 4 Overwhelmed at events | Only pre-agreed meetings, shortlist cap of 5, fast keyboard triage | Strong |
| 5 Hard to describe competencies | Answer a problem instead of a CV; candidate-only skills from CV with ESCO | Strong |
| 6 AI CVs read by AI | No CVs in round 1, short specific answers, AI never selects, AI help labelled | Strong |
| 7 Cumbersome platforms | No algorithmic match list, a few clear actions per role, "Waiting on you" lists | Strong |
| 8 Login stampede | Work happens in the weeks before; staggered arrival times; event card works once opened | Partial (story, not load-tested) |
| 9 International recruitment | Honest language needs, support badges, Work in Finland and Business Espoo links | Partial |
| Bias | Blind, random order, mutual opt-in, AI steers away from demographic asks, no nationality collected | Strong |
| Journey (register → attend → follow up) | Organiser invites, schedule and event card, next steps, outcomes, deletion | Partial: candidates don't register through the organiser yet; no check-in |
| Open data | ESCO API (with 233-skill bundled fallback), Work in Finland, Business Espoo links | Strong |

---

## 8. Responsible AI, EU AI Act and privacy

- AI systems used in recruitment and selection are **high-risk** under the EU AI Act. Pulma keeps AI **out of
  selection**: it never ranks, scores, filters or profiles people. People choose; AI only helps people write.
- Every AI suggestion is accepted by a human and labelled. Every AI call has a canned fallback.
- Blind first round, random order, identities revealed only by mutual consent; email is never shown to a company.
- Data minimisation: tiny accounts; skills and goals private; the CV never stored; organiser sees counts with a
  floor of 5; personal data deleted after the follow-up window, anonymous snapshot kept.
- Synthetic data throughout; no real logos.

---

## 9. Deliberately not built (roadmap)

- **Candidate registration via the organiser** (an onboarding and acceptance form flow). Today candidates browse
  without registering for an event.
- **Event-day check-in** (scan the event-card code, see who has arrived).
- **Load story for insight 8** shown technically (static/cached event pages, peak load moved to the weeks before).
- **Authority-compliance and onboarding guidance** for international hires beyond badges and links.
- Recruitment outside City of Espoo events.
- Optional stretch: an aggregate fairness view from optional self-reported data, only for groups of 10 or more.

---

## 10. Demo (about 2 minutes)

Before: sign in as Event team → Overview → **Reset demo data**. Use Chrome (dictation). Works without an API key.

1. **Kiertovolt** (hiring@kiertovolt.example) → New problem: dictate the battery sensor problem; a problem card
   appears. *Needs arrive weeks early, in minutes.*
2. **Olena** (olena.k@example.com), phone-sized: Explore → sees "Uses your skills" → answers in her own words.
   *Skills, not a CV.*
3. **Kiertovolt** → the problem: anonymous answers in random order; the three generic AI answers fall flat next to
   real thinking. Shortlist three. *Signal over noise, and a human chooses.*
4. **Olena** → Invites → accept: names revealed, pick a time; the schedule builds itself with staggered arrivals;
   event card with QR. *No login stampede, no crowd at the booth.*
5. **Event team** → Overview: needs arrived ~4 weeks out instead of the day before; supply vs demand; the Autumn
   Talent Day outcomes report (problems → hires, promises kept), then data deleted after 60 days.

Close: "We didn't build a smarter matching algorithm. We took the algorithm out and made the humans better at
choosing."

Seed data: 6 fictional companies around Otaniemi and Keilaniemi (game studio, clean-tech, medtech, B2B SaaS,
logistics, robotics); 5 events (Spring and Autumn Talent Days finished; Tech Talent Day 5 Dec, Green Transition
Jobs Morning 10 Dec, International Talent Evening 21 Jan); 12 problems; ~48 answers in varied voices, including
three obviously generic AI-written ones; 22 fictional candidates. More demo accounts: DEMO.md.

---

## 11. Building on the code

### Stack
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4 + shadcn/ui (Base UI) + lucide-react +
  sonner; tests with vitest. `params`, `searchParams`, `cookies()`, `headers()` are async.
- **Store:** one JSON document. Locally `data/db.json` (re-seeded from `data/seed.ts` when missing or old-shaped).
  Hosted on Vercel it is mirrored in **Upstash Redis** (`lib/remote-store.ts`, env `KV_REST_API_URL` +
  `KV_REST_API_TOKEN`), because Vercel instances share no memory. Read with `getDB()` after `syncDB()` (done by
  `getAccount()`; pages without sign-in use `await loadDB()`); write with `mutate()` and `logActivity` inside it.
- **Auth:** `requireAccount(role)` in pages, `apiAccount(role)` in route handlers. Use `nowMs()` in pages. Local
  times are Helsinki wall-clock strings.
- **LLM:** Anthropic SDK, model `claude-sonnet-5-5`, key `ANTHROPIC_API_KEY`. Prompts in `lib/prompts.ts`, logic in
  `lib/ai.ts`; every function returns a fallback and never throws.
- **ESCO:** `lib/esco.ts` (public API `ec.europa.eu/esco/api/suggest2`), bundled `data/esco-skills.json`
  (rebuild with `node scripts/fetch-esco.mjs`).
- **Dictation:** browser Web Speech API (`components/intake/dictate-button.tsx`); typing always works.
- **Deploy:** Vercel via GitHub import, Upstash Redis from the Vercel Marketplace, optional `ANTHROPIC_API_KEY`.

### Data model (lib/types.ts, abridged)
```ts
Company       { id, name, sector, size, about, office? }
ProblemCard   { id, companyId, eventId, title, context, weekOneReality, hardPart, niceToHave[], languages[],
                languagesNeeded[], format, skills[] ("Work involved"), skillRefs[] (ESCO links), support[], goal,
                status: "draft"|"published", state: "open"|"paused"|"filled", createdAt }
HiringGoal    { decideBy, replyWithinDays, inviteDays, meetModes: ("event"|"office"|"video")[] }
Account       { id, email, role, displayName, companyId?, talentId?, createdAt }      // role immutable
Talent        { id, displayName, email, preferredLanguage?, skills? (private), goal? (private), saved? (private) }
Response      { id, publicCode /* "A7" */, cardId, talentId, text, originalLanguage, aiAssisted, createdAt, steppedBack? }
Shortlist     { id, cardId, responseId, status: "invited"|"accepted"|"declined", message?, respondBy }
Closure       { id, cardId, responseId, reason? }                                     // "not this time"
Meeting       { id, cardId, responseId, mode, status, slotStart, table, place?, nextStep?, outcome? }
Event         { id, name, date, startTime, endTime, slotMinutes: 10, tables, venue, stage, problemDeadline,
                followUpDays (60), report? (anonymous snapshot), closedAt? }
Participation { id, eventId, companyId, status: "invited"|"confirmed"|"declined"|"withdrawn", table? }
Availability, Feedback, Activity (server-only; viewers get ActivityView)
```
Constants: up to **3 problems per company per event**, shortlist up to **5 per problem**, follow-up window
**60 days**, organiser count floor **5**.

### Working conventions
- Plan first in CONTRACT.md for anything larger than a fix; keep components small.
- Verify in the browser with the demo accounts (DEMO.md), run `npm test` (vitest) and lint, then commit with a clear
  message. The user pushes. Never commit `AGENTS.md`.
- If pages look stale in dev, stop the server and `rm -rf .next`.
- Keep DESIGN.md, DEMO.md, JUDGING.md and this file in step with what is built.

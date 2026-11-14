# Pulma: build task list

Derived from `CLAUDE.md`. Each task has an ID, what "done" means, and what it depends on.
Tick boxes as you go. **⭐ = needed for the 2-minute demo**. Everything else can be cut if time runs out.

---

## 0. Decisions to make before coding

| # | Decision | Why it matters | Suggested default |
|---|----------|----------------|-------------------|
| D1 | **Where the store lives on Vercel.** Vercel's filesystem is read-only and resets between requests, so writes to `/data/db.json` will not persist when deployed. | The demo breaks on the deployed URL if this is ignored. | Store adapter: JSON file locally, in-memory and seeded from `seed.ts` on Vercel (fine for a demo), plus a **Reset demo** button. Upgrade to Upstash/Vercel KV only if several people demo at once. |
| D2 | **Demo laptop browser.** Web Speech dictation works in Chrome/Edge only, and needs localhost or HTTPS. | Demo step 1 depends on it. | Demo in Chrome. Keep the text fallback visible. |
| D3 | **Final name** (Pulma or something else). | It goes in the header, title and pitch. | Keep Pulma until Phase 7. |
| D4 | **"Current user" in each role.** There is no auth. | The inbox and "your day" views need a "me". | Role switcher also picks a persona: Company = the clean-tech company, Talent = Olena. Store it in a cookie. |

---

## Phase 1: Foundation ⭐
**Checkpoint:** the app runs locally with seed data visible.

- [ ] **1.1** `git init`, then `create-next-app` (App Router, TS, Tailwind, ESLint), `shadcn init`. Add `.env.example` with `ANTHROPIC_API_KEY=`.
- [ ] **1.2** Design tokens: one accent colour, neutral palette checked for AA contrast, Inter/Geist for UI plus a display face for headings, a visible focus ring style. *(Do this early so every screen inherits it.)*
- [ ] **1.3** `/lib/types.ts`: every entity from the data model in CLAUDE.md, exactly.
- [ ] **1.4** `/lib/store.ts`: `read()`, `write()`, `reset()` and typed helpers (`getCards`, `addResponse`, …). Use an adapter that writes to a file locally and holds data in memory on Vercel (D1). Write atomically (write a temp file, then rename).
- [ ] **1.5** `/data/seed.ts`, the content (see the checklist below). Needs 1.3.
- [ ] **1.6** Route handlers under `/app/api/*` for cards, responses, shortlists, meetings, event and reset.
- [ ] **1.7** Header with a **role switcher** (Company / Talent / Organiser) and a persona cookie (D4). Keyboard accessible.
- [ ] **1.8** Home page: a three-step explainer and three doors (I'm hiring, I'm looking, I'm organising).
- [ ] **1.9** Commit: `Phase 1: scaffold, store, seed, home`.

### Seed content checklist (1.5)
- [ ] 6 fictional companies in or near Otaniemi and Keilaniemi: game studio, clean-tech, medtech, B2B SaaS, logistics, robotics. No real names or logos.
- [ ] 8 published problem cards: concrete and messy, describing the **work, not the person**.
- [ ] `createdAt` spread **2 to 4 weeks before** the event date (this feeds the organiser timeline in demo step 5).
- [ ] About 30 responses in varied voices: strong, vague, and some in Finnish, Ukrainian or Spanish.
- [ ] ⭐ The **clean-tech card has exactly about 8 responses**, including the **3 generic AI-fluff** ones (demo step 3).
- [ ] ⭐ A talent persona **Olena** (Ukrainian speaker) who has **not yet answered** the clean-tech card, so she can answer live in demo step 2.
- [ ] `publicCode` values look like `A7`, `B3` and are unique per card.
- [ ] 1 event, "Espoo Tech Talent Day": 4 hours, 6 tables, 10-minute slots.
- [ ] Talent records hold only displayName, a fake email and an optional language.

---

## Phase 2: Company intake ⭐
**Checkpoint:** create a card end to end.

- [ ] **2.1** `/lib/prompts.ts`: an intake-to-ProblemCard prompt that returns JSON in the ProblemCard shape. Rules: describe the work, not the person. Never output credentials, years of experience or nationality. If the company asked for those, add a gentle `suggestions[]` item that rephrases them as the actual work.
- [ ] **2.2** `/lib/ai.ts`: `generateProblemCard(answers)` using `@anthropic-ai/sdk`, model `claude-sonnet-5-5`, a short timeout, JSON validation, and a **canned fallback** card when there is no key, a network error or bad JSON. Mark fallback output in the response, for logs only.
- [ ] **2.3** `/company/intake`: a chat-style flow of 5 questions asked one at a time, with a progress indicator and back/edit.
- [ ] **2.4** A **Dictate** mic button using the Web Speech API with interim results. Hide it gracefully when the browser doesn't support it.
- [ ] **2.5** An editable Problem Card preview (index-card styling), showing the AI's rephrasing suggestions as accept/dismiss chips, then **Publish**.
- [ ] **2.6** Test it with no API key: the canned card must appear and publishing must work.
- [ ] **2.7** Commit.

---

## Phase 3: Talent browse and respond ⭐ (mobile-first)

- [ ] **3.1** `/talent`: a grid of published cards. Tag filters for sector, language and format. **No recommendations and no "for you" ordering.** A filter empty state.
- [ ] **3.2** Card detail page with the full problem card.
- [ ] **3.3** `/talent/card/[id]`: the response box with a soft 600-character limit, a counter, and "3–5 sentences on how you'd approach this". Any language. Auto-detect `originalLanguage`, or let the user choose it.
- [ ] **3.4** **Make this clearer**: `ai.suggestClarity(text)`, shown as a word-level diff (e.g. with the `diff` package). Accept or reject. Fallback: "No suggestions right now."
- [ ] **3.5** ⭐ **Translate for the company**: `ai.translate(text, target)`. Keep the original and show both. Fallback: a canned translation for Olena's seeded answer, otherwise a message that translation isn't available.
- [ ] **3.6** Set `aiAssisted = true` whenever a suggestion was accepted and show the **"AI-assisted wording"** label. (Translation alone counts as AI-assisted too. Decide this and say it in the UI.)
- [ ] **3.7** A privacy note listing **exactly** what the company will see: response code, text, translation, and the AI label.
- [ ] **3.8** Commit.

---

## Phase 4: Blind review, shortlist, reveal ⭐

- [ ] **4.1** `/company/card/[id]`: anonymous responses in **random order**. Shuffle with a per-session seed so the order doesn't reshuffle on every click. Show code, text, translation and AI label only.
- [ ] **4.2** Audit the API payload too: the review endpoint must **not return** talentId, names or emails. Blind means blind on the wire, not only in the UI.
- [ ] **4.3** Shortlist up to 5, with a counter (e.g. "3 of 5") and a disabled state at 5. An optional private note per response, visible only to the company.
- [ ] **4.4** Talent inbox (`/talent/inbox`): invitations show the problem card and company. **Accept** or **Decline**.
- [ ] **4.5** On accept: reveal both identities to each other, create the Meeting, and trigger scheduling (5.x). On decline: no reveal.
- [ ] **4.6** Commit.

---

## Phase 5: Schedule ⭐

- [ ] **5.1** `/lib/schedule.ts`, a **pure function**: `(event, acceptedMeetings) → slots`. Greedy: one table per company, 10-minute slots, no double-booking of a talent or a table, and each talent gets an arrival time (e.g. 15 minutes before their first slot) so arrivals are staggered.
- [ ] **5.2** Unit tests for 5.1: no overlaps, respects event hours, handles overflow when there are more meetings than slots.
- [ ] **5.3** `/event`: the full timetable grid (tables × time).
- [ ] **5.4** "Your day" views: for the company (table, list of response codes and revealed names) and for talent (arrival time, table, slot).
- [ ] **5.5** Commit.

---

## Phase 6: Organiser dashboard ⭐ (step 5 of the demo)

- [ ] **6.1** `/lib/stats.ts`, pure functions: counts, sectors and languages in demand, card-arrival timeline, responses with no invite.
- [ ] **6.2** `/organiser`: a timeline of card arrival vs the event date (the "3 weeks early" story), count tiles, and sector and language breakdowns.
- [ ] **6.3** A list of "Responses that got no invite", framed as **follow up with this person**, never as a ranking.
- [ ] **6.4** A **Reset demo** button that restores the seed (D1). Essential before a live pitch.
- [ ] **6.5** Commit.

---

## Phase 7: Polish and deploy

- [ ] **7.1** Empty states for every list, and loading skeletons for every AI call.
- [ ] **7.2** Accessibility pass: full keyboard run-through, focus order, labels, AA contrast, and no meaning carried by colour alone (labels and icons alongside colour).
- [ ] **7.3** Mobile pass on the talent screens at 375 px.
- [ ] **7.4** Rule audit against the hard rules in CLAUDE.md (checklist below).
- [ ] **7.5** Deploy to Vercel, set `ANTHROPIC_API_KEY`, and test the deployed URL **with and without** the key.
- [ ] **7.6** Rehearse the demo script end to end, 3 times, from a fresh Reset.
- [ ] **7.7** Commit and tag `demo-ready`.

### Hard-rule audit (7.4)
- [ ] No code path sorts, scores or filters responses by AI.
- [ ] Every AI suggestion needs a human click to apply.
- [ ] The AI-assisted label is shown wherever AI-helped text appears.
- [ ] Review payloads carry no identity fields.
- [ ] Identity is revealed only after shortlist **and** accept.
- [ ] Seed data is fictional, with no real logos (including the City of Espoo's).
- [ ] Talent data is only displayName, email and language.
- [ ] Every LLM call has a fallback, verified by unsetting the key.

---

## Phase 8: Stretch

- [ ] **8.1** One-tap post-meeting follow-up ("next step" / "not now") stored as Feedback.
- [ ] **8.2** A fairness view built from optional self-reported data only, with groups under 10 hidden.
- [ ] **8.3** Pitch extras: a one-slide EU AI Act explainer, and the closing line in the app's footer or about page.

---

## Orchestration: what can run in parallel

The critical path is **1.1 → 1.3 → 1.4 → screens**. Once types (1.3) exist, these tracks are independent and can be built side by side, by teammates or separate Claude sessions:

| Track | Tasks | Touches |
|-------|-------|---------|
| A: Core app (critical path) | 1.4, 1.6, 1.7, 1.8, then the screens in phase order | `app/`, `lib/store.ts` |
| B: Seed content writing | 1.5 | `data/seed.ts` only |
| C: AI layer | 2.1, 2.2, plus the `suggestClarity` and `translate` functions with fallbacks | `lib/ai.ts`, `lib/prompts.ts` |
| D: Design system | 1.2, the ProblemCard component, the AI-label badge | `components/`, `app/globals.css` |
| E: Pure logic and tests | 5.1, 5.2, 6.1 | `lib/schedule.ts`, `lib/stats.ts` |

Tracks B to E have no shared files, so they can't conflict. Merge them into Track A as each phase reaches the point where it needs them.

## Biggest risks
1. **Vercel persistence (D1).** The deployed demo silently loses data.
2. **Live LLM latency or failure on stage.** Mitigate with fallbacks, a timeout of 8 seconds or less, and a rehearsed run with no key.
3. **Dictation in a noisy hall.** Keep the typed fallback ready, and have pre-written answers to paste.
4. **Seed quality.** The demo's "aha" moment (generic AI answers falling flat) only works if the real answers are genuinely specific. Spend real time on 1.5.

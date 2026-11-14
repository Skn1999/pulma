# Pulma — problem-first matchmaking for recruitment events

Junction 2026 · "Rethinking Recruitment" challenge by City of Espoo.
Working name: **Pulma** (Finnish for "puzzle / tricky problem"). Rename freely.

## One-liner
Companies bring a real problem, not a job ad. Talent answers it in their own words, not with a CV.
Companies pick who to meet without seeing names, and the event becomes booked 10-minute conversations.

## Why this exists (the challenge, condensed)
- Companies describe their needs badly and too late (often the day before the event).
- Organisers get many applications but can't see real capability.
- Companies get flooded with irrelevant approaches during events.
- Professionals struggle to show transferable skills; CVs and messages are increasingly AI-written and AI-screened, so both sides are matching on synthetic representations.
- The online event platform feels cumbersome and crashes when everyone logs in at once.
- Companies doubt a free public service has good candidates.
- International hiring adds language and culture barriers, and bias by nationality, language and education is a risk.

Judges care about: better matching, discovery and communication; privacy; transparency; fairness and inclusion;
**no automated decision-making about individuals**; minimal personal data; EU AI Act awareness; synthetic data only.

## Hard rules (do not break these)
1. **No ranking, scoring or filtering of people by AI.** AI never decides who is shown, hidden or shortlisted. Responses are shown to companies in random order.
2. **AI only helps people write things down**: it structures the company intake into a problem card and offers optional clarity suggestions to talent (translation was removed on 14 Nov 2026: many jobs have strict language requirements, so answers are written in one of the problem's working languages). Every AI suggestion must be accepted by a human, and any text edited with AI help carries a visible "AI-assisted wording" label.
3. **Blind first round.** Companies see a response ID (e.g. "Response #A7"), the answer text and nothing else: no name, photo, nationality, age, school or CV.
4. **Identity is revealed only by mutual opt-in**: the company shortlists, then the talent accepts the meeting, then names are exchanged.
5. **Synthetic data only.** All seed people and companies are fictional. No real logos, including the City of Espoo's.
6. **Data minimisation.** Talent account = display name + email (fake) + optional language. Nothing else is collected.
7. The demo must never break: every LLM call has a canned fallback when there is no API key or the network fails.

## Stack
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- State: a simple server-side JSON store (`/data/db.json`) behind route handlers, seeded from `/data/seed.ts`. Email-only accounts (no passwords): **one email = one account type (Company / Talent / Organiser), fixed forever**; to act in another role, use another email. The sign-in page lists one-click demo accounts so one laptop can demo every side. Each role gets its own app shell (see CONTRACT.md v2).
- LLM: Anthropic SDK (`@anthropic-ai/sdk`), model `claude-sonnet-5-5`, key from `ANTHROPIC_API_KEY`. All prompts live in `/lib/prompts.ts`.
- Voice (optional): the browser Web Speech API for dictation in the company intake. Fall back to text input.
- Deploy: Vercel.

## Data model
```ts
Company      { id, name, sector, size, about }
ProblemCard  { id, companyId, title, context, weekOneReality, hardPart,
               niceToHave[], languages[], format: "onsite"|"online"|"hybrid",
               status: "draft"|"published", createdAt }
Account      { id, email, role, displayName, companyId?, talentId?, createdAt }   // role immutable
Talent       { id, displayName, email, preferredLanguage? }        // never shown in round 1
Response     { id, publicCode /* "A7" */, cardId, talentId, text, originalLanguage,
               aiAssisted: boolean, createdAt }
Shortlist    { id, cardId, responseId, status: "invited"|"accepted"|"declined" }
Meeting      { id, cardId, responseId, slotStart, table }
Event        { id, name, date, startTime, endTime, slotMinutes: 10, tables, venue, stage, problemDeadline }
Participation { id, eventId, companyId, status: "invited"|"confirmed"|"declined"|"withdrawn", table? }  // organiser invites companies
Feedback     { id, meetingId, side: "company"|"talent", outcome: "next-step"|"not-now", note? }  // stretch
```

## Events run by the organiser (decided 14 Nov 2026)
- Scope: matchmaking at recruitment events organised by the City of Espoo (fictional demo events).
- The organiser creates an event (draft → open → locked → done), invites companies, and assigns tables.
  Companies accept or decline the invitation, then publish **up to 3 problems per event** before its problem deadline.
- Candidates do not register for events today. Later: the organiser adds candidates through a separate
  onboarding/acceptance flow (not built yet).

## Screens (build in this order)
1. **Home / role switcher**: a one-screen explainer of how it works in three steps, then three doors (I'm hiring, I'm looking, I'm organising).
2. **Company intake** (`/company/intake`): a chat-style interview of five questions asked one at a time:
   1. What is a problem your team is stuck on right now?
   2. What would this person actually do in their first week?
   3. What's the genuinely hard part?
   4. What would be a bonus but isn't required?
   5. Which working languages are realistic in the team?
   Then call the LLM to turn the answers into a **Problem Card**, show an editable preview, and publish. Include a "Dictate" mic button.
   Prompt rule: the card must describe the work, not the person. Experience and skills the work needs are fine (e.g. years of experience). It must never include demographic or other discriminating requirements (age or age proxies, gender, nationality, citizenship, ethnicity, "native speaker", religion, family status, health, photos); if the company asks for these, the AI gently suggests rephrasing them as the actual need.
3. **Talent browse** (`/talent`): a grid of published problem cards with simple tag filters (sector, language, format, event) and no hidden recommendations. Optional: the candidate's own private skills (suggested from their CV, each accepted by them) show a visible "Uses your skills: …" tag match and an opt-in sort; nothing is hidden, and skills never reach companies. Card detail page.
4. **Talent respond** (`/talent/card/[id]`): a text box with a soft limit of about 600 characters ("3–5 sentences on how you'd approach this"), answerable in any language.
   Optional buttons: "Make this clearer" (the AI suggests edits as a diff that the user accepts or rejects).
   Show a privacy note listing exactly what the company will see.
5. **Company review** (`/company/card/[id]`): anonymous responses in random order, each with its code, text and the AI-assisted label if used. Shortlist up to five, with a counter, and an optional private note per response.
6. **Talent inbox**: invitations appear; accept to reveal both identities and book a slot.
7. **Event schedule** (`/event`): auto-build 10-minute slots per company table from accepted meetings with no double-booking (simple greedy algorithm). Each person gets a personal arrival time so check-ins are staggered. Show "your day" views for both sides.
8. **Organiser dashboard** (`/organiser`): a timeline showing when problem cards arrived versus the event date (the "needs arrived early" story), counts (cards, responses, shortlists, meetings), sectors and languages in demand, and responses that got no invite (as a cue to follow up with that person, never a ranking).
9. **Stretch**: a one-tap post-meeting follow-up ("next step / not now") and an aggregate fairness view based only on optional self-reported data, shown only when a group has at least 10 people.

## Seed data (`/data/seed.ts`)
- 6 fictional companies in and around Otaniemi and Keilaniemi (game studio, clean-tech, medtech, B2B SaaS, logistics, a robotics startup).
- 8 published problem cards that are concrete and a bit messy, the way real problems are.
- About 30 responses written in varied voices: some strong and specific, some vague, some from people whose first language is not English, plus **3 that are obviously generic, AI-written fluff**. Those three are a demo moment: next to a specific problem, generic answers are easy to see through.
- 1 event: "Espoo Tech Talent Day", 4 hours, 6 tables, 10-minute slots.

## Design direction
- Calm, civic and trustworthy, not generic SaaS. Generous whitespace, one confident accent colour, and clear type (e.g. Inter or Geist for UI with a characterful display face for headings).
- Problem cards are the hero object: they should feel like physical index cards.
- Accessible: WCAG AA contrast, full keyboard navigation, visible focus, no information conveyed by colour alone.
- Mobile-first for the talent side, since people respond on their phones. The company and organiser views can be desktop-first.

## Build phases (stop and show me at each checkpoint)
- **Phase 1**: scaffold, seed data, JSON store, role switcher, home page. Checkpoint: the app runs locally with seed data visible.
- **Phase 2**: company intake with the LLM call and fallback, then card publishing. Checkpoint: create a card end to end.
- **Phase 3**: talent browse and respond, with the clarity helper.
- **Phase 4**: company blind review, shortlist, talent accept and identity reveal.
- **Phase 5**: schedule generation and the "your day" views.
- **Phase 6**: organiser dashboard.
- **Phase 7**: polish, empty states, loading states, accessibility pass, deploy to Vercel.
- **Phase 8 (stretch)**: follow-up and the fairness view.

Commit after each phase. Keep components small; put LLM logic in `/lib/ai.ts`.

## 2-minute demo script
1. A hiring manager at a fictional clean-tech company dictates for about 60 seconds, and a Problem Card appears. (Needs arrive weeks early, in minutes.)
2. Switch to Talent: Olena finds the problem, sees it uses her skills, and answers in her own words. (Skills, not a CV.)
3. Switch to Company: eight anonymous answers. The three generic AI ones fall flat next to real thinking. Shortlist three. (Signal over noise, and a human chooses.)
4. Olena accepts the invite and names are revealed; the schedule builds itself with staggered arrivals. (No login stampede, no crowd at the booth.)
5. Organiser view: needs arrived 3 weeks out instead of the day before.
Close: "We didn't build a smarter matching algorithm. We took the algorithm out and made the humans better at choosing."

## Responsible AI / EU AI Act talking points
- AI systems used in recruitment and selection are classified as high-risk under the EU AI Act. Pulma deliberately keeps AI out of selection: it never ranks, scores, filters or profiles people.
- AI acts only as a writing aid, it is always labelled, and a human accepts every suggestion.
- Personal data is minimised and identities are revealed only by mutual consent. In a real deployment, data would be retained per event with automatic deletion afterwards.
- Synthetic data is used throughout the prototype.

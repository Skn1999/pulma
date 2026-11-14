# Pulma against the City of Espoo challenge

Analysis of 14 Nov 2026, from commit 53a80d9. The brief (CHALLENGE.md) has no separate scoring rubric, so this
checks Pulma against what the brief itself asks for: its goal, its nine "initial insights", its signal-vs-noise and
bias requirements, its journey scope (register → attend → follow up), and its invitation to use open data.
Ratings: **Strong** (built and demoable), **Partial** (some of it, or only as a story), **Gap** (not addressed).

## Summary

| # | What the brief asks | Rating |
|---|---|---|
| Goal | More relevant, efficient, meaningful connections at Espoo events | Strong |
| 1 | Companies hard to engage; doubt the city's candidates and a free service | Strong (since 14 Nov: reasons on the invitation) |
| 2 | Companies describe needs unclearly and too late | Strong |
| 3 | Organisers can't see applicants' real capabilities vs. company needs (esp. tech) | **Partial** |
| 4 | Companies overwhelmed by irrelevant approaches during events | Strong |
| 5 | Professionals struggle to describe competencies and transferable skills | Strong |
| 6 | AI-written CVs read by AI: synthetic representations | Strong |
| 7 | Online event platforms with matching algorithms feel cumbersome | Strong |
| 8 | Platform crashes when everyone logs in at the start | **Partial** |
| 9 | International recruitment: compliance, language, culture, relocation, onboarding | **Partial** (language + support badges) |
| Bias | Don't disadvantage people by nationality, language, education, career path | Strong |
| Scope | Registering, attending and following up | **Partial** (candidate registration, check-in) |
| Data | Use relevant open data / APIs (ESCO, Work in Finland…) | **Gap** |

Pulma's core argument answers the heart of the brief directly: *"We didn't build a smarter matching algorithm. We
took the algorithm out and made the humans better at choosing."* Problem-first cards replace job ads, answers to a
real problem replace CVs, and a blind, random-order first round replaces AI screening.

## Point by point

### Goal: relevant, efficient, meaningful connections — Strong
- Companies publish a real **problem card**; talent answers it in 3–5 sentences; companies shortlist up to 5 blind
  answers; accepted matches become **booked 10-minute table slots** (or office/video meetings).
- Every connection at the event is pre-agreed by both sides; there is no cold queue at the booth.
- Demo: Olena answers → Kiertovolt shortlists → Olena accepts → names revealed → slot booked → event card.

### 1. Engaging companies; doubts about candidate quality and a free service — Strong (updated)
- Added: each invitation now says **why to take part in a City of Espoo event**, right above Accept: meet
  jobseekers and international professionals you won't find on job boards; free, with Business Espoo's recruitment
  specialists; possible support with hiring costs (pay subsidy, Espoo supplement). It links to the city's own
  recruitment-assistance, financial-support and employer-contact pages, and "What would we read?" shows one
  anonymous example answer.
- Built: the organiser **invites** companies to a named event with a personal note; accepting gives a **table**
  and lets them publish up to 3 problems. Companies get a clear, low-effort way in (5 questions, dictation).
- Built: once answers arrive, companies *see* quality for themselves (specific answers vs. obvious AI fluff).
- Missing: nothing **before** a company joins shows them the pool is worth it. The invitation says *where* and
  *when*, not *why*. No "what you get" (e.g. "40 people answered problems like yours last event", "average reply
  within 3 days", sample anonymous answers) and no story of the city as a serious talent source.
- Quick win: a value block on the invitation and on the company Events page — last event's anonymous outcomes
  (answers per problem, meetings booked, % followed up "next step"), plus one or two anonymous sample answers.

### 2. Needs described unclearly and too late — Strong
- Chat-style **intake** of five questions (with dictation) produces a structured problem card in minutes; the AI
  only structures the company's own words, and the company edits before publishing.
- Each event has a **problem deadline** (default two weeks before), enforced at publish time.
- Organiser **needs timeline** shows when each card arrived versus the event date ("needs arrived 28 days early").
- Language needs are split into *needed for the work* vs *nice to have*, with a nudge when Finnish/Swedish is marked
  needed for non-customer work.

### 3. Organisers can't see real capabilities vs. needs — Partial
- Built: real capability shows up as **answers to real problems**, read by the company that owns the problem.
  Organisers see per-event counts, sectors and languages in demand, follow-ups for answers that got no invite.
- By design the organiser does not read or rank individual answers (no automated or central judging of people).
- Missing: an organiser-level view of **skills supply vs. demand** (e.g. "12 problems need data cleaning; 30
  candidates list it"), aggregated and anonymous, which is exactly what the brief asks for in tech sectors.
- Quick win: aggregate candidate skills (opt-in, counts only, minimum group size) against problem "work involved"
  tags on the organiser overview. Map both to **ESCO** skills for a shared vocabulary (see Data).

### 4. Companies overwhelmed during events — Strong
- Nobody approaches a company at the event without a booked slot; the shortlist is capped at 5 per problem.
- Triage is fast: keyboard shortcuts, tabs, "not this time" with an optional reason, close remaining in one go.
- The three generic AI answers in the seed are the demo moment: noise is visible next to a specific problem.

### 5. Professionals describing their competencies — Strong
- Candidates answer a concrete problem instead of writing a CV: transferable skills show up as *how they would
  approach the work* (e.g. a nurse from Kharkiv on alarm fatigue, a forklift driver on lost pallets).
- **Skills from the CV** (candidate-only): paste a CV, the AI suggests skills phrased as work, the candidate
  accepts each one; the CV is never stored, and companies never see the skills.
- "Uses your skills" match on Explore (visible, opt-in sort, nothing hidden) and a related-skills hint while
  writing; an optional "Make this clearer" helper with an accepted diff and a visible AI-assisted label.

### 6. AI-generated materials read by AI — Strong
- No CVs in the first round; answers are short and problem-specific, which generic AI text handles badly.
- AI never ranks, scores or filters people; answers are shown in random order; every AI edit is labelled.
- The AI's only jobs are writing aids (problem card structure, clarity, skill suggestions), each accepted by a human.
- Strong EU AI Act story: recruitment AI is high-risk; Pulma keeps AI out of selection entirely.

### 7. Cumbersome platforms with matching algorithms — Strong
- No profile to fill in, no algorithmic match list. Candidates: browse, answer, accept. Companies: answer five
  questions, read, shortlist. Email-only accounts with one-click demo sign-in. Mobile-first for candidates.
- Each role has its own simple app shell; "Waiting on you / Waiting on them" lists say what to do next.

### 8. Login stampede at the start of an online event — Partial
- Story is strong: the work happens **before** the event (answers, invites, bookings), so there is no rush to log
  in at the start; each person gets a **personal arrival time** (staggered); the **event card** works offline once
  opened and can be printed.
- Not shown technically: the prototype is a single server with a JSON store. Nothing demonstrates load handling.
- Quick win (story, not code): one slide/diagram — "peak load moves from minute 0 of the event to the weeks
  before, spread over time"; static, cacheable event card and schedule pages. Optional: make the event card page
  fully static/cached.

### 9. International recruitment — Partial (updated)
- Added: companies can tick **Work-permit help · Relocation help · Onboarding in English** on a problem; it shows
  on the card and the Explore tile with a link to the public **Work in Finland** service, and the intake links
  companies to **Business Espoo**'s recruitment assistance. Information about the job, never a filter on people.
- Still missing: authority-compliance guidance and onboarding support beyond the badge.
- Built: language needs are explicit and honest (needed vs. nice to have), "native speaker" requirements are
  steered away, and no nationality is collected.
- Translation was removed on purpose (some jobs have strict language requirements), so non-Finnish speakers rely on
  problems marked English-friendly.
- Missing: **authority compliance, relocation and onboarding support** — nothing tells a candidate whether a company
  can help with residence permits, relocation or onboarding, and nothing points to public services.
- Quick win: optional company fields on a problem — "We can support: work-permit process · relocation · onboarding
  in English" — shown as plain badges, plus links to the public **Work in Finland** and Business Espoo recruitment
  assistance pages. Not a filter on people; it is information about the job.

### Bias and fairness — Strong
- Blind first round: a response code and the text, nothing else (no name, photo, nationality, age, school, CV).
- Identity revealed only by mutual opt-in; random answer order; shortlist cap; no AI ranking.
- Intake AI steers companies away from demographic or discriminating asks (age, gender, nationality, native speaker,
  religion, family, health, photos) while allowing real requirements such as experience.
- Data minimisation: a candidate account is a display name, email and optional language; skills are private.
- Organiser "no invite" follow-ups are a cue to support people, never a ranking.
- Watch-out to be ready for: removing translation could disadvantage people with less Finnish/English. The answer
  is that language is only required where the work needs it, and the card shows which languages are needed.

### Journey scope: register → attend → follow up — Partial
- Register: organiser creates events and **invites companies**; companies accept and get a table. **Candidates do
  not register** for events yet (planned: organiser-run candidate onboarding).
- Attend: schedule built automatically, no double booking, staggered arrivals, "your day" views, event identity card
  with a shared code and QR. Missing: an organiser **check-in** view (scan the card code, see who has arrived).
- Follow up: one-tap "next step / not now", reply promises with "Promises kept" record per company, invite expiry
  and re-invite, "no ghosting" lists, organiser follow-ups for answers that got no invite.

### Open data and APIs — Gap
- None of the suggested sources are used yet. This is the brief's only explicit "nice to have" we miss entirely.
- Quick win: **ESCO** — map problem "work involved" tags and candidate skills to ESCO skill labels (ESCO has a public
  REST API; keep a small cached fallback list so the demo never breaks). Shows a shared, EU-standard vocabulary and
  makes the organiser supply-vs-demand view meaningful. Link out to Work in Finland for international candidates.

## What to do before the showcase (ranked by impact for the time)

1. **Demo narrative and slides** that map the five demo steps to the brief's insights (2, 4, 5, 6, 8, bias).
   Highest impact, no code. Include the "load moves to the weeks before" diagram for insight 8.
2. ~~Company value block~~ — done 14 Nov.
3. ~~International support badges~~ — done 14 Nov.
4. **ESCO mapping** for work tags and skills (Data + insight 3), with a cached fallback. Medium.
5. **Organiser skills supply vs. demand** (insight 3), aggregated, minimum group size. Small once 4 exists.
6. **Organiser check-in** by event-card code (journey: attend). Small–medium.
7. Candidate registration via the organiser (journey: register). Planned for later; mention as roadmap.

Also before the demo: reset the demo data, and keep the API-key-less fallbacks (they already work) as the safety net.

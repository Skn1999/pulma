# Pulma — Problem-First Matchmaking for Recruitment Events

> **Junction 2026** · *"Rethinking Recruitment"* challenge by the **City of Espoo**  
> **Live Demo:** [pulma-phi.vercel.app](https://pulma-phi.vercel.app) · *All data is synthetic.*

---

> *"We didn't build a smarter matching algorithm. We took the algorithm out and made the humans better at choosing."*

---

## The Proposal: Why, What, and How

### 1. Why (The Problem)

Public recruitment events often struggle with a fundamental mismatch:
- **Last-minute, vague needs:** Companies submit generic job descriptions the day before the event, making preparation impossible.
- **AI-generated noise:** Candidates write CVs with AI, and companies screen them with AI—both sides match on synthetic representations, hiding true capability and transferable skills.
- **Overwhelming booth chaos:** Companies get flooded with walk-ins, leading to long queues and superficial interactions.
- **Unconscious bias & barriers:** Non-traditional, international, and career-transitioning candidates get filtered out by keywords, language proxies, or unfamiliar credentials before they can show how they think.
- **High-risk AI screening:** Algorithmic ranking and automated candidate profiling present severe fairness risks and fall under high-risk categories in the **EU AI Act**.

---

### 2. What (The Solution)

**Pulma** (Finnish for *"puzzle / tricky problem"*) flips recruitment from credentials to capability:

1. **Problems, Not Job Ads:** Companies define a concrete technical or operational challenge their team is stuck on right now, what week one actually looks like, and the genuinely hard parts.
2. **Answers, Not CVs:** Candidates respond to the challenge in 3–5 sentences in their own words explaining how they would approach it. Real problem-solving stands out; generic AI fluff falls flat.
3. **Blind First Round:** Employers evaluate anonymized responses (e.g. *Response #A7*) in random order without names, photos, age, nationality, education, or CVs.
4. **Mutual Opt-in Identity Reveal:** Names and contact details are only shared when an employer shortlists a candidate and the candidate accepts the invitation.
5. **Pre-Agreed Conversations:** The event replaces chaotic queues with pre-scheduled 10-minute focused conversations, staggered arrival times, and personal event cards.

---

### 3. How (How It Works)

#### 🏢 For Employers (Companies)
- **5-Question Guided Intake:** Fast chat-style interview with browser voice dictation (English/Finnish) completed in minutes, weeks before the event.
- **Work-Centric AI Structuring:** Turns raw notes into an index-style **Problem Card** describing the work, actively flagging and rephrasing demographic or proxy biases.
- **Blind Triage:** Fast keyboard-driven review (`j`/`k` to navigate, `s` to shortlist up to 5). No ghosting: clear reply deadlines keep employers accountable.
- **Next-Steps Tracking:** Schedule event-table meetings, office visits, or video calls, and record commitments post-event.

#### 👤 For Candidates (Talent)
- **Problem Discovery:** Explore challenges filtered by working language, sector, and format—with no opaque recommendation black boxes.
- **Private Skills Mapping (ESCO):** Extract transferable skills from an uploaded CV mapped to the EU ESCO standard. The CV is processed in memory and never stored; skills remain 100% private.
- **Authentic Responses:** Answer in your own words with optional AI clarity suggestions (shown as interactive diffs, strictly human-accepted, visibly tagged as *"AI-assisted wording"*).
- **Control & Dignity:** Stepper progress tracking, transparent privacy locks, and personal arrival times.

#### 🏛️ For Event Organisers (City of Espoo)
- **Full Event Lifecycle:** Manage stages (`Draft` → `Open` → `Locked` → `Done`) and track incoming company problems on a timeline ("needs arrived 27 days early").
- **Aggregated Capability Insights:** View macro supply vs. demand by ESCO skill counts without ever viewing individuals' private profiles or answers (with a privacy floor: groups under 5 display as *"fewer than 5"*).
- **Conflict-Free Scheduling:** Automated schedule generator for 10-minute slots and table allocations.
- **GDPR & Lifecycle Minimisation:** 60-day follow-up window for outcome reporting (interviews, hires, subsidies), followed by automated deletion of personal data and retention of anonymous aggregates.

#### 🛡️ Responsible AI & EU AI Act Compliance
- **Zero Automated Decisions:** AI **never** ranks, scores, filters, or shortlists candidates. Matching is 100% human-driven.
- **AI as a Writing Assistant Only:** Used solely to structure problem statements and offer optional user-confirmed wording clarity.
- **Full Fallback Safety:** Every AI operation and external API features built-in deterministic fallbacks. The system never breaks if API keys are missing or offline.

---

## Project Documentation

- [CLAUDE.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/CLAUDE.md) — Product brief, challenge alignment matrix, and full technical architecture.
- [DEMO.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/DEMO.md) — 2-minute step-by-step judge demo script and one-click demo personas.
- [CHALLENGE.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/CHALLENGE.md) — City of Espoo challenge brief and core problem statements.
- [JUDGING.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/JUDGING.md) — Criteria breakdown and jury alignment.
- [DESIGN.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/DESIGN.md) — Civic design system, typography, and accessibility (WCAG AA).
- [CONTRACT.md](file:///Users/SumitKumar/Desktop/AI projects/pulma/CONTRACT.md) — Data schemas and interface specifications.

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 20+)
- npm

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Local data is stored in `data/db.json` (auto-seeded on first run or when reset via the Organiser view).
- Optional: add `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` to `.env.local` to enable live LLM generation. Without an API key, all AI features gracefully run on rich synthetic fallbacks.

### Tests

```bash
npm run test
```

---

## Deployment (Vercel)

Vercel instances run statelessly across multiple lambdas. The shared state is synced via an Upstash Redis store (`lib/remote-store.ts`, using Upstash REST API without heavy SDK overhead).

1. Import the repository into **Vercel** (or run `npx vercel`).
2. Add an **Upstash Redis** database via the Vercel Marketplace (automatically configures `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
3. (Optional) Set `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` in environment variables.
4. Deploy. The first request automatically seeds the synthetic demo data. The Organiser dashboard contains a **"Reset demo data"** button to restore initial state at any time.

*(Without Redis credentials, the app falls back to local memory on each instance).*

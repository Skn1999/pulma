# Pulma

Problem-first matchmaking for City of Espoo recruitment events (Junction 2026). See CLAUDE.md for the product,
CHALLENGE.md for the brief and DEMO.md for the demo script. All data is synthetic.

## Run locally

```bash
npm install
npm run dev
```

Data lives in `data/db.json` (re-seeded when missing). AI features use `ANTHROPIC_API_KEY` if set, else `GEMINI_API_KEY` (put either in `.env.local`); with neither,
every AI feature uses its canned fallback.

## Deploy (Vercel)

Vercel runs the app as several server instances that share no memory, so the store is mirrored in one Redis key
(`lib/remote-store.ts`, Upstash REST API, no SDK). Each instance re-reads it only when its version changes.

1. Import the repo in Vercel (or `npx vercel` from this folder).
2. Add an Upstash Redis database from the Vercel Marketplace and connect it to the project. That sets
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` (the `UPSTASH_REDIS_REST_*` names work too).
3. Optional: `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` for live AI; without one the fallbacks run.
4. Deploy. The first request seeds the demo data; the organiser's "Reset demo data" re-seeds it for everyone.

Without the Redis variables a deployment still works, but each instance keeps its own copy, so changes can seem to vanish.

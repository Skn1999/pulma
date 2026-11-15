import fs from "node:fs";
import path from "node:path";
import { addRelativeSeed, seed } from "@/data/seed";
import type { DB } from "./types";
import { buildSchedule } from "./schedule";
import { sortedEvents } from "./events";
import { sweepDeadlines } from "./sweep";
import { sweepFollowUps } from "./outcomes";
import { after } from "next/server";
import { pullRemote, pushRemote, remoteEnabled } from "./remote-store";
import { activeSandboxId, enterSandbox, getRequestSandboxId } from "./sandbox";

const FILE = path.join(process.cwd(), "data", "db.json");
const memoryOnly = !!process.env.VERCEL;

interface SandboxState {
  db?: DB;
  ver?: string;
  pushPromise?: Promise<void>;
  pullPromise?: Promise<void>;
}

const g = globalThis as unknown as {
  __pulmaSandboxes?: Map<string, SandboxState>;
  __pulmaDB?: DB;
  __pulmaVer?: string;
  __pulmaPush?: Promise<void>;
  __pulmaPull?: Promise<void>;
};

function getSandboxes(): Map<string, SandboxState> {
  if (!g.__pulmaSandboxes) g.__pulmaSandboxes = new Map<string, SandboxState>();
  return g.__pulmaSandboxes;
}

function getSandboxState(sid: string): SandboxState {
  const map = getSandboxes();
  let state = map.get(sid);
  if (!state) {
    state = {};
    map.set(sid, state);
  }
  return state;
}

function persist(db: DB, sandboxId?: string) {
  const sid = sandboxId || activeSandboxId();
  const state = getSandboxState(sid);
  state.db = db;

  if (remoteEnabled()) {
    // Hosted: share the copy with other instances for this sandbox (see lib/remote-store.ts).
    const ver = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    state.ver = ver;
    const prev = state.pushPromise ?? Promise.resolve();
    const push = prev.then(() => pushRemote(db, ver, sid));
    state.pushPromise = push;
    try {
      after(() => push); // keep the function alive until the write lands, without delaying the response
    } catch {
      // outside a request (tests, scripts): nothing to keep alive
    }
  }

  if (memoryOnly) return;
  try {
    const file = sid === "default" ? FILE : path.join(process.cwd(), "data", "sandboxes", `${sid}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  } catch {
    // Persistence failure must never break the demo; memory copy remains.
  }
}

/** Older data shapes are re-seeded rather than migrated (demo data only). */
function isCurrentShape(db: DB): boolean {
  return (
    [db.accounts, db.closures, db.activity, db.availability, db.events, db.participations].every(Array.isArray) &&
    db.events.length > 0 &&
    db.events.some((e) => e.id === "ev-0") &&
    !!db.events.find((e) => e.id === "ev-old")?.report
  );
}

export function getDB(sandboxId?: string): DB {
  const sid = sandboxId || activeSandboxId();
  const state = getSandboxState(sid);

  // The in-memory copy survives hot reloads, so check its shape too.
  if (state.db && isCurrentShape(state.db)) return state.db;

  let db: DB | undefined;
  if (!memoryOnly) {
    try {
      const file = sid === "default" ? FILE : path.join(process.cwd(), "data", "sandboxes", `${sid}.json`);
      if (fs.existsSync(file)) {
        db = JSON.parse(fs.readFileSync(file, "utf8")) as DB;
      }
    } catch {
      db = undefined;
    }
  }
  if (db && !isCurrentShape(db)) db = undefined; // older db: re-seed
  if (!db) {
    db = freshDB();
    persist(db, sid);
  }
  state.db = db;
  return db;
}

/**
 * Bring this instance's copy up to date with the shared copy for this sandbox.
 * Call it (await) at the start of every request that reads the store before anything else does.
 * getAccount() does it, so pages and routes behind sign-in are covered.
 */
export async function syncDB(sandboxId?: string): Promise<void> {
  let sid = sandboxId;
  if (!sid) {
    sid = await getRequestSandboxId();
    enterSandbox(sid);
  } else {
    enterSandbox(sid);
  }

  if (!remoteEnabled()) return;
  const state = getSandboxState(sid);
  if (state.pushPromise) await state.pushPromise; // our own last write lands first

  if (!state.pullPromise) {
    state.pullPromise = (async () => {
      const got = await pullRemote(state.ver, sid);
      if (got === "same") return;
      if (got === "empty") {
        persist(getDB(sid), sid); // first instance ever for this sandbox: publish the fresh seed
        return;
      }
      if (got && isCurrentShape(got.db)) {
        state.db = got.db;
        state.ver = got.ver;
      }
    })().finally(() => {
      state.pullPromise = undefined;
    });
  }
  await state.pullPromise;
}

/** getDB() after syncDB(): for pages and routes that read the store without signing in first. */
export async function loadDB(sandboxId?: string): Promise<DB> {
  const sid = sandboxId || (await getRequestSandboxId());
  enterSandbox(sid);
  await syncDB(sid);
  return getDB(sid);
}

/** Wait until this instance's writes reached the shared copy (route handlers call it before replying). */
export async function flushDB(sandboxId?: string): Promise<void> {
  const sid = sandboxId || activeSandboxId();
  const state = getSandboxState(sid);
  if (state.pushPromise) await state.pushPromise;
}

export function mutate<T>(fn: (db: DB) => T, sandboxId?: string): T {
  const sid = sandboxId || activeSandboxId();
  const db = getDB(sid);
  const result = fn(db);
  persist(db, sid);
  return result;
}

/** Write slot times and tables from buildSchedule onto db.meetings. Never throws. */
export function applySchedule(db: DB): void {
  try {
    // Finished events keep the times they had: their meetings are history, not something to re-plan.
    const slots = sortedEvents(db).filter((ev) => ev.stage !== "done").flatMap((ev) => buildSchedule(db, ev.id).slots);
    for (const m of db.meetings) {
      const slot = slots.find((x) => x.meetingId === m.id);
      if (slot) {
        m.slotStart = slot.start;
        m.table = slot.table;
      }
    }
  } catch {
    // An unscheduled meeting is better than a crash during the demo.
  }
}

/**
 * Seed history has fixed dates. If any lie in the future relative to the real clock, move all
 * seed timestamps back by the same amount so the newest is one hour ago. Live actions then always
 * sort after seed history, and relative times ("2 days ago") read correctly. Event date is untouched.
 */
function shiftSeedIntoPast(db: DB): void {
  const stamps: string[] = [
    ...db.cards.map((c) => c.createdAt),
    ...db.responses.flatMap((r) => [r.createdAt, r.updatedAt ?? ""]),
    ...db.closures.map((c) => c.createdAt),
    ...db.activity.map((a) => a.at),
    ...db.accounts.map((a) => a.createdAt),
    ...db.shortlists.map((s) => s.createdAt ?? ""),
  ].filter(Boolean);
  const latest = Math.max(...stamps.map((s) => Date.parse(s)).filter((n) => !Number.isNaN(n)));
  const target = Date.now() - 60 * 60 * 1000;
  if (!Number.isFinite(latest) || latest <= target) return;
  const delta = latest - target;
  const shift = (s: string) => new Date(Date.parse(s) - delta).toISOString();
  for (const c of db.cards) c.createdAt = shift(c.createdAt);
  for (const r of db.responses) {
    r.createdAt = shift(r.createdAt);
    if (r.updatedAt) r.updatedAt = shift(r.updatedAt);
  }
  for (const c of db.closures) c.createdAt = shift(c.createdAt);
  for (const a of db.activity) a.at = shift(a.at);
  for (const a of db.accounts) a.createdAt = shift(a.createdAt);
  for (const s of db.shortlists) if (s.createdAt) s.createdAt = shift(s.createdAt);
  for (const c of db.cards) if (c.stateAt) c.stateAt = shift(c.stateAt);
  for (const r of db.responses) if (r.steppedBack) r.steppedBack.at = shift(r.steppedBack.at);
}

function freshDB(): DB {
  const db = structuredClone(seed) as DB;
  const now = Date.now();
  shiftSeedIntoPast(db);
  addRelativeSeed(db, now);
  applySchedule(db);
  sweepFollowUps(db, now); // a follow-up window that already ended is closed: only the anonymous snapshot stays
  sweepDeadlines(db, now, "due"); // deadlines already passed in seed history, dated when they passed
  // Start with a clean bell: only activity from now on counts as new.
  const seenAt = new Date(now).toISOString();
  for (const a of db.accounts) a.notificationsSeenAt = seenAt;
  return db;
}

export function resetDB(sandboxId?: string): void {
  const sid = sandboxId || activeSandboxId();
  const db = freshDB();
  const state = getSandboxState(sid);
  state.db = db;
  persist(db, sid);
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function nextPublicCode(db: DB, cardId: string): string {
  const used = new Set(db.responses.filter((r) => r.cardId === cardId).map((r) => r.publicCode));
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let i = 0; i < 500; i++) {
    const code = letters[Math.floor(Math.random() * letters.length)] + (1 + Math.floor(Math.random() * 9));
    if (!used.has(code)) return code;
  }
  let n = used.size + 1;
  while (used.has(`Z${n}`)) n++;
  return `Z${n}`;
}

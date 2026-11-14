import fs from "node:fs";
import path from "node:path";
import { seed } from "@/data/seed";
import type { DB } from "./types";
import { buildSchedule } from "./schedule";

const FILE = path.join(process.cwd(), "data", "db.json");
const memoryOnly = !!process.env.VERCEL;

const g = globalThis as unknown as { __pulmaDB?: DB };

function persist(db: DB) {
  if (memoryOnly) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE);
  } catch {
    // Persistence failure must never break the demo; memory copy remains.
  }
}

export function getDB(): DB {
  if (g.__pulmaDB) return g.__pulmaDB;
  let db: DB | undefined;
  if (!memoryOnly) {
    try {
      db = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
    } catch {
      db = undefined;
    }
  }
  if (db && (!Array.isArray(db.accounts) || !Array.isArray(db.closures) || !Array.isArray(db.activity))) db = undefined; // older db.json: re-seed
  if (!db) {
    db = freshDB();
    persist(db);
  }
  g.__pulmaDB = db;
  return db;
}

export function mutate<T>(fn: (db: DB) => T): T {
  const db = getDB();
  const result = fn(db);
  persist(db);
  return result;
}

/** Write slot times and tables from buildSchedule onto db.meetings. Never throws. */
export function applySchedule(db: DB): void {
  try {
    const { slots } = buildSchedule(db);
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
}

function freshDB(): DB {
  const db = structuredClone(seed) as DB;
  shiftSeedIntoPast(db);
  applySchedule(db);
  // Start with a clean bell: only activity from now on counts as new.
  const now = new Date().toISOString();
  for (const a of db.accounts) a.notificationsSeenAt = now;
  return db;
}

export function resetDB(): void {
  const db = freshDB();
  g.__pulmaDB = db;
  persist(db);
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

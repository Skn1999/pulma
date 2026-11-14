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

function freshDB(): DB {
  const db = structuredClone(seed) as DB;
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

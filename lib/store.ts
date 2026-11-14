import fs from "node:fs";
import path from "node:path";
import { seed } from "@/data/seed";
import type { DB } from "./types";

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
  if (!db) {
    db = structuredClone(seed) as DB;
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

export function resetDB(): void {
  const db = structuredClone(seed) as DB;
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

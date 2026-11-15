import type { DB } from "./types";

/**
 * Shared copy of the demo store for hosting. Vercel runs the app as several server instances that share no memory,
 * so each sandbox JSON store is mirrored in Upstash Redis (plain fetch, no SDK). Each instance keeps its in-memory
 * copy and only re-reads the blob when the small version key has changed. Last write wins: fine for synthetic demo
 * data. Without the env vars (local dev, tests) this is switched off and the local store is used.
 */
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PREFIX = process.env.PULMA_STORE_KEY || "pulma";
const SANDBOX_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export function remoteEnabled(): boolean {
  return !!URL_ && !!TOKEN;
}

function keysFor(sandboxId: string = "default") {
  const sid = sandboxId || "default";
  return {
    keyVer: sid === "default" ? `${PREFIX}:ver` : `${PREFIX}:${sid}:ver`,
    keyDb: sid === "default" ? `${PREFIX}:db` : `${PREFIX}:${sid}:db`,
  };
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return ((await res.json()) as { result: unknown }).result;
}

/** "same" when our version is current, "empty" when nothing is stored yet, null on any failure. */
export async function pullRemote(
  localVer: string | undefined,
  sandboxId: string = "default",
): Promise<{ db: DB; ver: string } | "same" | "empty" | null> {
  const { keyVer, keyDb } = keysFor(sandboxId);
  try {
    const ver = (await cmd(["GET", keyVer])) as string | null;
    if (!ver) return "empty";
    if (ver === localVer) return "same";
    const raw = (await cmd(["GET", keyDb])) as string | null;
    if (!raw) return "empty";
    const parsed = JSON.parse(raw) as { ver: string; db: DB };
    return { db: parsed.db, ver: parsed.ver };
  } catch {
    return null;
  }
}

/** Blob first (carrying its version), then the version key, so a reader never pairs a new version with old data. */
export async function pushRemote(
  db: DB,
  ver: string,
  sandboxId: string = "default",
): Promise<void> {
  const { keyVer, keyDb } = keysFor(sandboxId);
  try {
    const ttlArgs = sandboxId !== "default" ? ["EX", SANDBOX_TTL_SECONDS] : [];
    await cmd(["SET", keyDb, JSON.stringify({ ver, db }), ...ttlArgs]);
    await cmd(["SET", keyVer, ver, ...ttlArgs]);
  } catch {
    // The local copy stays authoritative for this instance; the next write tries again.
  }
}

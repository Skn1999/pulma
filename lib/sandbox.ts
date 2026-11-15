import { AsyncLocalStorage } from "node:async_hooks";
import { cookies, headers } from "next/headers";
import { SANDBOX_COOKIE } from "./sandbox-constants";

export * from "./sandbox-constants";

/** AsyncLocalStorage isolates the active sandbox per async execution / request.
 * Attached to globalThis to ensure a single singleton across Turbopack module chunks.
 */
const g = globalThis as unknown as { __pulmaSandboxStorage?: AsyncLocalStorage<string> };
export const sandboxStorage: AsyncLocalStorage<string> = (g.__pulmaSandboxStorage ??= new AsyncLocalStorage<string>());

/** Validate and sanitize sandbox identifiers to prevent injection or invalid Redis keys. */
export function cleanSandboxId(raw: string | null | undefined): string {
  if (!raw) return "default";
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  return cleaned || "default";
}

/** Generate a random sandbox ID: "sbx_k7f9a2". */
export function newSandboxId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-2);
  return `sbx_${rand}${time}`;
}

/** The active sandbox ID for the current async call stack, falling back to Next.js request cookies or "default". */
export function activeSandboxId(): string {
  const store = sandboxStorage.getStore();
  if (store) return store;

  try {
    // Read synchronous request store from Next.js runtime if available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { workUnitAsyncStorage } = require("next/dist/server/app-render/work-unit-async-storage.external");
    const reqStore = workUnitAsyncStorage?.getStore?.();
    const val = reqStore?.cookies?.get?.(SANDBOX_COOKIE)?.value;
    if (val) return cleanSandboxId(val);
  } catch {
    // Outside Next.js request context (tests, seed scripts)
  }

  return "default";
}

/** Enter the sandbox context for the current async call chain. */
export function enterSandbox(sandboxId: string): void {
  const clean = cleanSandboxId(sandboxId);
  sandboxStorage.enterWith(clean);
}

/** Safely read the sandbox cookie or header from Next.js (returns "default" in tests or non-request contexts). */
export async function getRequestSandboxId(): Promise<string> {
  try {
    const hdrs = await headers();
    const fromHdr = hdrs.get("x-pulma-sandbox");
    if (fromHdr) return cleanSandboxId(fromHdr);

    const jar = await cookies();
    const val = jar.get(SANDBOX_COOKIE)?.value;
    return cleanSandboxId(val);
  } catch {
    return "default";
  }
}

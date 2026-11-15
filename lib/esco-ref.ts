// Tiny, import-safe helpers for ESCO links (no data file, so client components may import this).
import type { EscoRef } from "./types";

export const ESCO_ATTRIBUTION = "Skills data: ESCO, European Commission";
export const ESCO_URI_PREFIX = "http://data.europa.eu/esco/skill/";

/** Validates an {uri, label} from a request body. Only real-looking ESCO skill uris pass. */
export function parseEscoRef(v: unknown): EscoRef | undefined {
  const o = v as { uri?: unknown; label?: unknown } | null;
  if (!o || typeof o.uri !== "string" || typeof o.label !== "string") return undefined;
  const label = o.label.trim().slice(0, 80);
  if (!o.uri.startsWith(ESCO_URI_PREFIX) || o.uri.length > 120 || !label) return undefined;
  return { uri: o.uri, label };
}

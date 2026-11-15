import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { extractSkills } from "@/lib/ai";
import { MAX_CV_CHARS } from "@/lib/skills";
import { bestEscoMatch } from "@/lib/esco";
import type { EscoRef } from "@/lib/types";

// Talent only. The CV text is used for this one call: it is never stored, logged or written to activity.
export async function POST(req: Request) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  const text = b && typeof b.text === "string" ? b.text : "";
  if (!text.trim()) return NextResponse.json({ error: "Paste some CV text first." }, { status: 400 });
  if (text.length > MAX_CV_CHARS) return NextResponse.json({ error: `That is too long. Paste up to ${MAX_CV_CHARS.toLocaleString("en")} characters.` }, { status: 400 });
  const have = new Set((getDB().talents.find((t) => t.id === acc.talentId)?.skills ?? []).map((s) => s.label.toLowerCase()));
  const r = await extractSkills(text);
  const suggestions = r.suggestions.filter((s) => !have.has(s.toLowerCase()));
  // Only the short skill labels (never the CV text) go to ESCO. The person still accepts each skill.
  const esco: Record<string, EscoRef> = {};
  await Promise.all(suggestions.map(async (s) => {
    const m = await bestEscoMatch(s);
    if (m) esco[s] = m;
  }));
  return NextResponse.json({ suggestions, esco, fallback: r.fallback });
}

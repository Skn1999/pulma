import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { parseSkillsInput } from "@/lib/skills";

// Talent only. Skills are private: this is the only place they are written, and nothing else reads them out.
export async function PUT(req: Request) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const body = await req.json().catch(() => null);
  const now = new Date().toISOString();
  const parsed = parseSkillsInput(body, getDB().talents.find((t) => t.id === acc.talentId)?.skills, now);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  mutate((db) => {
    const t = db.talents.find((x) => x.id === acc.talentId);
    if (t) t.skills = parsed.skills.length ? parsed.skills : undefined;
  });
  return NextResponse.json({ skills: parsed.skills });
}

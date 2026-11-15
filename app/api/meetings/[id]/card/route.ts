import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, loadDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { cardViewerSide, eventCardFor, parseCardSkills } from "@/lib/meet-card";

// Talent only. Choose up to 3 of your own skills to show on the event-day card. Nothing else is writable here.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const { id } = await ctx.params;
  const db = await loadDB();
  if (cardViewerSide(db, acc, id) !== "talent") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const card = eventCardFor(db, id, nowMs());
  if (!card) return NextResponse.json({ error: "There is no event card for this meeting" }, { status: 409 });
  if (card.expired) return NextResponse.json({ error: "This card has expired" }, { status: 409 });
  const body = await req.json().catch(() => null);
  const own = (db.talents.find((t) => t.id === acc.talentId)?.skills ?? []).map((s) => s.label);
  const parsed = parseCardSkills(body, own);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  mutate((d) => {
    const m = d.meetings.find((x) => x.id === id);
    if (m) m.cardSkills = parsed.skills.length ? parsed.skills : undefined;
  });
  return NextResponse.json({ skills: parsed.skills });
}

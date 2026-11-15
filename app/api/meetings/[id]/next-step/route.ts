import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { mutate } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { nowMs } from "@/lib/clock";
import { isFinal, isMutual, isPastBy, nextStepWindow, validBy } from "@/lib/follow-up";
import { NEXT_STEP_KINDS, NEXT_STEP_NOTE_MAX, type NextStepKind } from "@/lib/types";

/** The company promises what happens next after a mutual "next step", and by when. Re-planning is allowed. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const a = meetingAccess(acc, id, "company");
  if (a instanceof NextResponse) return a;
  const b = (await req.json().catch(() => null)) as { kind?: unknown; by?: unknown; note?: unknown } | null;
  const now = nowMs();
  if (!b || !(NEXT_STEP_KINDS as unknown[]).includes(b.kind)) return NextResponse.json({ error: "Pick what happens next" }, { status: 400 });
  if (!validBy(b.by, now)) {
    const w = nextStepWindow(now);
    return NextResponse.json({ error: `Pick a date between ${w.min} and ${w.max}` }, { status: 400 });
  }
  const note = typeof b.note === "string" ? b.note.trim() : "";
  if (note.length > NEXT_STEP_NOTE_MAX) return NextResponse.json({ error: `Keep the note under ${NEXT_STEP_NOTE_MAX} characters` }, { status: 400 });
  const kind = b.kind as NextStepKind;
  const by = b.by;

  return mutate((db) => {
    const m = db.meetings.find((x) => x.id === id);
    if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!isMutual(db, m.id)) return NextResponse.json({ error: "A next step can be planned once you both chose Next step" }, { status: 409 });
    if (isFinal(m.outcome)) return NextResponse.json({ error: "This one is already closed" }, { status: 409 });
    const card = db.cards.find((c) => c.id === m.cardId);
    const resp = db.responses.find((r) => r.id === m.responseId);
    if (!card || !resp) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const at = new Date(now).toISOString();
    const prev = m.nextStep;
    m.nextStep = {
      kind,
      by,
      ...(note ? { note } : {}),
      plannedAt: prev?.plannedAt ?? at,
      ...(prev ? { updatedAt: at } : {}),
      ...(prev?.missed || (prev && isPastBy(prev, now)) ? { missed: true } : {}),
    };
    if (m.outcome?.kind === "still_talking") delete m.outcome; // a fresh plan reopens it as planned
    logActivity(db, { kind: "next_step_planned", actor: "company", at, cardId: card.id, companyId: card.companyId, responseId: resp.id, talentId: resp.talentId });
    return NextResponse.json({ nextStep: m.nextStep });
  });
}

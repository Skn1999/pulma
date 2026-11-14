import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, newId } from "@/lib/store";
import { logActivity } from "@/lib/activity";

export async function POST(req: Request) {
  const account = await apiAccount();
  if (account instanceof NextResponse) return account;
  if (account.role === "organiser") {
    return NextResponse.json({ error: "Only company and talent accounts can answer" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as { meetingId?: unknown; outcome?: unknown } | null;
  const meetingId = typeof body?.meetingId === "string" ? body.meetingId : "";
  const outcome = body?.outcome;
  if (outcome !== "next-step" && outcome !== "not-now") {
    return NextResponse.json({ error: "Outcome must be next-step or not-now" }, { status: 400 });
  }
  const side = account.role as "company" | "talent";

  return mutate((db) => {
    const meeting = db.meetings.find((m) => m.id === meetingId);
    if (!meeting) return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    const card = db.cards.find((c) => c.id === meeting.cardId);
    const response = db.responses.find((r) => r.id === meeting.responseId);
    const owns =
      side === "company"
        ? !!card && !!account.companyId && card.companyId === account.companyId
        : !!response && !!account.talentId && response.talentId === account.talentId;
    if (!owns) return NextResponse.json({ error: "This is not your meeting" }, { status: 403 });

    const wasMutual = (() => {
      const mine = db.feedback.find((f) => f.meetingId === meetingId && f.side === side);
      const theirs = db.feedback.find((f) => f.meetingId === meetingId && f.side !== side);
      return mine?.outcome === "next-step" && theirs?.outcome === "next-step";
    })();
    const existing = db.feedback.find((f) => f.meetingId === meetingId && f.side === side);
    if (existing) {
      existing.outcome = outcome;
      delete existing.note;
    } else {
      db.feedback.push({ id: newId("fb"), meetingId, side, outcome });
    }
    const other = db.feedback.find((f) => f.meetingId === meetingId && f.side !== side);
    const mutual = outcome === "next-step" && other?.outcome === "next-step";
    if (mutual && !wasMutual && card && response) {
      logActivity(db, { kind: "mutual_next_step", actor: side, cardId: card.id, companyId: card.companyId, responseId: response.id, talentId: response.talentId });
    }
    const out: { outcome: typeof outcome; mutual: boolean; talentEmail?: string } = { outcome, mutual };
    if (mutual && side === "company" && response) {
      out.talentEmail = db.talents.find((t) => t.id === response.talentId)?.email;
    }
    return NextResponse.json(out);
  });
}

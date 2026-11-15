import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate, newId, loadDB } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { eventById } from "@/lib/events";
import { eventStage, seatsLeft } from "@/lib/participation";
import { nowMs } from "@/lib/clock";
import type { Participation } from "@/lib/types";

const NOTE_MAX = 300;

/** Organiser invites companies to an event. Companies already invited or confirmed are skipped. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db0 = await loadDB();
  const ev0 = eventById(db0, id);
  if (!ev0) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const stage = eventStage(ev0, nowMs());
  if (stage !== "draft" && stage !== "open") return NextResponse.json({ error: "This event no longer takes invitations." }, { status: 409 });
  const b = (await req.json().catch(() => null)) as { companyIds?: unknown; note?: unknown } | null;
  const ids = Array.isArray(b?.companyIds) ? [...new Set(b.companyIds.filter((x): x is string => typeof x === "string"))] : [];
  if (ids.length === 0) return NextResponse.json({ error: "Pick at least one company." }, { status: 400 });
  if (ids.some((c) => !db0.companies.some((x) => x.id === c))) return NextResponse.json({ error: "Unknown company" }, { status: 400 });
  const note = typeof b?.note === "string" ? b.note.trim() : "";
  if (note.length > NOTE_MAX) return NextResponse.json({ error: `Keep the message to ${NOTE_MAX} characters.` }, { status: 400 });

  // A declined or withdrawn company may be invited again; invited and confirmed ones are skipped.
  const fresh = ids.filter((c) => !db0.participations.some((p) => p.eventId === id && p.companyId === c && (p.status === "invited" || p.status === "confirmed")));
  if (fresh.length === 0) return NextResponse.json({ error: "Those companies are already invited." }, { status: 409 });
  if (fresh.length > seatsLeft(db0, id)) {
    return NextResponse.json({ error: `Full: ${seatsLeft(db0, id)} table${seatsLeft(db0, id) === 1 ? "" : "s"} left for ${fresh.length} invitation${fresh.length === 1 ? "" : "s"}.` }, { status: 409 });
  }
  const created = mutate((db) => {
    const at = new Date().toISOString();
    const out: Participation[] = [];
    for (const companyId of fresh) {
      let p = db.participations.find((x) => x.eventId === id && x.companyId === companyId);
      if (p) {
        // Re-invite: reuse the row.
        p.status = "invited";
        p.invitedAt = at;
        delete p.respondedAt;
        delete p.table;
        if (note) p.note = note;
        else delete p.note;
      } else {
        p = { id: newId("pa"), eventId: id, companyId, status: "invited", invitedAt: at, ...(note ? { note } : {}) };
        db.participations.push(p);
      }
      logActivity(db, { kind: "event_invited", actor: "organiser", cardId: "", companyId, eventId: id, at });
      out.push(p);
    }
    return out;
  });
  return NextResponse.json(created, { status: 201 });
}

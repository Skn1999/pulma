import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { eventById } from "@/lib/events";
import { closeFollowUp, followUpState } from "@/lib/outcomes";
import { nowMs } from "@/lib/clock";

/** Organiser only: close the follow-up window now. Keeps the anonymous snapshot, deletes the event's personal data. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const ev = eventById(getDB(), id);
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const now = nowMs();
  const state = followUpState(ev, now);
  if (state === "final") return NextResponse.json({ error: "This follow-up is already closed." }, { status: 409 });
  if (state === "before") return NextResponse.json({ error: "The event has not happened yet." }, { status: 409 });
  mutate((db) => closeFollowUp(db, id, now));
  return NextResponse.json({ ok: true });
}

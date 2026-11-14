import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { eventById } from "@/lib/events";
import { canMoveStage, eventStage } from "@/lib/participation";
import { nowMs } from "@/lib/clock";
import type { EventStage } from "@/lib/types";

const STAGES: EventStage[] = ["draft", "open", "locked", "done"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Organiser only: move the event along its stages, change the problem deadline or the description. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const ev0 = eventById(getDB(), id);
  if (!ev0) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const now = nowMs();

  let stage: EventStage | undefined;
  if (b.stage !== undefined) {
    if (typeof b.stage !== "string" || !STAGES.includes(b.stage as EventStage)) return NextResponse.json({ error: "Unknown stage" }, { status: 400 });
    stage = b.stage as EventStage;
    const from = eventStage(ev0, now);
    if (stage !== from && !canMoveStage(from, stage, ev0, now)) {
      return NextResponse.json({ error: `An event can't move from ${from} to ${stage}.` }, { status: 409 });
    }
  }
  let problemDeadline: string | undefined;
  if (b.problemDeadline !== undefined) {
    const d = typeof b.problemDeadline === "string" ? b.problemDeadline.trim() : "";
    if (!DATE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) return NextResponse.json({ error: "Pick a valid problem deadline." }, { status: 400 });
    if (d > ev0.date) return NextResponse.json({ error: "The problem deadline can't be after the event." }, { status: 400 });
    problemDeadline = d;
  }
  let description: string | undefined;
  if (b.description !== undefined) {
    description = typeof b.description === "string" ? b.description.trim() : "";
    if (description.length > 400) return NextResponse.json({ error: "Keep the description to 400 characters." }, { status: 400 });
  }
  const updated = mutate((db) => {
    const ev = eventById(db, id)!;
    if (stage) ev.stage = stage;
    if (problemDeadline) ev.problemDeadline = problemDeadline;
    if (description !== undefined) {
      if (description) ev.description = description;
      else delete ev.description;
    }
    return ev;
  });
  return NextResponse.json(updated);
}

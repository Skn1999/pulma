import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";
import { sortedEvents } from "@/lib/events";
import { parseEventInput } from "@/lib/event-input";
import { nowMs } from "@/lib/clock";
import type { Event } from "@/lib/types";

export async function GET() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  return NextResponse.json(sortedEvents(getDB()));
}

export async function POST(req: Request) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const body = await req.json().catch(() => null);
  const parsed = parseEventInput(body, nowMs());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const ev: Event = { id: newId("ev"), ...parsed.event, slotMinutes: 10, createdAt: new Date().toISOString() };
  mutate((db) => {
    db.events.push(ev);
  });
  return NextResponse.json(ev, { status: 201 });
}

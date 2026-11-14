import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";
import { addMinutesLocal, localNow } from "@/lib/slots";
import type { Availability } from "@/lib/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):(00|30)$/;

export async function GET() {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const windows = getDB()
    .availability.filter((w) => w.companyId === acc.companyId)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  return NextResponse.json({ windows });
}

export async function POST(req: Request) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || (b.mode !== "office" && b.mode !== "video")) return NextResponse.json({ error: "mode must be office or video" }, { status: 400 });
  if (typeof b.date !== "string" || !DATE.test(b.date) || Number.isNaN(Date.parse(`${b.date}T12:00:00Z`))) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (typeof b.from !== "string" || typeof b.to !== "string" || !TIME.test(b.from) || !TIME.test(b.to)) {
    return NextResponse.json({ error: "Times must be on the hour or half hour" }, { status: 400 });
  }
  if (b.from >= b.to) return NextResponse.json({ error: "The start must be before the end" }, { status: 400 });
  const start = `${b.date}T${b.from}:00`;
  const end = `${b.date}T${b.to}:00`;
  if (end > addMinutesLocal(start, 600)) return NextResponse.json({ error: "A window can be at most 10 hours" }, { status: 400 });
  if (end <= localNow(Date.now())) return NextResponse.json({ error: "That window is in the past" }, { status: 400 });
  const w: Availability = { id: newId("av"), companyId: acc.companyId ?? "", mode: b.mode, start, end };
  mutate((db) => { db.availability.push(w); });
  return NextResponse.json({ window: w }, { status: 201 });
}

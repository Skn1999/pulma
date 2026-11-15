import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { loadDB } from "@/lib/store";
import { eventById } from "@/lib/events";
import { eventOutcomes, followUpState, reportCsv } from "@/lib/outcomes";
import { nowMs } from "@/lib/clock";

/** Organiser only: the anonymous outcome figures as CSV (metric,value). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const db = await loadDB();
  const ev = eventById(db, id);
  if (!ev) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const report = followUpState(ev, nowMs()) === "final" && ev.report ? ev.report : eventOutcomes(db, id, nowMs());
  return new NextResponse(reportCsv(ev, report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outcomes-${id}.csv"`,
    },
  });
}

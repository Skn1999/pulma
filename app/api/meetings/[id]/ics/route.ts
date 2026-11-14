import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { eventOfMeeting } from "@/lib/events";
import { meetingEnd, meetingMode, meetingStatus } from "@/lib/slots";

const stamp = (local: string) => local.replace(/[-:]/g, "").slice(0, 15); // 2026-11-18T14:00:00 → 20261118T140000
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ error: "Not available to organisers" }, { status: 403 });
  const { id } = await params;
  const a = meetingAccess(acc, id);
  if (a instanceof NextResponse) return a;
  const { db, meeting: m } = a;
  if (meetingStatus(m) !== "booked" || !m.slotStart) return NextResponse.json({ error: "This meeting has no time yet" }, { status: 409 });
  const card = db.cards.find((c) => c.id === m.cardId);
  const location = meetingMode(m) === "event" ? `Table ${m.table}, ${eventOfMeeting(db, m).name}, ${eventOfMeeting(db, m).venue}` : (m.place ?? "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pulma//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${m.id}@pulma.example`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Helsinki:${stamp(m.slotStart)}`,
    `DTEND;TZID=Europe/Helsinki:${stamp(meetingEnd(db, m))}`,
    `SUMMARY:${esc(`Pulma: ${card?.title ?? "Meeting"}`)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pulma-meeting-${m.id}.ics"`,
    },
  });
}

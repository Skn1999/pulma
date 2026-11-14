import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getDB } from "@/lib/store";
import { requireAccount } from "@/lib/session";
import { nowMs } from "@/lib/clock";
import { PageTitle } from "@/components/shell/page-title";
import { AvailabilityEditor } from "@/components/meetings/availability-editor";
import { localNow, meetingEnd, meetingMode, meetingStatus } from "@/lib/slots";
import { localSlotLabel } from "@/lib/promise-text";
import { MEET_MODE_LABEL } from "@/lib/types";
import { eventOfMeeting, tablePlace } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function CompanyMeetingsPage() {
  const acc = await requireAccount("company");
  const db = getDB();
  const nowLocal = localNow(nowMs());
  const windows = db.availability
    .filter((w) => w.companyId === acc.companyId && w.end > nowLocal)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const cardIds = new Map(db.cards.filter((c) => c.companyId === acc.companyId).map((c) => [c.id, c]));
  const rows = db.meetings
    .filter((m) => cardIds.has(m.cardId) && meetingStatus(m) !== "cancelled")
    .map((m) => {
      const r = db.responses.find((x) => x.id === m.responseId);
      const t = db.talents.find((x) => x.id === r?.talentId);
      return { m, r, name: t?.displayName ?? "Someone", card: cardIds.get(m.cardId)!, status: meetingStatus(m), mode: meetingMode(m) };
    })
    .sort((a, b) => {
      if (!!a.m.slotStart !== !!b.m.slotStart) return a.m.slotStart ? -1 : 1;
      return a.m.slotStart < b.m.slotStart ? -1 : a.m.slotStart > b.m.slotStart ? 1 : 0;
    });

  return (
    <>
      <PageTitle title="Meetings" subtitle="Free windows for office and video meetings, and everyone you are meeting." />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-4 sm:px-6">
        <section aria-labelledby="avail-h">
          <h2 id="avail-h" className="mb-3 font-display text-lg font-semibold">Your free windows</h2>
          <AvailabilityEditor
            today={nowLocal.slice(0, 10)}
            windows={windows.map((w) => ({ id: w.id, mode: w.mode, start: w.start, end: w.end }))}
          />
        </section>
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="mb-3 font-display text-lg font-semibold">Meetings</h2>
          {rows.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" /> No meetings yet. They appear here once someone accepts your invite.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {rows.map(({ m, r, name, card, status, mode }) => (
                <li key={m.id}>
                  <Link
                    href={`/company/card/${card.id}?r=${r?.id ?? ""}`}
                    className="flex min-h-14 flex-col gap-0.5 px-4 py-2.5 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    <span className="font-medium">
                      {name} <span className="font-normal text-muted-foreground">· Response #{r?.publicCode} · {card.title}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {MEET_MODE_LABEL[mode]} ·{" "}
                      {status === "booked" && m.slotStart
                        ? mode === "event" && m.table
                          ? `${tablePlace(eventOfMeeting(db, m), m.table)} · ${m.slotStart.slice(11, 16)}–${meetingEnd(db, m).slice(11, 16)}`
                          : `${localSlotLabel(m.slotStart)}–${meetingEnd(db, m).slice(11, 16)}`
                        : status === "reschedule"
                          ? "Waiting for them to pick a new time"
                          : "Waiting for them to pick a time"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

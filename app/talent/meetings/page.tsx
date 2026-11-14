import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getDB } from "@/lib/store";
import { requireAccount } from "@/lib/session";
import { PageTitle } from "@/components/shell/page-title";
import { meetingEnd, meetingMode, meetingStatus } from "@/lib/slots";
import { localSlotLabel } from "@/lib/promise-text";
import { MEET_MODE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TalentMeetingsPage() {
  const acc = await requireAccount("talent");
  const db = getDB();
  const mine = new Map(db.responses.filter((r) => r.talentId === acc.talentId).map((r) => [r.id, r]));
  const rows = db.meetings
    .filter((m) => mine.has(m.responseId))
    .map((m) => {
      const card = db.cards.find((c) => c.id === m.cardId);
      const company = db.companies.find((c) => c.id === card?.companyId);
      return { m, card, company, status: meetingStatus(m), mode: meetingMode(m) };
    })
    .sort((a, b) => {
      const need = (x: typeof a) => (x.status === "pending" || x.status === "reschedule" ? 0 : x.status === "booked" ? 1 : 2);
      if (need(a) !== need(b)) return need(a) - need(b);
      return a.m.slotStart < b.m.slotStart ? -1 : a.m.slotStart > b.m.slotStart ? 1 : 0;
    });

  return (
    <>
      <PageTitle title="Meetings" subtitle="Every meeting you have accepted, by date." />
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-4 sm:px-6">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-display text-xl">No meetings yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">When you accept an invite, the meeting shows up here.</p>
            <Link href="/talent/inbox" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Go to your invites</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ m, card, company, status, mode }) => {
              const needsPick = status === "pending" || status === "reschedule";
              return (
                <li key={m.id} className="rounded-xl border bg-card p-4">
                  <p className="font-medium">{company?.name}</p>
                  <p className="text-sm text-muted-foreground">{card?.title}</p>
                  <p className="mt-2 flex items-center gap-2 text-sm">
                    <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                    <span>
                      {MEET_MODE_LABEL[mode]} ·{" "}
                      {status === "booked" && m.slotStart
                        ? `${m.table ? `Table ${m.table} · ` : ""}${localSlotLabel(m.slotStart)}–${meetingEnd(db, m).slice(11, 16)}`
                        : status === "booked" ? "Event day, time is set for you"
                        : status === "cancelled" ? "Cancelled"
                        : status === "reschedule" ? "Needs a new time" : "Needs a time"}
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/talent/answers/${m.responseId}`}
                      className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
                    >
                      {needsPick ? "Pick a time" : "Open"}
                    </Link>
                    {mode === "event" && status === "booked" && (
                      <Link href="/event" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring">
                        See my event day
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

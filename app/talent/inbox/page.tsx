import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { Clock, Hourglass } from "lucide-react";
import { loadDB } from "@/lib/store";
import { goalOf, inviteStatus } from "@/lib/deadlines";
import { MEET_MODE_LABEL } from "@/lib/types";
import { shortDate } from "@/lib/next-steps";
import { getTalentId } from "@/lib/persona";
import { eventDay, eventLabel, eventOf, tablePlace } from "@/lib/events";
import { PageTitle } from "@/components/shell/page-title";
import { InviteActions, InviteMessage } from "@/components/talent/invite-actions";

export const dynamic = "force-dynamic";

function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(new Date(iso));
}

export default async function InboxPage() {
  const db = await loadDB();
  const talentId = await getTalentId();
  const mine = new Map(db.responses.filter((r) => r.talentId === talentId).map((r) => [r.id, r]));
  const now = nowMs();
  const items = db.shortlists
    .filter((s) => mine.has(s.responseId))
    .map((s) => {
      const resp = mine.get(s.responseId)!;
      const card = db.cards.find((c) => c.id === s.cardId);
      const company = db.companies.find((c) => c.id === card?.companyId);
      const meeting = db.meetings.find((m) => m.responseId === s.responseId && m.cardId === s.cardId);
      const inv = inviteStatus(db, s, now);
      const ev = card ? eventOf(db, card) : undefined;
      return { s, resp, card, company, meeting, inv, ev };
    })
    .sort((a, b) => Number(b.s.status === "invited" && !b.inv.expired) - Number(a.s.status === "invited" && !a.inv.expired));

  return (
    <>
      <PageTitle title="Invites" subtitle="Your name is shared only if you accept." />
      <div className="space-y-3 px-4 py-3 sm:px-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No invitations yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">When a company wants to meet you, it will show up here.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Explore problems
            </Link>
          </div>
        ) : (
          items.map(({ s, resp, card, company, meeting, inv, ev }) => (
            <article
              key={s.id}
              className={`mx-auto max-w-xl rounded-xl border border-border p-4 ${s.status === "declined" || inv.expired ? "bg-muted text-muted-foreground" : "bg-card"}`}
            >
              <p className="text-xs text-muted-foreground">
                {s.status === "declined" ? "Declined" : <><span className="font-medium text-foreground">{company?.name}</span> · {company?.sector}</>}
              </p>
              <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{card?.title}</h2>
              {ev && <p className="mt-1 text-xs font-medium text-primary">{eventLabel(ev)}</p>}
              <p className="mt-1 text-sm">Your answer: Response #{resp.publicCode}</p>

              {s.message && (s.status === "invited" || s.status === "accepted") && (
                <InviteMessage message={s.message} companyName={company?.name ?? "the company"} />
              )}

              {s.status === "invited" && inv.expired && (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
                  <Hourglass className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    This invite expired on {shortDate(inv.respondBy)}. Nothing was shared. {company?.name} can open it again if they still want to talk.
                  </span>
                </p>
              )}
              {s.status === "invited" && !inv.expired && (
                <div className="mt-3">
                  <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
                    <Clock className="size-4" aria-hidden="true" /> Reply by {shortDate(inv.respondBy)}
                  </p>
                  <p className="mb-3 text-sm">
                    {card && goalOf(card, db).meetModes.length === 1 && goalOf(card, db).meetModes[0] === "event"
                      ? `They'd like a 10-minute conversation at their table at ${ev?.name ?? "the event"}, ${ev ? eventDay(ev.date) : "on the event day"}.`
                      : `They'd like a conversation. You pick the time: ${card ? goalOf(card, db).meetModes.map((m) => MEET_MODE_LABEL[m].toLowerCase()).join(", ") : ""}.`}{" "}
                    Accepting shares your name with {company?.name}.
                  </p>
                  <InviteActions shortlistId={s.id} responseId={s.responseId} companyName={company?.name ?? "the company"} />
                </div>
              )}
              {s.status === "accepted" && (
                <div className="mt-3 rounded-lg border border-primary/40 bg-accent p-3 text-accent-foreground">
                  <p className="font-semibold">You&apos;ll meet {company?.name}</p>
                  <p className="mt-1 text-sm">
                    {meeting?.slotStart
                      ? meeting.table && ev
                        ? `${tablePlace(ev, meeting.table)} · ${meeting.slotStart.slice(11, 16)}`
                        : `Table ${meeting.table} · ${when(meeting.slotStart)}`
                      : "Time being scheduled"}
                  </p>
                  <Link href={`/event?event=${ev?.id ?? ""}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
                    Open My day
                  </Link>
                </div>
              )}
              {s.status === "declined" && <p className="mt-2 text-sm">You declined. Nothing was shared.</p>}
            </article>
          ))
        )}
      </div>
    </>
  );
}

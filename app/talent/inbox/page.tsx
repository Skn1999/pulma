import Link from "next/link";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { PageHeader } from "@/components/page-header";
import { InviteActions } from "@/components/talent/invite-actions";

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
  const db = getDB();
  const talentId = await getTalentId();
  const mine = new Map(db.responses.filter((r) => r.talentId === talentId).map((r) => [r.id, r]));
  const items = db.shortlists
    .filter((s) => mine.has(s.responseId))
    .map((s) => {
      const resp = mine.get(s.responseId)!;
      const card = db.cards.find((c) => c.id === s.cardId);
      const company = db.companies.find((c) => c.id === card?.companyId);
      const meeting = db.meetings.find((m) => m.responseId === s.responseId && m.cardId === s.cardId);
      return { s, resp, card, company, meeting };
    })
    .sort((a, b) => (a.s.status === "invited" ? -1 : 0) - (b.s.status === "invited" ? -1 : 0));

  return (
    <main id="main">
      <PageHeader
        title="Your inbox"
        subtitle="Companies pick answers without seeing who wrote them. Your name is shared only if you accept."
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 sm:px-6">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No invitations yet.</p>
            <p className="mt-2 text-muted-foreground">When a company wants to meet you, it will show up here.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Browse problems
            </Link>
          </div>
        ) : (
          items.map(({ s, resp, card, company, meeting }) => (
            <article
              key={s.id}
              className={`rounded-lg border border-border p-5 ${s.status === "declined" ? "bg-muted text-muted-foreground" : "bg-card"}`}
            >
              <p className="text-sm text-muted-foreground">
                {s.status === "invited" ? (
                  <>
                    <span className="font-medium text-foreground">{company?.name}</span> · {company?.sector}
                  </>
                ) : s.status === "accepted" ? (
                  <>
                    {company?.name} · {company?.sector}
                  </>
                ) : (
                  "Declined"
                )}
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">{card?.title}</h2>
              <p className="mt-1 text-sm">Your answer: Response #{resp.publicCode}</p>

              {s.status === "invited" && (
                <div className="mt-4">
                  <p className="mb-3 text-sm">
                    They would like a 10-minute conversation. Accepting shares your name with {company?.name}.
                  </p>
                  <InviteActions shortlistId={s.id} />
                </div>
              )}
              {s.status === "accepted" && (
                <div className="mt-4 rounded-md border border-primary/40 bg-accent p-4 text-accent-foreground">
                  <p className="font-semibold">You&apos;ll meet {company?.name}</p>
                  <p className="mt-1 text-sm">
                    {meeting?.slotStart
                      ? `Table ${meeting.table} · ${when(meeting.slotStart)}`
                      : "Time being scheduled"}
                  </p>
                  <Link
                    href="/event?talent=me"
                    className="mt-2 inline-flex min-h-11 items-center underline underline-offset-4"
                  >
                    See your day
                  </Link>
                </div>
              )}
              {s.status === "declined" && <p className="mt-3 text-sm">You declined. Nothing was shared.</p>}
            </article>
          ))
        )}
      </div>
    </main>
  );
}

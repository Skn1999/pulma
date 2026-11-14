import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { PageTitle } from "@/components/shell/page-title";
import { StatusTrack, type TrackStage } from "@/components/talent/status-track";

export const dynamic = "force-dynamic";

export default async function AnswersPage() {
  const db = getDB();
  const talentId = await getTalentId();
  const mine = db.responses.filter((r) => r.talentId === talentId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageTitle title="My answers" subtitle="Where each of your answers stands." />
      <div className="px-4 py-3 sm:px-6">
        {mine.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No answers yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Pick a problem and tell the company how you&apos;d approach it.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Explore problems
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {mine.map((r) => {
              const card = db.cards.find((c) => c.id === r.cardId);
              const company = db.companies.find((c) => c.id === card?.companyId);
              const sl = db.shortlists.find((s) => s.responseId === r.id);
              const meeting = db.meetings.find((m) => m.responseId === r.id && m.slotStart);
              let stage: TrackStage = 0;
              if (sl) stage = 2;
              if (sl?.status === "accepted" && meeting) stage = 3;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <Link href={`/talent/card/${r.cardId}`} className="group flex items-start gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-muted-foreground">{company?.name} · Response #{r.publicCode}</span>
                      <span className="mt-0.5 block font-display text-lg font-semibold leading-snug">{card?.title}</span>
                    </span>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                  <StatusTrack stage={stage} declined={sl?.status === "declined"} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

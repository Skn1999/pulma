import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { ChevronRight, Lock } from "lucide-react";
import { Hourglass } from "lucide-react";
import { getDB } from "@/lib/store";
import { isOpen, replyStatus } from "@/lib/deadlines";
import { shortDate } from "@/lib/next-steps";
import { getTalentId } from "@/lib/persona";
import { PageTitle } from "@/components/shell/page-title";
import { AnswerActions } from "@/components/talent/answer-actions";
import { StepBack } from "@/components/talent/step-back";
import { StatusTrack, type TrackStage } from "@/components/talent/status-track";

export const dynamic = "force-dynamic";

export default async function AnswersPage() {
  const db = getDB();
  const talentId = await getTalentId();
  const now = nowMs();
  const minDate = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
              const closed = db.closures.some((c) => c.responseId === r.id);
              const meeting = db.meetings.find((m) => m.responseId === r.id && m.slotStart);
              const promise = card && !r.steppedBack && (card.state ?? "open") === "open" ? replyStatus(db, r, now) : undefined;
              let stage: TrackStage = 0;
              if (sl) stage = 2;
              if (sl?.status === "accepted" && meeting) stage = 3;
              return (
                <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                  <Link href={`/talent/answers/${r.id}`} className="group flex items-start gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-muted-foreground">{company?.name} · Response #{r.publicCode}</span>
                      <span className="mt-0.5 block font-display text-lg font-semibold leading-snug">{card?.title}</span>
                    </span>
                    <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                  {r.updatedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Edited {new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  )}
                  {promise?.state === "due" && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Hourglass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {company?.name} promised a reply by {shortDate(promise.due)}
                    </p>
                  )}
                  {promise?.state === "overdue" && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-foreground">
                      <Hourglass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {company?.name} is {promise.daysOver} {promise.daysOver === 1 ? "day" : "days"} past its reply date. You can keep waiting or withdraw.
                    </p>
                  )}
                  {card && (card.state ?? "open") !== "open" && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium">
                      <Hourglass className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {company?.name} {card.state === "filled" ? "closed" : "paused"} this problem{card.stateReason ? `: ${card.stateReason}` : ""}
                    </p>
                  )}
                  <StatusTrack stage={stage} declined={sl?.status === "declined"} closed={closed && !sl} />
                  {sl ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Lock className="size-4" aria-hidden="true" /> Locked — the company shortlisted this answer
                    </p>
                  ) : closed || r.steppedBack || (card && !isOpen(card)) ? <AnswerActions responseId={r.id} cardId={r.cardId} withdrawOnly /> : (
                    <AnswerActions responseId={r.id} cardId={r.cardId} />
                  )}
                  <StepBack responseId={r.id} code={r.publicCode} companyName={company?.name ?? "The company"} minDate={minDate} steppedBack={r.steppedBack} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

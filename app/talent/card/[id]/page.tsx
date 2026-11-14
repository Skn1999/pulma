import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDB } from "@/lib/store";
import { eventLabel, eventOf } from "@/lib/events";
import { ANSWERS_CLOSED, eventTakesAnswers, visibleToCandidates } from "@/lib/participation";
import { cardState, companyRecord, goalOf, isOpen } from "@/lib/deadlines";
import { PromiseBlock } from "@/components/talent/promise";
import { getTalentId } from "@/lib/persona";
import { ProblemCardView } from "@/components/problem-card";
import { CardStateBanner } from "@/components/talent/card-state-banner";
import { AiLabel } from "@/components/ai-label";
import { RelatedSkills } from "@/components/talent/related-skills";
import { relatedSkillLabels } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function TalentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  const mine = db.responses.find((r) => r.cardId === card.id && r.talentId === talentId);
  const locked = !!mine && db.shortlists.some((s) => s.responseId === mine.id);
  // A problem of a draft or finished event is not shown, except to someone who already answered it.
  if (!mine && !visibleToCandidates(eventOf(db, card), nowMs())) notFound();
  const company = db.companies.find((c) => c.id === card.companyId);
  const takesAnswers = eventTakesAnswers(db, card, nowMs());

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-6">
        <Link href="/talent" className="inline-flex min-h-11 items-center gap-1 text-sm text-primary">
          <ChevronLeft className="size-4" aria-hidden="true" /> Explore
        </Link>
        <CardStateBanner state={cardState(card)} companyName={company?.name ?? "The company"} reason={card.stateReason} />
        <p className="mt-3 text-sm font-medium text-primary">{eventLabel(eventOf(db, card))}</p>
        <ProblemCardView card={card} company={company} />
        <RelatedSkills className="mt-4" skills={relatedSkillLabels(db.talents.find((t) => t.id === talentId)?.skills, card.skills)} />
        <PromiseBlock goal={goalOf(card, db)} record={companyRecord(db, card.companyId, nowMs())} />
        {mine && (
          <section aria-labelledby="mine-h" className="mt-6 rounded-xl border border-border bg-card p-4">
            <h2 id="mine-h" className="text-sm font-semibold">Your answer · #{mine.publicCode}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{mine.text}</p>
            {mine.aiAssisted && <AiLabel className="mt-2" />}
          </section>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur md:sticky md:bottom-0 md:mx-auto md:max-w-3xl md:border-t-0 md:bg-transparent">
        {!takesAnswers && !mine ? (
          <p className="rounded-xl border bg-muted/60 p-3 text-center text-sm font-medium">{ANSWERS_CLOSED}</p>
        ) : !isOpen(card) && !mine ? (
          <p className="rounded-xl border bg-muted/60 p-3 text-center text-sm font-medium">This problem isn&apos;t taking new answers right now.</p>
        ) : mine ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-accent p-2 pl-4 text-accent-foreground">
            <p className="min-w-0 flex-1 text-sm font-medium">You answered · #{mine.publicCode}</p>
            {!locked && isOpen(card) && takesAnswers && !mine.steppedBack && (
              <Link
                href={`/talent/card/${card.id}/answer`}
                className="inline-flex min-h-11 items-center rounded-lg border border-primary/40 bg-background px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                Edit
              </Link>
            )}
            <Link
              href="/talent/answers"
              className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              Status
            </Link>
          </div>
        ) : (
          <Link
            href={`/talent/card/${card.id}/answer`}
            className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 text-base font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            Answer this problem
          </Link>
        )}
      </div>
    </div>
  );
}

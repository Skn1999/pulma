import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { notFound } from "next/navigation";
import { ArrowDown, ChevronLeft } from "lucide-react";
import { loadDB } from "@/lib/store";
import { eventLabel, eventOf } from "@/lib/events";
import { ANSWERS_CLOSED, eventTakesAnswers, visibleToCandidates } from "@/lib/participation";
import { cardState, companyRecord, goalOf, isOpen } from "@/lib/deadlines";
import { PromiseBlock } from "@/components/talent/promise";
import { getTalentId } from "@/lib/persona";
import { ProblemCardView } from "@/components/problem-card";
import { CardStateBanner } from "@/components/talent/card-state-banner";
import { AiLabel } from "@/components/ai-label";
import { ResponseForm } from "@/components/talent/response-form";
import { BookmarkButton } from "@/components/talent/bookmark-button";
import { relatedSkillLabels } from "@/lib/skills";

export const dynamic = "force-dynamic";

export default async function TalentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await loadDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  const mine = db.responses.find((r) => r.cardId === card.id && r.talentId === talentId);
  const locked = !!mine && db.shortlists.some((s) => s.responseId === mine.id);
  // A problem of a draft or finished event is not shown, except to someone who already answered it.
  if (!mine && !visibleToCandidates(eventOf(db, card), nowMs())) notFound();
  const company = db.companies.find((c) => c.id === card.companyId);
  const takesAnswers = eventTakesAnswers(db, card, nowMs());

  const talent = db.talents.find((t) => t.id === talentId);
  const editable = !locked && isOpen(card) && takesAnswers && !mine?.steppedBack;
  const canAnswer = mine ? editable : takesAnswers && isOpen(card);

  // One step: the problem and the answer together. Wide screens: the card on the left, the answer beside it
  // (sticky, so the problem stays in view while writing). Phones: the answer follows the card, with a jump link.
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-2 sm:px-6 lg:max-w-6xl">
      <div className="flex items-center justify-between">
        <Link href="/talent" className="inline-flex min-h-11 items-center gap-1 text-sm text-primary">
          <ChevronLeft className="size-4" aria-hidden="true" /> Explore
        </Link>
        <div className="flex items-center gap-1">
          {canAnswer && (
            <a href="#answer-h" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium text-primary lg:hidden">
              {mine ? "Your answer" : "Answer"} <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          )}
          <BookmarkButton cardId={card.id} saved={!!talent?.saved?.includes(card.id)} />
        </div>
      </div>
      <CardStateBanner state={cardState(card)} companyName={company?.name ?? "The company"} reason={card.stateReason} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:items-start lg:gap-8">
        <div id="problem" className="scroll-mt-4">
          <p className="mt-3 text-sm font-medium text-primary">{eventLabel(eventOf(db, card))}</p>
          <ProblemCardView card={card} company={company} />
          <PromiseBlock goal={goalOf(card, db)} record={companyRecord(db, card.companyId, nowMs())} />
        </div>

        <div className="mt-6 scroll-mt-4 lg:sticky lg:top-4 lg:mt-9 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          {canAnswer ? (
            <ResponseForm
              cardId={card.id}
              companyName={company?.name ?? ""}
              languages={card.languages}
              recap={{ title: card.title, hardPart: card.hardPart }}
              relatedSkills={relatedSkillLabels(talent?.skills, card.skills, card.skillRefs)}
              existing={mine ? { id: mine.id, publicCode: mine.publicCode, text: mine.text, language: mine.originalLanguage, aiAssisted: mine.aiAssisted } : undefined}
            />
          ) : mine ? (
            <section aria-labelledby="answer-h" className="rounded-xl border border-border bg-card p-4 sm:p-5">
              <h2 id="answer-h" className="font-display text-lg font-semibold">Your answer · #{mine.publicCode}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{mine.text}</p>
              {mine.aiAssisted && <AiLabel className="mt-2" />}
              <p className="mt-3 text-sm text-muted-foreground">
                {locked
                  ? "The company has shortlisted this answer, so it's locked. You can still accept or decline the invite."
                  : mine.steppedBack
                    ? "You stepped back from this answer."
                    : "Answers can't be edited right now."}
              </p>
              <Link
                href={locked ? "/talent/inbox" : "/talent/answers"}
                className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                {locked ? "Go to Invites" : "See its status"}
              </Link>
            </section>
          ) : (
            <p className="rounded-xl border bg-muted/60 p-4 text-center text-sm font-medium">
              {!takesAnswers ? ANSWERS_CLOSED : "This problem isn't taking new answers right now."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

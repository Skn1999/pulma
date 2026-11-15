import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { isOpen } from "@/lib/deadlines";
import { eventOf } from "@/lib/events";
import { nowMs } from "@/lib/clock";
import { ANSWERS_CLOSED, eventTakesAnswers, visibleToCandidates } from "@/lib/participation";
import { CardStateBanner } from "@/components/talent/card-state-banner";
import { relatedSkillLabels } from "@/lib/skills";
import { ResponseForm } from "@/components/talent/response-form";

export const dynamic = "force-dynamic";

export default async function AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  const mine = db.responses.find((r) => r.cardId === card.id && r.talentId === talentId);
  if (mine && db.shortlists.some((x) => x.responseId === mine.id)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-xl">This answer is locked.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          The company has shortlisted this answer, so it&apos;s locked. You can still accept or decline the invite.
        </p>
        <Link href="/talent/inbox" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring">
          Go to Invites
        </Link>
      </div>
    );
  }
  const talent = db.talents.find((t) => t.id === talentId);
  const company = db.companies.find((c) => c.id === card.companyId);
  if (!mine && !visibleToCandidates(eventOf(db, card), nowMs())) notFound();
  if (!eventTakesAnswers(db, card, nowMs())) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="font-display text-xl">{ANSWERS_CLOSED}</p>
        <p className="mt-2 text-sm text-muted-foreground">The event is locked, so answers can&apos;t be added or edited now.</p>
        <Link href={`/talent/card/${card.id}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring">
          Back to the problem
        </Link>
      </div>
    );
  }
  if (!isOpen(card)) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <CardStateBanner state={card.state ?? "open"} companyName={company?.name ?? "The company"} reason={card.stateReason} />
        <p className="mt-4 text-center text-sm text-muted-foreground">This problem isn&apos;t taking new answers or edits right now.</p>
        <div className="mt-4 text-center">
          <Link href={`/talent/card/${card.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring">
            Back to the problem
          </Link>
        </div>
      </div>
    );
  }
  return (
    <ResponseForm
      cardId={card.id}
      cardTitle={card.title}
      companyName={company?.name ?? ""}
      relatedSkills={relatedSkillLabels(talent?.skills, card.skills, card.skillRefs)}
      defaultLanguage={talent?.preferredLanguage ?? "English"}
      existing={mine ? { id: mine.id, text: mine.text, language: mine.originalLanguage, aiAssisted: mine.aiAssisted } : undefined}
    />
  );
}

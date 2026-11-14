import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { ProblemCardView } from "@/components/problem-card";
import { AiLabel } from "@/components/ai-label";

export const dynamic = "force-dynamic";

export default async function TalentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  const mine = db.responses.find((r) => r.cardId === card.id && r.talentId === talentId);
  const locked = !!mine && db.shortlists.some((s) => s.responseId === mine.id);
  const company = db.companies.find((c) => c.id === card.companyId);

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-6">
        <Link href="/talent" className="inline-flex min-h-11 items-center gap-1 text-sm text-primary">
          <ChevronLeft className="size-4" aria-hidden="true" /> Explore
        </Link>
        <ProblemCardView card={card} company={company} />
        {mine && (
          <section aria-labelledby="mine-h" className="mt-6 rounded-xl border border-border bg-card p-4">
            <h2 id="mine-h" className="text-sm font-semibold">Your answer · #{mine.publicCode}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{mine.text}</p>
            {mine.translatedText && (
              <p className="mt-2 whitespace-pre-wrap border-t pt-2 text-sm leading-6 text-muted-foreground">{mine.translatedText}</p>
            )}
            {mine.aiAssisted && <AiLabel className="mt-2" />}
          </section>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 backdrop-blur md:sticky md:bottom-0 md:mx-auto md:max-w-3xl md:border-t-0 md:bg-transparent">
        {mine ? (
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-accent p-2 pl-4 text-accent-foreground">
            <p className="min-w-0 flex-1 text-sm font-medium">You answered · #{mine.publicCode}</p>
            {!locked && (
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

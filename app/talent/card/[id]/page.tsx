import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { ProblemCardView } from "@/components/problem-card";
import { AiLabel } from "@/components/ai-label";
import { ResponseForm } from "@/components/talent/response-form";

export const dynamic = "force-dynamic";

export default async function TalentCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  const talent = db.talents.find((t) => t.id === talentId);
  const mine = db.responses.find((r) => r.cardId === card.id && r.talentId === talentId);
  const company = db.companies.find((c) => c.id === card.companyId);

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <Link href="/talent" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">
        ← All problems
      </Link>
      <div className="mt-2">
        <ProblemCardView card={card} company={company} />
      </div>

      <section aria-labelledby="respond-h" className="mt-10">
        <h2 id="respond-h" className="font-display text-2xl font-semibold">
          {mine ? "Your answer" : "Your turn"}
        </h2>
        {mine ? (
          <div className="mt-4 space-y-4 rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Submitted as <strong className="text-foreground">Response #{mine.publicCode}</strong>. You can&apos;t edit it
              now. Check your <Link href="/talent/inbox" className="text-primary underline underline-offset-4">inbox</Link> for invitations.
            </p>
            <p className="whitespace-pre-wrap leading-7">{mine.text}</p>
            {mine.translatedText && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Translation shown to the company</p>
                <p className="mt-1 whitespace-pre-wrap leading-7">{mine.translatedText}</p>
              </div>
            )}
            {mine.aiAssisted && <AiLabel />}
          </div>
        ) : (
          <ResponseForm cardId={card.id} defaultLanguage={talent?.preferredLanguage ?? "English"} />
        )}
      </section>
    </main>
  );
}

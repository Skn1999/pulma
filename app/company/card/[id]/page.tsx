import Link from "next/link";
import { notFound } from "next/navigation";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { ProblemCardView } from "@/components/problem-card";
import { BlindReview, type ReviewMeta } from "@/components/company/blind-review";

export const dynamic = "force-dynamic";

export default async function CompanyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = await getCompanyId();
  const db = getDB();
  const card = db.cards.find((c) => c.id === id);
  if (!card) notFound();
  const company = db.companies.find((c) => c.id === card.companyId);

  // Only shortlist ids and, for ACCEPTED shortlists only, the consenting talent's display name.
  const meta: Record<string, ReviewMeta> = {};
  for (const s of db.shortlists.filter((x) => x.cardId === id)) {
    const name =
      s.status === "accepted"
        ? db.talents.find((t) => t.id === db.responses.find((r) => r.id === s.responseId)?.talentId)?.displayName
        : undefined;
    meta[s.responseId] = { shortlistId: s.id, revealedName: name };
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <Link href="/company" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
        All your problem cards
      </Link>
      {card.companyId !== companyId && (
        <p className="mt-3 rounded-md border border-border bg-muted p-3 text-sm">
          This card belongs to another company. Switch company in the header to manage it.
        </p>
      )}
      <details className="mt-4 rounded-md">
        <summary className="cursor-pointer rounded-md py-2 font-display text-lg font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          {card.title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">(show the problem card)</span>
        </summary>
        <div className="mt-3">
          <ProblemCardView card={card} company={company} />
        </div>
      </details>

      <BlindReview cardId={id} initialMeta={meta} />

      <p className="mt-10 text-sm">
        <Link href="/event?company=me" className="underline underline-offset-4">
          See your day at the event
        </Link>
      </p>
    </main>
  );
}

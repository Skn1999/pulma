import { notFound, redirect } from "next/navigation";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { TriageView, type ReviewMeta } from "@/components/company/triage-view";

export const dynamic = "force-dynamic";

export default async function CompanyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const companyId = await getCompanyId();
  const db = getDB();
  const card = db.cards.find((c) => c.id === id);
  if (!card) notFound();
  if (card.companyId !== companyId) redirect("/company");
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

  return <TriageView card={card} company={company} initialMeta={meta} />;
}

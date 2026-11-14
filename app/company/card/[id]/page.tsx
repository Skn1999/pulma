import { notFound, redirect } from "next/navigation";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { TriageView, type ReviewMeta } from "@/components/company/triage-view";

export const dynamic = "force-dynamic";

export default async function CompanyCardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ r?: string }> }) {
  const { id } = await params;
  const { r } = await searchParams;
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

  const selected = db.responses.some((x) => x.id === r && x.cardId === id) ? r : undefined;
  // Keyed on the selected answer so opening a notification link while already on this page
  // remounts the view with that answer selected (and its list freshly loaded).
  return <TriageView key={`${id}:${selected ?? ""}`} card={card} company={company} initialMeta={meta} initialSelected={selected} />;
}

import { notFound, redirect } from "next/navigation";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { ResponseForm } from "@/components/talent/response-form";

export const dynamic = "force-dynamic";

export default async function AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDB();
  const card = db.cards.find((c) => c.id === id && c.status === "published");
  if (!card) notFound();
  const talentId = await getTalentId();
  if (db.responses.some((r) => r.cardId === card.id && r.talentId === talentId)) redirect(`/talent/card/${card.id}`);
  const talent = db.talents.find((t) => t.id === talentId);
  const company = db.companies.find((c) => c.id === card.companyId);
  return (
    <ResponseForm
      cardId={card.id}
      cardTitle={card.title}
      companyName={company?.name ?? ""}
      defaultLanguage={talent?.preferredLanguage ?? "English"}
    />
  );
}

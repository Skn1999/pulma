import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadDB } from "@/lib/store";
import { requireAccount } from "@/lib/session";
import { nowMs } from "@/lib/clock";
import { StepBack } from "@/components/talent/step-back";
import { PageTitle } from "@/components/shell/page-title";
import { AnswerActions } from "@/components/talent/answer-actions";
import { MatchThread } from "@/components/thread/match-thread";
import { AnswerPreview } from "@/components/thread/answer-preview";

export const dynamic = "force-dynamic";

export default async function AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const account = await requireAccount("talent");
  const { id } = await params;
  const db = await loadDB();
  const r = db.responses.find((x) => x.id === id && x.talentId === account.talentId);
  if (!r) notFound();
  const card = db.cards.find((c) => c.id === r.cardId);
  const company = db.companies.find((c) => c.id === card?.companyId);
  const sl = db.shortlists.find((s) => s.responseId === r.id);
  const closed = db.closures.some((c) => c.responseId === r.id);
  const editable = !sl && !closed && !r.steppedBack;
  const minDate = new Date(nowMs() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title={card?.title ?? "Your answer"} subtitle={`${company?.name ?? ""} · Response #${r.publicCode}`} />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-3 sm:px-6">
        <Link href="/talent/answers" className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring">
          <ArrowLeft className="size-4" aria-hidden="true" /> My answers
        </Link>
        <MatchThread responseId={r.id} viewer="talent" />
        <section aria-labelledby="preview-h">
          <h2 id="preview-h" className="mb-2 text-sm font-semibold">What {company?.name} will see</h2>
          <AnswerPreview a={{ code: r.publicCode, text: r.text, originalLanguage: r.originalLanguage, aiAssisted: r.aiAssisted }} />
        </section>
        {sl?.status === "invited" && (
          <Link href="/talent/inbox" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring">
            Go to your invites
          </Link>
        )}
        {editable ? <AnswerActions responseId={r.id} cardId={r.cardId} /> : closed || (r.steppedBack && !sl) ? <AnswerActions responseId={r.id} cardId={r.cardId} withdrawOnly /> : (
          <p className="text-sm text-muted-foreground">Locked — the company shortlisted this answer.</p>
        )}
        <StepBack responseId={r.id} code={r.publicCode} companyName={company?.name ?? "The company"} minDate={minDate} steppedBack={r.steppedBack} />
      </div>
    </>
  );
}

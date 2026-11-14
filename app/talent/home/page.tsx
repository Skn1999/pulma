import { getDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { requireAccount } from "@/lib/session";
import { nextSteps } from "@/lib/next-steps";
import { PageTitle } from "@/components/shell/page-title";
import { NextStepsPanel } from "@/components/next-steps-list";
import { GoalForm } from "@/components/talent/goal-form";
import { GoalSummary } from "@/components/talent/goal-summary";
import { SituationChanged } from "@/components/talent/situation-changed";
import { isOpen } from "@/lib/deadlines";

export const dynamic = "force-dynamic";

export default async function TalentHome() {
  const account = await requireAccount("talent");
  const db = getDB();
  const talent = db.talents.find((t) => t.id === account.talentId);
  const now = nowMs();
  const steps = nextSteps(db, account, now);
  const active = db.responses
    .filter((r) => r.talentId === account.talentId && !r.steppedBack)
    .filter((r) => !db.closures.some((c) => c.responseId === r.id) && !db.shortlists.some((s) => s.responseId === r.id && s.status === "declined"))
    .filter((r) => { const c = db.cards.find((x) => x.id === r.cardId); return !!c && isOpen(c); })
    .map((r) => ({ id: r.id, code: r.publicCode, companyName: db.companies.find((c) => c.id === db.cards.find((x) => x.id === r.cardId)?.companyId)?.name ?? "The company" }));
  const minDate = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <>
      <PageTitle title={`Hello, ${account.displayName.split(" ")[0]}`} subtitle="What is waiting on you, and what you are waiting for." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:px-6">
        {talent?.goal ? <GoalSummary goal={talent.goal} /> : <GoalForm initial={null} />}
        <NextStepsPanel {...steps} />
        {active.length > 0 && <SituationChanged answers={active} minDate={minDate} />}
      </div>
    </>
  );
}

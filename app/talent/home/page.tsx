import { getDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { requireAccount } from "@/lib/session";
import { nextSteps } from "@/lib/next-steps";
import { PageTitle } from "@/components/shell/page-title";
import { NextStepsPanel } from "@/components/next-steps-list";
import { GoalForm } from "@/components/talent/goal-form";

export const dynamic = "force-dynamic";

export default async function TalentHome() {
  const account = await requireAccount("talent");
  const db = getDB();
  const talent = db.talents.find((t) => t.id === account.talentId);
  const steps = nextSteps(db, account, nowMs());

  return (
    <>
      <PageTitle title={`Hello, ${account.displayName.split(" ")[0]}`} subtitle="What is waiting on you, and what you are waiting for." />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 sm:px-6">
        <NextStepsPanel {...steps} />
        <GoalForm initial={talent?.goal ?? null} />
      </div>
    </>
  );
}

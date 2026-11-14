import { defaultGoal } from "@/lib/deadlines";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { IntakeFlow } from "@/components/intake/intake-flow";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const companyId = await getCompanyId();
  const db = getDB();
  const company = db.companies.find((c) => c.id === companyId);
  return <IntakeFlow company={company} defaultGoal={defaultGoal(db)} />;
}

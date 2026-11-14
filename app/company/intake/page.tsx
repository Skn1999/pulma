import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { IntakeFlow } from "@/components/intake/intake-flow";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const companyId = await getCompanyId();
  const company = getDB().companies.find((c) => c.id === companyId);
  return <IntakeFlow company={company} />;
}

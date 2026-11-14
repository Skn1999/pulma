import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { IntakeFlow } from "@/components/intake/intake-flow";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const companyId = await getCompanyId();
  const company = getDB().companies.find((c) => c.id === companyId);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <IntakeFlow companyId={companyId} company={company} />
    </div>
  );
}

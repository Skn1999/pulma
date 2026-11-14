import { defaultGoal } from "@/lib/deadlines";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { nowMs } from "@/lib/clock";
import { eventLabel, pickEvent, upcomingEvents } from "@/lib/events";
import { IntakeFlow } from "@/components/intake/intake-flow";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const companyId = await getCompanyId();
  const db = getDB();
  const company = db.companies.find((c) => c.id === companyId);
  const upcoming = upcomingEvents(db, nowMs());
  const first = pickEvent(db, upcoming, undefined, nowMs());
  const events = upcoming.map((e) => ({ id: e.id, label: eventLabel(e), date: e.date }));
  return <IntakeFlow company={company} defaultGoal={defaultGoal(db, first)} events={events} defaultEventId={first?.id ?? ""} />;
}

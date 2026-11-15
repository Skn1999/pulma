import { defaultGoal } from "@/lib/deadlines";
import { loadDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { nowMs } from "@/lib/clock";
import { eventLabel, sortedEvents } from "@/lib/events";
import { canPublishTo, participationOf, publishedCountIn } from "@/lib/participation";
import { IntakeFlow, type IntakeEvent } from "@/components/intake/intake-flow";

export const dynamic = "force-dynamic";

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ event?: string | string[] }> }) {
  const sp = await searchParams;
  const asked = typeof sp.event === "string" ? sp.event : undefined;
  const companyId = await getCompanyId();
  const db = await loadDB();
  const now = nowMs();
  const company = db.companies.find((c) => c.id === companyId);
  // Only events this company may publish to right now.
  const events: IntakeEvent[] = sortedEvents(db)
    .filter((e) => canPublishTo(db, companyId, e.id, now).ok)
    .map((e) => ({
      id: e.id,
      label: eventLabel(e),
      date: e.date,
      table: participationOf(db, e.id, companyId)?.table,
      deadline: e.problemDeadline,
      used: publishedCountIn(db, companyId, e.id),
    }));
  const fixed = events.find((e) => e.id === asked);
  const first = db.events.find((e) => e.id === (fixed ?? events[0])?.id);
  return <IntakeFlow company={company} defaultGoal={defaultGoal(db, first)} events={events} fixedEventId={fixed?.id} />;
}

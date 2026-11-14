import { PageTitle } from "@/components/shell/page-title";
import { nowMs } from "@/lib/clock";
import { CountTiles } from "@/components/organiser/count-tiles";
import { NeedsTimeline } from "@/components/organiser/needs-timeline";
import { ReplyRatePanel } from "@/components/organiser/reply-rate-panel";
import { FollowUpPanel } from "@/components/organiser/follow-up-panel";
import { BarList } from "@/components/organiser/bar-list";
import { ResetDemoButton } from "@/components/organiser/reset-demo-button";
import { PromisesPanel } from "@/components/organiser/promises-panel";
import { promisesKept } from "@/lib/promises";
import { getDB } from "@/lib/store";
import { getStats } from "@/lib/stats";
import { eventLabel, pickEvent, sortedEvents } from "@/lib/events";
import { EventPicker } from "@/components/event/event-picker";

export const dynamic = "force-dynamic";

export default async function OrganiserPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const db = getDB();
  const events = sortedEvents(db);
  const ev = pickEvent(db, events, typeof sp.event === "string" ? sp.event : undefined, nowMs()) ?? events[0];
  const stats = getStats(db, ev.id);

  return (
    <>
      <PageTitle
        title="Overview"
        subtitle={eventLabel(ev)}
        actions={<ResetDemoButton />}
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <EventPicker events={events} selectedId={ev.id} basePath="/organiser" />
        <CountTiles counts={stats.counts} />
        <NeedsTimeline timeline={stats.timeline} eventDate={ev.date} />
        <ReplyRatePanel replies={stats.replies} />
        <PromisesPanel data={promisesKept(db, nowMs())} />
        <FollowUpPanel followUps={stats.followUps} />
        <div className="grid gap-4 md:grid-cols-2">
          <BarList id="sectors-heading" title="Sectors in demand" items={stats.sectors} unit="problem" />
          <BarList id="languages-heading" title="Languages in demand" items={stats.languages} unit="problem" />
        </div>
      </div>
    </>
  );
}

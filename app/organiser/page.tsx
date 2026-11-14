import { PageTitle } from "@/components/shell/page-title";
import { CountTiles } from "@/components/organiser/count-tiles";
import { NeedsTimeline } from "@/components/organiser/needs-timeline";
import { FollowUpPanel } from "@/components/organiser/follow-up-panel";
import { BarList } from "@/components/organiser/bar-list";
import { ResetDemoButton } from "@/components/organiser/reset-demo-button";
import { getDB } from "@/lib/store";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default function OrganiserPage() {
  const db = getDB();
  const stats = getStats(db);

  return (
    <>
      <PageTitle
        title="Overview"
        subtitle={`${db.event.name}, ${db.event.date}`}
        actions={<ResetDemoButton />}
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <CountTiles counts={stats.counts} />
        <NeedsTimeline timeline={stats.timeline} eventDate={db.event.date} />
        <FollowUpPanel followUps={stats.followUps} />
        <div className="grid gap-4 md:grid-cols-2">
          <BarList id="sectors-heading" title="Sectors in demand" items={stats.sectors} unit="problem" />
          <BarList id="languages-heading" title="Languages in demand" items={stats.languages} unit="problem" />
        </div>
      </div>
    </>
  );
}

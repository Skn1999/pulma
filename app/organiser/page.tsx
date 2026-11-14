import { PageHeader } from "@/components/page-header";
import { CountTiles } from "@/components/organiser/count-tiles";
import { NeedsTimeline } from "@/components/organiser/needs-timeline";
import { BarList } from "@/components/organiser/bar-list";
import { NoInviteList } from "@/components/organiser/no-invite-list";
import { ResetDemoButton } from "@/components/organiser/reset-demo-button";
import { getDB } from "@/lib/store";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default function OrganiserPage() {
  const db = getDB();
  const stats = getStats(db);

  return (
    <>
      <PageHeader
        title="Organiser dashboard"
        subtitle={`${db.event.name}, ${db.event.date}. Needs, answers and meetings in one place.`}
      />
      <div className="mx-auto max-w-6xl space-y-14 px-4 pb-16 sm:px-6">
        <CountTiles counts={stats.counts} />

        <NeedsTimeline timeline={stats.timeline} eventDate={db.event.date} />

        <div className="grid gap-12 md:grid-cols-2">
          <BarList id="sectors-heading" title="Sectors in demand" items={stats.sectors} unit="problem" />
          <BarList id="languages-heading" title="Languages in demand" items={stats.languages} unit="problem" />
        </div>

        <NoInviteList items={stats.noInvite} />

        <section aria-labelledby="demo-heading" className="space-y-4 border-t border-border pt-8">
          <h2 id="demo-heading" className="text-xl font-semibold">
            Demo controls
          </h2>
          <ResetDemoButton />
        </section>
      </div>
    </>
  );
}

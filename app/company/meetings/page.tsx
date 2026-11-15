import { CalendarClock } from "lucide-react";
import { loadDB } from "@/lib/store";
import { requireAccount } from "@/lib/session";
import { nowMs } from "@/lib/clock";
import { PageTitle } from "@/components/shell/page-title";
import { AvailabilityEditor } from "@/components/meetings/availability-editor";
import { localNow } from "@/lib/slots";
import { meetingsByEvent } from "@/lib/meeting-groups";
import { MeetingsByEvent } from "@/components/meetings/meetings-by-event";

export const dynamic = "force-dynamic";

export default async function CompanyMeetingsPage() {
  const acc = await requireAccount("company");
  const db = await loadDB();
  const nowLocal = localNow(nowMs());
  const windows = db.availability
    .filter((w) => w.companyId === acc.companyId && w.end > nowLocal)
    .sort((a, b) => (a.start < b.start ? -1 : 1));
  const groups = acc.companyId ? meetingsByEvent(db, { role: "company", companyId: acc.companyId }, nowMs()) : [];

  return (
    <>
      <PageTitle title="Meetings" subtitle="Everyone you are meeting, grouped by event, and your free windows for office and video meetings." />
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-4 sm:px-6">
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="mb-3 font-display text-lg font-semibold">Meetings by event</h2>
          {groups.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" /> No meetings yet. They appear here once someone accepts your invite.
            </p>
          ) : (
            <MeetingsByEvent groups={groups} role="company" />
          )}
        </section>
        <section aria-labelledby="avail-h">
          <h2 id="avail-h" className="mb-3 font-display text-lg font-semibold">Your free windows</h2>
          <AvailabilityEditor
            today={nowLocal.slice(0, 10)}
            windows={windows.map((w) => ({ id: w.id, mode: w.mode, start: w.start, end: w.end }))}
          />
        </section>
      </div>
    </>
  );
}

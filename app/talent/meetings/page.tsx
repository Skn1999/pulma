import Link from "next/link";
import { loadDB } from "@/lib/store";
import { requireAccount } from "@/lib/session";
import { nowMs } from "@/lib/clock";
import { PageTitle } from "@/components/shell/page-title";
import { meetingsByEvent } from "@/lib/meeting-groups";
import { MeetingsByEvent } from "@/components/meetings/meetings-by-event";

export const dynamic = "force-dynamic";

export default async function TalentMeetingsPage() {
  const acc = await requireAccount("talent");
  const db = await loadDB();
  const groups = acc.talentId ? meetingsByEvent(db, { role: "talent", talentId: acc.talentId }, nowMs()) : [];

  return (
    <>
      <PageTitle title="Meetings" subtitle="Your meetings, grouped by event." />
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="font-display text-xl">No meetings yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">When you accept an invite, the meeting shows up here.</p>
            <Link href="/talent/inbox" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">Go to your invites</Link>
          </div>
        ) : (
          <MeetingsByEvent groups={groups} role="talent" />
        )}
      </div>
    </>
  );
}

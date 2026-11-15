import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { Suspense } from "react";
import { getDB } from "@/lib/store";
import { goalOf, isOpen } from "@/lib/deadlines";
import { eventDay, eventOf, sortedEvents } from "@/lib/events";
import { candidateVisibleCards } from "@/lib/participation";
import { getTalentId } from "@/lib/persona";
import { skillMatches } from "@/lib/skills";
import { PageTitle } from "@/components/shell/page-title";
import { ExploreCard } from "@/components/talent/explore-card";
import { ExploreToolbar, type FilterGroup } from "@/components/talent/explore-toolbar";
import { candidateStatus } from "@/lib/candidate-status";

export const dynamic = "force-dynamic";

const FORMATS = [
  { value: "onsite", label: "On-site" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const sector = one("sector");
  const language = one("language");
  const format = one("format");
  const eventId = one("event");
  const bySkills = one("sort") === "skills";
  const show = one("show");
  const view = one("view") === "list" ? "list" : "grid";
  const intl = one("intl") === "1";
  const onlySkills = one("skills") === "1";

  const db = getDB();
  const talentId = await getTalentId();
  // Only problems of open or locked events: draft and finished events stay out of sight.
  const published = candidateVisibleCards(db, nowMs())
    .filter((c) => isOpen(c))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const companyOf = (id: string) => db.companies.find((c) => c.id === id);

  const sectors = [...new Set(published.map((c) => companyOf(c.companyId)?.sector).filter(Boolean) as string[])].sort();
  const languages = [...new Set(published.flatMap((c) => c.languages))].sort();
  const openEventIds = new Set(published.map((c) => eventOf(db, c).id));
  const groups: FilterGroup[] = [
    {
      key: "event",
      label: "Event",
      options: sortedEvents(db).filter((e) => openEventIds.has(e.id)).map((e) => ({ value: e.id, label: `${e.name} · ${eventDay(e.date)}` })),
    },
    { key: "sector", label: "Sector", options: sectors.map((s) => ({ value: s, label: s })) },
    { key: "language", label: "Language", options: languages.map((s) => ({ value: s, label: s })) },
    { key: "format", label: "Format", options: FORMATS },
  ];

  const mySkills = db.talents.find((t) => t.id === talentId)?.skills ?? [];
  const savedIds = new Set(db.talents.find((t) => t.id === talentId)?.saved ?? []);
  const now = nowMs();
  const matchesOf = new Map(published.map((c) => [c.id, skillMatches(mySkills, c.skills, c.skillRefs)]));
  const statusOf = new Map(published.map((c) => [c.id, candidateStatus(db, talentId, c.id, now)]));
  const kindOf = (id: string) => statusOf.get(id)!.kind;
  const filtered = published.filter(
    (c) =>
      (!eventId || eventOf(db, c).id === eventId) &&
      (!sector || companyOf(c.companyId)?.sector === sector) &&
      (!language || c.languages.includes(language)) &&
      (!format || c.format === format) &&
      (!intl || (c.support?.length ?? 0) > 0) &&
      (!onlySkills || !mySkills.length || matchesOf.get(c.id)!.length > 0) &&
      (show === "todo" ? ["new", "saved"].includes(kindOf(c.id))
        : show === "answered" ? ["answered", "invited", "meeting"].includes(kindOf(c.id))
        : show === "saved" ? savedIds.has(c.id)
        : true),
  );
  // Visible, deterministic sort by how many of the card's tags match the talent's own skills. Ties keep newest first.
  // This only orders problems; it is private to the talent and no person is ranked.
  const shown = bySkills && mySkills.length
    ? filtered.map((c, i) => ({ c, i })).sort((a, b) => matchesOf.get(b.c.id)!.length - matchesOf.get(a.c.id)!.length || a.i - b.i).map((x) => x.c)
    : filtered;
  const shortEvent = (c: (typeof published)[number]) => {
    const ev = eventOf(db, c);
    return `${ev.name.replace(/^Espoo /, "")} · ${eventDay(ev.date)}`;
  };

  return (
    <>
      <PageTitle title="Explore" />
      <div className="space-y-3 px-4 py-3 sm:px-6">
        <Suspense fallback={null}>
          <ExploreToolbar groups={groups} hasSkills={mySkills.length > 0} shownCount={shown.length} />
        </Suspense>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {shown.length} {shown.length === 1 ? "problem" : "problems"}
        </p>
        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No problems match.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Clear filters
            </Link>
          </div>
        ) : (
          <ul className={view === "list" ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
            {shown.map((c) => (
              <li key={c.id}>
                <ExploreCard
                  card={c}
                  view={view}
                  eventShort={shortEvent(c)}
                  company={companyOf(c.companyId)}
                  status={statusOf.get(c.id)!}
                  saved={savedIds.has(c.id)}
                  goal={goalOf(c, db)}
                  matched={matchesOf.get(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

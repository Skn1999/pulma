import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { Suspense } from "react";
import { getDB } from "@/lib/store";
import { companyRecord, goalOf, isOpen } from "@/lib/deadlines";
import { eventDay, eventLabel, eventOf, sortedEvents } from "@/lib/events";
import { candidateVisibleCards } from "@/lib/participation";
import { getTalentId } from "@/lib/persona";
import { skillMatches } from "@/lib/skills";
import { PageTitle } from "@/components/shell/page-title";
import { ExploreCard } from "@/components/talent/explore-card";
import { FilterChips, type FilterGroup } from "@/components/talent/filter-chips";

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
  const matchesOf = new Map(published.map((c) => [c.id, skillMatches(mySkills, c.skills)]));
  const filtered = published.filter(
    (c) =>
      (!eventId || eventOf(db, c).id === eventId) &&
      (!sector || companyOf(c.companyId)?.sector === sector) &&
      (!language || c.languages.includes(language)) &&
      (!format || c.format === format),
  );
  // Visible, deterministic sort by how many of the card's tags match the talent's own skills. Ties keep newest first.
  // Nothing is hidden, and this order is private to the talent.
  const shown = bySkills && mySkills.length
    ? filtered.map((c, i) => ({ c, i })).sort((a, b) => matchesOf.get(b.c.id)!.length - matchesOf.get(a.c.id)!.length || a.i - b.i).map((x) => x.c)
    : filtered;
  const sortHref = (sort?: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => typeof e[1] === "string" && e[0] !== "sort"));
    if (sort) q.set("sort", sort);
    const qs = q.toString();
    return qs ? `/talent?${qs}` : "/talent";
  };
  const sortLink = (on: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`;

  const now = nowMs();
  const records = new Map(db.companies.map((co) => [co.id, companyRecord(db, co.id, now)]));
  const answered = new Set(db.responses.filter((r) => r.talentId === talentId).map((r) => r.cardId));

  return (
    <>
      <PageTitle title="Explore" subtitle="Real problems from companies at upcoming Espoo events. Newest first." />
      <div className="space-y-3 px-4 py-3 sm:px-6">
        <Suspense fallback={null}>
          <FilterChips groups={groups} />
        </Suspense>
        {mySkills.length > 0 ? (
          <nav aria-label="Sort problems" className="flex flex-wrap items-center gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sort</span>
            <Link href={sortHref()} aria-current={!bySkills ? "true" : undefined} className={sortLink(!bySkills)}>
              {!bySkills && <span aria-hidden="true" className="mr-1">✓</span>}Newest
            </Link>
            <Link href={sortHref("skills")} aria-current={bySkills ? "true" : undefined} className={sortLink(bySkills)}>
              {bySkills && <span aria-hidden="true" className="mr-1">✓</span>}Uses my skills
            </Link>
            <span className="text-xs text-muted-foreground">Only you see this. Every problem stays listed.</span>
          </nav>
        ) : (
          <Link href="/profile#skills" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Add your skills to see which problems use them
          </Link>
        )}
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {shown.length} of {published.length} problems
        </p>
        {shown.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No problems match those filters.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Clear all filters
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((c) => (
              <li key={c.id}>
                <ExploreCard
                  card={c}
                  eventLabel={eventLabel(eventOf(db, c))}
                  company={companyOf(c.companyId)}
                  answered={answered.has(c.id)}
                  goal={goalOf(c, db)}
                  record={records.get(c.companyId)!}
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

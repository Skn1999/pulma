import Link from "next/link";
import { nowMs } from "@/lib/clock";
import { Suspense } from "react";
import { getDB } from "@/lib/store";
import { companyRecord, goalOf, isOpen } from "@/lib/deadlines";
import { getTalentId } from "@/lib/persona";
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

  const db = getDB();
  const talentId = await getTalentId();
  const published = db.cards
    .filter((c) => isOpen(c))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const companyOf = (id: string) => db.companies.find((c) => c.id === id);

  const sectors = [...new Set(published.map((c) => companyOf(c.companyId)?.sector).filter(Boolean) as string[])].sort();
  const languages = [...new Set(published.flatMap((c) => c.languages))].sort();
  const groups: FilterGroup[] = [
    { key: "sector", label: "Sector", options: sectors.map((s) => ({ value: s, label: s })) },
    { key: "language", label: "Language", options: languages.map((s) => ({ value: s, label: s })) },
    { key: "format", label: "Format", options: FORMATS },
  ];

  const shown = published.filter(
    (c) =>
      (!sector || companyOf(c.companyId)?.sector === sector) &&
      (!language || c.languages.includes(language)) &&
      (!format || c.format === format),
  );

  const now = nowMs();
  const records = new Map(db.companies.map((co) => [co.id, companyRecord(db, co.id, now)]));
  const answered = new Set(db.responses.filter((r) => r.talentId === talentId).map((r) => r.cardId));

  return (
    <>
      <PageTitle title="Explore" subtitle="Real problems from companies at Espoo Tech Talent Day. Newest first." />
      <div className="space-y-3 px-4 py-3 sm:px-6">
        <Suspense fallback={null}>
          <FilterChips groups={groups} />
        </Suspense>
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
                  company={companyOf(c.companyId)}
                  answered={answered.has(c.id)}
                  goal={goalOf(c, db)}
                  record={records.get(c.companyId)!}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getDB } from "@/lib/store";
import { getTalentId } from "@/lib/persona";
import { PageHeader } from "@/components/page-header";
import { ProblemCardView } from "@/components/problem-card";
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
    .filter((c) => c.status === "published")
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

  const myResponses = db.responses.filter((r) => r.talentId === talentId);
  const answered = new Set(myResponses.map((r) => r.cardId));
  const myRespIds = new Set(myResponses.map((r) => r.id));
  const pending = db.shortlists.filter((s) => s.status === "invited" && myRespIds.has(s.responseId)).length;

  return (
    <main id="main">
      <PageHeader
        title="Problems worth solving"
        subtitle="Companies describe a real problem, not a job ad. Pick one that interests you and tell them how you'd approach it. Newest first, no recommendations."
      />
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <Link
          href="/talent/inbox"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Your inbox
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            {pending} pending {pending === 1 ? "invite" : "invites"}
          </span>
        </Link>

        <Suspense fallback={null}>
          <FilterChips groups={groups} />
        </Suspense>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          Showing {shown.length} of {published.length} problems
        </p>

        {shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl">No problems match those filters.</p>
            <Link href="/talent" className="mt-3 inline-flex min-h-11 items-center text-primary underline underline-offset-4">
              Clear all filters
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id} className="relative">
                <Link
                  href={`/talent/card/${c.id}`}
                  aria-label={`Open: ${c.title}${answered.has(c.id) ? " (you answered)" : ""}`}
                  className="block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring"
                >
                  <ProblemCardView card={c} company={companyOf(c.companyId)} compact />
                </Link>
                {answered.has(c.id) && (
                  <span className="absolute right-3 top-3 rounded-full border border-primary/40 bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    ✓ Answered
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

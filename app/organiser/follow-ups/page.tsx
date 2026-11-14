import { PageTitle } from "@/components/shell/page-title";
import { getDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function FollowUpsPage() {
  const db = getDB();
  const cardById = new Map(db.cards.map((c) => [c.id, c]));
  const companyById = new Map(db.companies.map((c) => [c.id, c]));
  const shortlisted = new Set(db.shortlists.map((s) => s.responseId));

  const rows = db.responses
    .filter((r) => !shortlisted.has(r.id) && cardById.get(r.cardId)?.status === "published")
    .map((r) => {
      const card = cardById.get(r.cardId)!;
      return {
        id: r.id,
        cardId: card.id,
        code: r.publicCode,
        problem: card.title,
        company: companyById.get(card.companyId)?.name ?? "",
        language: r.originalLanguage,
      };
    })
    .sort(
      (a, b) =>
        (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0) ||
        a.code.localeCompare(b.code, undefined, { numeric: true }),
    );

  return (
    <>
      <PageTitle
        title="Follow-ups"
        subtitle="A cue to follow up about other opportunities — not a ranking. Listed by problem, then code."
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <p className="text-sm">
          <span className="font-display text-2xl font-semibold tabular-nums">{rows.length}</span>{" "}
          <span className="text-muted-foreground">{rows.length === 1 ? "answer has" : "answers have"} no invite yet. No names are shown.</span>
        </p>
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Every answer has an invite so far. Nothing to follow up.
          </p>
        ) : (
          <div role="region" aria-label="Answers without an invite" tabIndex={0} className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
              <caption className="sr-only">Answers without an invite, by problem then response code</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Response</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Problem</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Company</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Language</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-medium">Response #{r.code}</th>
                    <td className="px-4 py-2.5">{r.problem}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.company}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.language}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

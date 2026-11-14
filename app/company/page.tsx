import Link from "next/link";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { PageTitle } from "@/components/shell/page-title";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function CompanyHome() {
  const companyId = await getCompanyId();
  const db = getDB();
  const cards = db.cards.filter((c) => c.companyId === companyId);

  const rows = cards.map((card) => {
    const answers = db.responses.filter((r) => r.cardId === card.id);
    const lists = db.shortlists.filter((s) => s.cardId === card.id);
    const listed = new Set(lists.map((s) => s.responseId));
    const closedIds = new Set(db.closures.filter((c) => c.cardId === card.id).map((c) => c.responseId));
    return {
      card,
      answers: answers.length,
      fresh: answers.filter((r) => !listed.has(r.id)).length,
      open: answers.filter((r) => !listed.has(r.id) && !closedIds.has(r.id)).length,
      shortlisted: lists.length,
      accepted: lists.filter((s) => s.status === "accepted").length,
    };
  });

  return (
    <div>
      <PageTitle
        title="Problems"
        subtitle="The problems you've brought to the event, and the answers coming in."
        actions={
          <Link href="/company/intake" className={buttonVariants()}>
            New problem
          </Link>
        }
      />
      {rows.length === 0 ? (
        <div className="m-6 rounded-lg border border-dashed p-10 text-center">
          <p className="font-display text-xl font-semibold">No problems yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Describe something your team is stuck on. It takes about five minutes, and people answer in their own words.
          </p>
          <Link href="/company/intake" className={`${buttonVariants({ size: "lg" })} mt-5`}>
            Bring your first problem
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Your problems. Select a title to review its answers.</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium sm:px-6">Problem</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 font-medium">Published</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Answers</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">New</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Open</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Shortlisted</th>
                <th scope="col" className="px-4 py-2 text-right font-medium sm:px-6">Accepted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ card, answers, fresh, open, shortlisted, accepted }) => (
                <tr key={card.id} className="group relative border-b last:border-0 hover:bg-muted/50 focus-within:bg-muted/50">
                  <th scope="row" className="px-4 py-3 text-left font-medium sm:px-6">
                    <Link
                      href={`/company/card/${card.id}`}
                      className="font-display text-base outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                    >
                      {card.title}
                    </Link>
                  </th>
                  <td className="px-3 py-3">
                    <span className="rounded-full border px-2 py-0.5 text-xs">
                      {card.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{fmt.format(new Date(card.createdAt))}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{answers}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {fresh > 0 ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {fresh} new
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{open}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{shortlisted}/5</td>
                  <td className="px-4 py-3 text-right tabular-nums sm:px-6">{accepted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

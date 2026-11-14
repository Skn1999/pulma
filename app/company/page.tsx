import Link from "next/link";
import { getDB } from "@/lib/store";
import { getCompanyId } from "@/lib/persona";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function CompanyHome() {
  const companyId = await getCompanyId();
  const db = getDB();
  const company = db.companies.find((c) => c.id === companyId);
  const cards = db.cards.filter((c) => c.companyId === companyId);

  return (
    <main>
      <PageHeader
        title="Your problem cards"
        subtitle={company ? `${company.name}: the problems you've brought to the event.` : "The problems you've brought to the event."}
      />
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/company/intake" className={buttonVariants({ size: "lg" })}>
            Bring a new problem
          </Link>
          <Link href="/event?company=me" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Your day at the event
          </Link>
        </div>

        {cards.length === 0 ? (
          <div className="mt-8 rounded-md border border-dashed border-border p-8 text-center">
            <p className="font-display text-xl font-semibold">No problems yet</p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Describe something your team is stuck on. It takes about five minutes, and people answer in their own words.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const responses = db.responses.filter((r) => r.cardId === card.id).length;
              const lists = db.shortlists.filter((s) => s.cardId === card.id);
              const accepted = lists.filter((s) => s.status === "accepted").length;
              return (
                <li key={card.id} className="rounded-md border border-border bg-paper p-5 shadow-sm">
                  <h2 className="font-display text-xl font-semibold leading-tight">{card.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {card.status === "published" ? "Published" : "Draft"}
                  </p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Responses</dt>
                      <dd className="text-lg font-semibold">{responses}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Shortlisted</dt>
                      <dd className="text-lg font-semibold">{lists.length}/5</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Accepted</dt>
                      <dd className="text-lg font-semibold">{accepted}</dd>
                    </div>
                  </dl>
                  <Link
                    href={`/company/card/${card.id}`}
                    className={`${buttonVariants({ variant: "outline" })} mt-4`}
                    aria-label={`Review responses for ${card.title}`}
                  >
                    Review responses
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

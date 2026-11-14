import { AlertTriangle } from "lucide-react";
import { shortDate } from "@/lib/next-steps";
import { MIN_RECORD } from "@/lib/deadlines";
import type { promisesKept } from "@/lib/promises";

type Data = ReturnType<typeof promisesKept>;

export function PromisesPanel({ data }: { data: Data }) {
  return (
    <section aria-labelledby="promises-heading" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="promises-heading" className="font-display text-lg font-semibold">Promises kept</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How often each company replied within the time it promised. Listed alphabetically, not ranked. A rate appears after {MIN_RECORD} answers.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">Reply promises kept by company</caption>
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">Company</th>
              <th scope="col" className="px-3 py-2 font-medium">On time</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Answers counted</th>
              <th scope="col" className="py-2 pl-3 text-right font-medium">Overdue now</th>
            </tr>
          </thead>
          <tbody>
            {data.companies.map((c) => (
              <tr key={c.companyId} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium">{c.name}</th>
                <td className="px-3 py-2 tabular-nums">
                  {c.rate === null ? <span className="text-muted-foreground">Not enough answers yet</span> : `${Math.round(c.rate * 100)}%`}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{c.counted}</td>
                <td className="py-2 pl-3 text-right tabular-nums">
                  {c.overdueNow > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <AlertTriangle className="size-3.5" aria-hidden="true" /> {c.overdueNow}
                    </span>
                  ) : (
                    0
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-5 text-sm font-semibold">Problems past their decide-by date</h3>
      {data.pastDecideBy.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">None. Every open problem is still inside its date.</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {data.pastDecideBy.map((p) => (
            <li key={p.cardId} className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-medium">{p.companyName}</span> · {p.title}
                <span className="text-muted-foreground"> · was to decide by {shortDate(p.decideBy)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Totals about organisations only. Nothing here is about a person.</p>
    </section>
  );
}

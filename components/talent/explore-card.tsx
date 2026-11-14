import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { SUPPORT_LABEL, type Company, type HiringGoal, type ProblemCard } from "@/lib/types";
import { PromiseBlock } from "./promise";

const FORMAT_LABEL = { onsite: "On-site", online: "Online", hybrid: "Hybrid" } as const;

export function ExploreCard({
  card, company, eventLabel, answered, goal, record, matched = [],
}: {
  card: ProblemCard;
  eventLabel: string;
  company?: Company;
  answered: boolean;
  goal: HiringGoal;
  record: { rate: number | null; counted: number };
  /** Card tags that match the signed-in talent's own skills. Private to them. */
  matched?: string[];
}) {
  return (
    <Link
      href={`/talent/card/${card.id}`}
      className="flex min-h-11 items-start gap-3 rounded-xl border border-border bg-paper p-4 shadow-sm outline-none active:bg-muted focus-visible:ring-3 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{company?.name}</span> · {company?.sector}
        </p>
        <p className="mt-1 text-xs font-medium text-primary">{eventLabel}</p>
        <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{card.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{card.context}</p>
        <ul className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Languages and format">
          {card.languages.map((l) => (
            <li key={l} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">{l}</li>
          ))}
          <li className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">{FORMAT_LABEL[card.format]}</li>
          {answered && (
            <li className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              <CheckCircle2 className="size-3" aria-hidden="true" /> Answered ✓
            </li>
          )}
        </ul>
        {card.support && card.support.length > 0 && (
          <p className="mt-2 text-xs">
            <span className="font-medium text-navy">Help for international hires:</span> {card.support.map((k) => SUPPORT_LABEL[k]).join(", ")}
          </p>
        )}
        {matched.length > 0 && (
          <p className="mt-2 text-xs">
            <span className="font-medium text-primary">Uses your skills:</span> {matched.join(", ")}
          </p>
        )}
        <PromiseBlock goal={goal} record={record} compact />
      </div>
      <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

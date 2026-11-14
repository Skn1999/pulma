import Link from "next/link";
import { Hourglass } from "lucide-react";
import { SUPPORT_LABEL, type Company, type HiringGoal, type ProblemCard } from "@/lib/types";
import type { CandidateStatus } from "@/lib/candidate-status";
import { replyingText } from "@/lib/promise-text";
import { BookmarkButton } from "./bookmark-button";
import { StatusBadge } from "./status-badge";

const FORMAT_LABEL = { onsite: "On-site", online: "Online", hybrid: "Hybrid" } as const;

const chip = "rounded-full border border-border bg-background px-2 py-0.5 text-xs";

function tone(status: CandidateStatus) {
  const quiet = status.kind === "stepped_back" || status.kind === "closed";
  return {
    quiet,
    box: status.kind === "invited" ? "border-l-4 border-l-primary" : "",
  };
}

export function ExploreCard({
  card, company, eventShort, status, saved, goal, matched = [], view = "grid",
}: {
  card: ProblemCard;
  /** "Tech Talent Day · Sat 5 Dec" */
  eventShort: string;
  company?: Company;
  status: CandidateStatus;
  saved: boolean;
  goal: HiringGoal;
  /** Card tags that match the signed-in talent's own skills. Private to them. */
  matched?: string[];
  view?: "grid" | "list";
}) {
  const { quiet, box } = tone(status);
  const base = `relative rounded-xl border border-border bg-paper focus-within:ring-3 focus-within:ring-ring ${box} ${quiet ? "text-muted-foreground" : "shadow-sm"}`;
  const titleLink = (cls: string) => (
    <Link href={`/talent/card/${card.id}`} className={`${cls} outline-none after:absolute after:inset-0 after:rounded-xl`}>
      {card.title}
    </Link>
  );

  if (view === "list") {
    return (
      <article className={`${base} flex items-start gap-2 py-2 pl-4 pr-1 sm:items-center`}>
        <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
          <h2 className="min-w-0 font-display text-base font-semibold leading-snug sm:flex-1 sm:truncate">
            {titleLink("")}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:mt-0 sm:w-56 sm:shrink-0">
            {company?.name} · {eventShort}
          </p>
          {status.kind !== "new" && (
            <div className="mt-1 sm:mt-0 sm:shrink-0"><StatusBadge status={status} /></div>
          )}
        </div>
        <BookmarkButton cardId={card.id} saved={saved} />
      </article>
    );
  }

  return (
    <article className={`${base} p-4`}>
      {/* Bookmark sits in the corner; the status badge (if any) leads, otherwise the company line starts the tile. */}
      <div className="absolute right-1 top-1 z-10"><BookmarkButton cardId={card.id} saved={saved} /></div>
      {status.kind !== "new" && <div className="mb-2 pr-10"><StatusBadge status={status} /></div>}
      <p className="truncate pr-10 text-xs text-muted-foreground">
        <span className={quiet ? "" : "font-medium text-foreground"}>{company?.name}</span> · {company?.sector}
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold leading-snug">{titleLink("")}</h2>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{card.context}</p>
      <p className={`mt-2 text-xs font-medium ${quiet ? "" : "text-primary"}`}>{eventShort}</p>
      <ul className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Languages, format and support">
        {(card.languagesNeeded?.length ? card.languagesNeeded : card.languages).map((l) => (
          <li key={l} className={chip}>{l}</li>
        ))}
        <li className={chip}>{FORMAT_LABEL[card.format]}</li>
        {card.support && card.support.length > 0 && (
          <li className={chip} title={`Help for international hires: ${card.support.map((k) => SUPPORT_LABEL[k]).join(", ")}`}>
            International support
            <span className="sr-only">: {card.support.map((k) => SUPPORT_LABEL[k]).join(", ")}</span>
          </li>
        )}
      </ul>
      {matched.length > 0 && (
        <p className="mt-2 text-xs">
          <span className={`font-medium ${quiet ? "" : "text-primary"}`}>Uses your skills:</span> {matched.join(", ")}
        </p>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Hourglass className="size-3 shrink-0" aria-hidden="true" />
        {replyingText(goal)}
      </p>
    </article>
  );
}

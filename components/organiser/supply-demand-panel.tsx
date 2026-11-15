import type { SkillRow } from "@/lib/supply-demand";
import { supplyText } from "@/lib/supply-demand";
import { ESCO_ATTRIBUTION } from "@/lib/esco-ref";

/** Counts only. Skills are private to each candidate; nobody is identified. Words and numbers carry the meaning. */
export function SupplyDemandPanel({ rows }: { rows: SkillRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.demand));
  return (
    <section aria-labelledby="supply-demand-heading" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="supply-demand-heading" className="font-display text-base font-semibold">Skills: supply and demand</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        What this event&apos;s problems need, next to how many of the candidates who answered list it. Counts only. Skills are private to each candidate; no one is identified.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No problems with work tags in this event yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
                <span className="font-medium">
                  {r.label}
                  {r.esco && <span title="Linked to ESCO" className="ml-2 rounded border border-border px-1.5 py-0.5 text-xs font-normal text-muted-foreground">ESCO</span>}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  Problems that need it: {r.demand} · Candidates who list it: {supplyText(r.supply)}
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-2 w-full rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.demand / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">The bar shows demand. {ESCO_ATTRIBUTION}.</p>
    </section>
  );
}

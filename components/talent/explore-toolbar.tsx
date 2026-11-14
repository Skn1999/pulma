"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export interface FilterGroup {
  key: "event" | "sector" | "language" | "format";
  label: string;
  options: { value: string; label: string }[];
}

const SHOW = [
  { value: "", label: "All" },
  { value: "todo", label: "To answer" },
  { value: "answered", label: "Answered" },
  { value: "saved", label: "Saved" },
];

const ring = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/** The one calm row above the list: status, filters, sort and layout. Writes URL params only. */
export function ExploreToolbar({
  groups, hasSkills, shownCount,
}: {
  groups: FilterGroup[];
  hasSkills: boolean;
  shownCount: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const view = params.get("view") === "list" ? "list" : "grid";
  const show = params.get("show") ?? "";
  const sort = params.get("sort") === "skills" && hasSkills ? "skills" : "newest";

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `/talent?${qs}` : "/talent", { scroll: false });
  }

  const active: { key: string; label: string; group?: string }[] = [
    ...groups.flatMap((g) => {
      const v = params.get(g.key);
      const o = v ? g.options.find((x) => x.value === v) : undefined;
      return o ? [{ key: g.key, label: o.label, group: g.label }] : [];
    }),
    ...(params.get("intl") === "1" ? [{ key: "intl", label: "International support" }] : []),
    ...(hasSkills && params.get("skills") === "1" ? [{ key: "skills", label: "Uses my skills" }] : []),
  ];
  const clearAll = Object.fromEntries([...groups.map((g) => g.key), "intl", "skills"].map((k) => [k, null]));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          label="Show"
          className="flex w-full sm:inline-flex sm:w-auto"
          itemClassName="flex-1 px-2.5 sm:flex-none sm:px-3"
          options={SHOW.map((o) => ({ value: o.value || "all", label: o.label }))}
          value={show || "all"}
          onChange={(v) => update({ show: v === "all" ? null : v })}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" className="min-h-11 rounded-full px-4" />}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters{active.length > 0 && <span className="ml-1">({active.length})</span>}
          </DialogTrigger>
          <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
              <DialogDescription className="sr-only">Narrow the list of problems. Nothing here changes what companies see.</DialogDescription>
            </DialogHeader>
            {hasSkills && (
              <fieldset className="min-w-0 sm:hidden">
                <legend className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Sort</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(["newest", "skills"] as const).map((v) => {
                    const on = sort === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={on}
                        onClick={() => update({ sort: v === "skills" ? "skills" : null })}
                        className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3.5 text-sm ${ring} ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
                      >
                        {on && <span aria-hidden="true">✓</span>}
                        {v === "newest" ? "Newest" : "My skills first"}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
            {groups.map((g) => (
              <fieldset key={g.key} className="min-w-0">
                <legend className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{g.label}</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const on = params.get(g.key) === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => update({ [g.key]: on ? null : o.value })}
                        className={`inline-flex min-h-11 items-center gap-1 rounded-full border px-3.5 text-sm ${ring} ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
                      >
                        {on && <span aria-hidden="true">✓</span>}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div className="space-y-1">
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={params.get("intl") === "1"}
                  onChange={(e) => update({ intl: e.target.checked ? "1" : null })}
                />
                International support
              </label>
              {hasSkills ? (
                <>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      checked={params.get("skills") === "1"}
                      onChange={(e) => update({ skills: e.target.checked ? "1" : null })}
                    />
                    Uses my skills
                  </label>
                  <p className="pl-8 text-xs text-muted-foreground">Only you see this. Every problem stays listed unless you filter it out.</p>
                </>
              ) : (
                <a href="/profile#skills" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">
                  Add your skills to see which problems use them
                </a>
              )}
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="min-h-11 w-full" onClick={() => setOpen(false)}>
                Show {shownCount} {shownCount === 1 ? "problem" : "problems"}
              </Button>
              <Button variant="ghost" className="min-h-11 w-full" disabled={active.length === 0} onClick={() => update(clearAll)}>
                Clear all
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {hasSkills && (
          <label className="hidden items-center gap-1.5 text-sm sm:inline-flex">
            <span className="sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => update({ sort: e.target.value === "skills" ? "skills" : null })}
              className={`min-h-11 rounded-full border border-border bg-card px-3 text-sm ${ring}`}
            >
              <option value="newest">Newest</option>
              <option value="skills">My skills first</option>
            </select>
          </label>
        )}

        <Segmented
          label="Layout"
          className="ml-auto inline-flex"
          itemClassName="min-w-11 px-2.5 sm:px-3"
          options={([["grid", LayoutGrid, "Grid"], ["list", List, "List"]] as const).map(([v, Icon, text]) => ({
            value: v,
            label: (
              <>
                <Icon className="size-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">{text}</span>
              </>
            ),
          }))}
          value={view}
          onChange={(v) => update({ view: v === "grid" ? null : v })}
        />
      </div>

      {active.length > 0 && (
        <ul aria-label="Active filters" className="flex flex-wrap gap-2">
          {active.map((a) => (
            <li key={a.key}>
              <button
                type="button"
                onClick={() => update({ [a.key]: null })}
                aria-label={`Remove filter ${a.group ? `${a.group}: ` : ""}${a.label}`}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-primary/40 bg-accent px-3 text-sm text-accent-foreground ${ring}`}
              >
                {a.label}
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

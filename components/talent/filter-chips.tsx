"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface FilterGroup {
  key: "sector" | "language" | "format";
  label: string;
  options: { value: string; label: string }[];
}

export function FilterChips({ groups }: { groups: FilterGroup[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `/talent?${qs}` : "/talent", { scroll: false });
  }

  return (
    <div role="toolbar" aria-label="Filters" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      {groups.map((g) => (
        <div key={g.key} role="group" aria-label={`Filter by ${g.label}`} className="flex shrink-0 items-center gap-2 border-r border-border pr-3 last:border-r-0">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{g.label}</span>
          {g.options.map((o) => {
            const on = params.get(g.key) === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(g.key, o.value)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"
                }`}
              >
                {on && <span aria-hidden="true">✓</span>}
                {o.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

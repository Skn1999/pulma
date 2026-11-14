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
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g.key} role="group" aria-label={`Filter by ${g.label}`} className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:w-20">
            {g.label}
          </span>
          {g.options.map((o) => {
            const on = params.get(g.key) === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(g.key, o.value)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted"
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

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string; href: string }[] = [
  { role: "company", label: "Company", href: "/company/intake" },
  { role: "talent", label: "Talent", href: "/talent" },
  { role: "organiser", label: "Organiser", href: "/organiser" },
];

export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();
  const [picked, setPicked] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  // The page you're on wins; the cookie role is the fallback (home, /event).
  const fromPath: Role | null = pathname.startsWith("/company")
    ? "company"
    : pathname.startsWith("/talent")
      ? "talent"
      : pathname.startsWith("/organiser")
        ? "organiser"
        : null;
  const current = busy && picked ? picked : (fromPath ?? role);

  async function choose(r: (typeof ROLES)[number]) {
    if (busy) return;
    setBusy(true);
    setPicked(r.role);
    try {
      await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: r.role }),
      });
    } catch {
      /* demo must not break */
    }
    router.push(r.href);
    router.refresh();
    setBusy(false);
  }

  return (
    <nav aria-label="Switch demo role" className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Viewing as</span>
      <div role="group" className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            aria-pressed={current === r.role}
            onClick={() => choose(r)}
            className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${
              current === r.role
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

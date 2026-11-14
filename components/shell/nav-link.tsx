"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, SquarePlus, CalendarDays, Compass, PenLine, Inbox, ChartNoAxesColumn, Circle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  LayoutGrid, SquarePlus, CalendarDays, Compass, PenLine, Inbox, ChartNoAxesColumn,
};

function pathOf(href: string) {
  return href.split("?")[0];
}

/** Active = longest nav path that prefixes the current path (so /company/intake doesn't also light /company). */
function useActive(item: NavItem, all: NavItem[]) {
  const pathname = usePathname();
  const matches = (h: string) => {
    const p = pathOf(h);
    return pathname === p || pathname.startsWith(p + "/");
  };
  if (!matches(item.href)) return false;
  const longest = Math.max(...all.filter((i) => matches(i.href)).map((i) => pathOf(i.href).length));
  return pathOf(item.href).length === longest;
}

export function NavLink({ item, all, variant }: { item: NavItem; all: NavItem[]; variant: "side" | "tab" }) {
  const active = useActive(item, all);
  const Icon = ICONS[item.icon] ?? Circle;
  const badge =
    item.badge != null ? (
      <span
        className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground"
      >
        <span aria-hidden="true">{item.badge}</span>
        <span className="sr-only">{item.badge} new</span>
      </span>
    ) : null;

  if (variant === "tab") {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          active ? "font-semibold text-primary" : "text-muted-foreground",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("absolute inset-x-4 top-0 h-0.5 rounded-b", active ? "bg-primary" : "bg-transparent")}
        />
        <span className="relative">
          <Icon className="size-5" aria-hidden="true" />
          {item.badge != null && (
            <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
              <span aria-hidden="true">{item.badge}</span>
              <span className="sr-only">{item.badge} new</span>
            </span>
          )}
        </span>
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-10 items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-2 left-0 w-0.5 rounded-r", active ? "bg-primary" : "bg-transparent")}
      />
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      {item.label}
      {badge}
    </Link>
  );
}

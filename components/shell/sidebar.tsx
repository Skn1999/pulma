"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE, type NavItem } from "@/lib/nav";
import type { Role } from "@/lib/types";
import { NavLink } from "./nav-link";
import { RoleBadge } from "./role-badge";
import { AccountMenu } from "./account-menu";
import { NotificationBell } from "./notification-bell";

/**
 * Desktop sidebar that collapses to an icon rail. The choice is kept in a cookie so the server renders
 * the same state (no flash). The toggle stays in the same place in the DOM in both states, so keyboard
 * focus stays on it after pressing it; collapsed links keep their text for screen readers.
 */
export function Sidebar({
  nav, roleLabel, context, showBell, menu, initialCollapsed,
}: {
  nav: NavItem[];
  roleLabel: string;
  context?: string;
  showBell: boolean;
  menu: { displayName: string; email: string; role: Role };
  initialCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      id="app-sidebar"
      className={cn(
        "hidden shrink-0 flex-col border-r bg-sidebar motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-(--ease-in-out) md:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex gap-2 pb-4 pt-5", collapsed ? "flex-col items-center px-2" : "items-start justify-between px-5")}>
        <div className={cn("min-w-0", collapsed && "text-center")}>
          <Link
            href="/"
            aria-label={collapsed ? "Pulma home" : undefined}
            className="rounded-sm font-display text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {collapsed ? <span aria-hidden="true">P</span> : "Pulma"}
          </Link>
          <div className={cn("mt-1 flex min-w-0 flex-col items-start gap-1", collapsed && "sr-only")}>
            <RoleBadge label={roleLabel} />
            {context && <p className="max-w-full truncate text-xs text-muted-foreground">{context}</p>}
          </div>
        </div>
        <div className={cn("flex shrink-0 gap-1", collapsed ? "flex-col items-center" : "items-center")}>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar-nav"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {collapsed ? <PanelLeftOpen className="size-5" aria-hidden="true" /> : <PanelLeftClose className="size-5" aria-hidden="true" />}
          </button>
          {showBell && <NotificationBell className="shrink-0" align="start" />}
        </div>
      </div>
      <nav id="app-sidebar-nav" aria-label="Main" className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.href}>
              <NavLink item={item} all={nav} variant="side" collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>
      <div className={cn("border-t", collapsed ? "flex justify-center p-2" : "p-3")}>
        <AccountMenu {...menu} compact={collapsed} side="top" align="start" />
      </div>
    </aside>
  );
}

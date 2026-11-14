import Link from "next/link";
import { requireAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { navFor } from "@/lib/nav";
import { NavLink } from "./nav-link";
import { AccountMenu } from "./account-menu";
import { NotificationBell } from "./notification-bell";
import { NotificationsProvider } from "./notifications-provider";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  const db = getDB();
  const nav = navFor(account, db);
  const context =
    account.role === "company"
      ? (db.companies.find((c) => c.id === account.companyId)?.name ?? "Company")
      : account.role === "talent"
        ? "Talent"
        : "Event team";
  const menu = { displayName: account.displayName, email: account.email, role: account.role };
  const showBell = account.role !== "organiser";

  const shell = (
    <div className="fixed inset-0 flex flex-col bg-muted/60 md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-start justify-between gap-2 px-5 pb-4 pt-6">
          <div className="min-w-0">
            <Link href="/" className="font-display text-2xl font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Pulma
            </Link>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{context}</p>
          </div>
          {showBell && <NotificationBell className="shrink-0" />}
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} all={nav} variant="side" />
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t p-3">
          <AccountMenu {...menu} />
        </div>
      </aside>

      <header className="flex h-12 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <div className="flex items-baseline gap-2">
          <Link href="/" className="font-display text-xl font-semibold">Pulma</Link>
          <span className="max-w-32 truncate text-xs text-muted-foreground">{context}</span>
        </div>
        <div className="flex items-center gap-2">
          {showBell && <NotificationBell />}
          <AccountMenu {...menu} compact />
        </div>
      </header>

      <main id="main" className="min-w-0 flex-1 overflow-y-auto pb-20 md:p-4 md:pb-4">
        <div className="mx-auto min-h-full max-w-6xl bg-background md:rounded-xl md:border md:shadow-sm">
          {children}
        </div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {nav.map((item) => (
          <NavLink key={item.href} item={item} all={nav} variant="tab" />
        ))}
      </nav>
    </div>
  );

  return showBell ? <NotificationsProvider>{shell}</NotificationsProvider> : shell;
}

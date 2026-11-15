import Link from "next/link";
import { requireAccount } from "@/lib/session";
import { loadDB } from "@/lib/store";
import { navFor, SIDEBAR_COOKIE } from "@/lib/nav";
import { cookies } from "next/headers";
import { NavLink } from "./nav-link";
import { Sidebar } from "./sidebar";
import { RoleBadge } from "./role-badge";
import { AccountMenu } from "./account-menu";
import { NotificationBell } from "./notification-bell";
import { NotificationsProvider } from "./notifications-provider";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  const db = await loadDB();
  const nav = navFor(account, db);
  // Text label for each side, shown next to the logo, so the role is never told by colour alone.
  const roleLabel = account.role === "company" ? "Employer" : account.role === "talent" ? "Candidate" : "Event team";
  const context =
    account.role === "company" ? (db.companies.find((c) => c.id === account.companyId)?.name ?? "Company") : undefined;
  const menu = { displayName: account.displayName, email: account.email, role: account.role };
  const showBell = account.role !== "organiser";
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  const shell = (
    <div data-role={account.role} className="fixed inset-0 flex flex-col bg-frame md:flex-row">
      <Sidebar nav={nav} roleLabel={roleLabel} context={context} showBell={showBell} menu={menu} initialCollapsed={collapsed} />

      <header className="flex h-12 shrink-0 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <div className="flex items-baseline gap-2">
          <Link href="/" className="font-display text-xl font-semibold">Pulma</Link>
          <RoleBadge label={roleLabel} />
          {context && <span className="max-w-28 truncate text-xs text-muted-foreground">{context}</span>}
        </div>
        <div className="flex items-center gap-2">
          {showBell && <NotificationBell />}
          <AccountMenu {...menu} compact />
        </div>
      </header>

      <main id="main" className="min-w-0 flex-1 overflow-y-auto pb-20 md:p-4 md:pb-4">
        <div className="mx-auto min-h-full max-w-6xl bg-card md:rounded-lg md:border md:shadow-card">
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

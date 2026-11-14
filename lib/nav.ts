import type { Account, DB } from "./types";

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in components/shell/nav-link.tsx
  badge?: number;
}

function withBadge(item: NavItem, n: number): NavItem {
  return n > 0 ? { ...item, badge: n } : item;
}

export function navFor(account: Account, db: DB): NavItem[] {
  if (account.role === "company") {
    const cardIds = new Set(
      db.cards.filter((c) => c.companyId === account.companyId && c.status === "published").map((c) => c.id),
    );
    const shortlisted = new Set(db.shortlists.map((s) => s.responseId));
    const fresh = db.responses.filter((r) => cardIds.has(r.cardId) && !shortlisted.has(r.id)).length;
    return [
      withBadge({ href: "/company", label: "Problems", icon: "LayoutGrid" }, fresh),
      { href: "/company/intake", label: "New problem", icon: "SquarePlus" },
      { href: "/event", label: "Event day", icon: "CalendarDays" },
    ];
  }
  if (account.role === "talent") {
    const mine = new Set(db.responses.filter((r) => r.talentId === account.talentId).map((r) => r.id));
    const invites = db.shortlists.filter((s) => s.status === "invited" && mine.has(s.responseId)).length;
    return [
      { href: "/talent", label: "Explore", icon: "Compass" },
      { href: "/talent/answers", label: "My answers", icon: "PenLine" },
      withBadge({ href: "/talent/inbox", label: "Invites", icon: "Inbox" }, invites),
      { href: "/event", label: "My day", icon: "CalendarDays" },
    ];
  }
  return [
    { href: "/organiser", label: "Overview", icon: "ChartNoAxesColumn" },
    { href: "/event", label: "Schedule", icon: "CalendarDays" },
    { href: "/organiser/follow-ups", label: "Follow-ups", icon: "Inbox" },
  ];
}

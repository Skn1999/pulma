import Link from "next/link";

export type EventView = "full" | "company" | "talent";

const VIEWS: { view: EventView; href: string; label: string }[] = [
  { view: "full", href: "/event", label: "Full timetable" },
  { view: "company", href: "/event?company=me", label: "My day as company" },
  { view: "talent", href: "/event?talent=me", label: "My day as talent" },
];

export function EventNav({ active }: { active: EventView }) {
  return (
    <nav aria-label="Event views" className="mx-auto max-w-6xl px-4 sm:px-6">
      <ul className="flex flex-wrap gap-2 border-b border-border pb-3">
        {VIEWS.map((v) => {
          const isActive = v.view === active;
          return (
            <li key={v.view}>
              <Link
                href={v.href}
                aria-current={isActive ? "page" : undefined}
                className={
                  "inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
                  (isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted")
                }
              >
                {v.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

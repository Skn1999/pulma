import { CalendarCheck, CheckCircle2, Mail, PauseCircle, XCircle, Bookmark } from "lucide-react";
import type { CandidateStatus } from "@/lib/candidate-status";

const STYLE: Record<string, { Icon: typeof Mail; cls: string }> = {
  invited: { Icon: Mail, cls: "border-primary bg-primary text-primary-foreground" },
  meeting: { Icon: CalendarCheck, cls: "border-primary bg-card text-primary" },
  answered: { Icon: CheckCircle2, cls: "border-primary/40 bg-accent text-accent-foreground" },
  saved: { Icon: Bookmark, cls: "border-primary/40 bg-accent text-accent-foreground" },
  stepped_back: { Icon: PauseCircle, cls: "border-border bg-muted text-muted-foreground" },
  closed: { Icon: XCircle, cls: "border-border bg-muted text-muted-foreground" },
};

/** Status of a problem for this candidate. Always an icon and a word; null for "new". */
export function StatusBadge({ status }: { status: CandidateStatus }) {
  const s = STYLE[status.kind];
  if (!s) return null;
  const text = status.detail ? `${status.label} · ${status.detail}` : status.label;
  return (
    <span className={`inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <s.Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}

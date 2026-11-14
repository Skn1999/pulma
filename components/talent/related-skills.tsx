import { Lightbulb } from "lucide-react";

/** Quiet note for the talent only: their own skills that relate to this problem. Never sent to the company. */
export function RelatedSkills({ skills, className = "" }: { skills: string[]; className?: string }) {
  if (skills.length === 0) return null;
  return (
    <aside aria-label="Your related skills" className={`rounded-xl border border-border bg-card p-3 text-sm ${className}`}>
      <p className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span>
          <span className="font-medium">Your related skills:</span> {skills.join(", ")}. Use them as a starting point and write in your own words.
        </span>
      </p>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">Only you see this. The company never sees your skills.</p>
    </aside>
  );
}

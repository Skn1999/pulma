/** Which side you are on, in words (the role colours are only a second cue). Uses the role's accent tokens. */
export function RoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-accent px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
      {label}
    </span>
  );
}

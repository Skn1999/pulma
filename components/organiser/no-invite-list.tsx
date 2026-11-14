import type { Stats } from "@/lib/stats";

export function NoInviteList({ items }: { items: Stats["noInvite"] }) {
  return (
    <section aria-labelledby="no-invite-heading" className="space-y-4">
      <h2 id="no-invite-heading" className="text-2xl font-semibold">
        Answers that didn&apos;t get an invite (yet)
      </h2>
      <p className="max-w-2xl rounded-xl border border-border bg-muted p-4 text-sm">
        A cue to follow up with these people about other opportunities. This is not a ranking, and the list
        is not in any order of quality.
      </p>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Every answer has an invite so far.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {items.map((i) => (
            <li key={i.responseId} className="flex flex-wrap items-baseline gap-x-3 px-4 py-3 text-sm">
              <span className="font-medium">Response #{i.publicCode}</span>
              <span className="text-muted-foreground">{i.cardTitle}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

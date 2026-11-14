"use client";

export interface EventChoice {
  id: string;
  label: string; // eventLabel(ev)
  date: string; // "YYYY-MM-DD"
}

/** Required "Which event?" choice. Native select for keyboard and screen reader support. */
export function EventSelect({
  id, events, value, onChange, disabled,
}: {
  id: string;
  events: EventChoice[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">Which event?</label>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">There is no upcoming event yet. Ask the organisers to add one.</p>
      ) : (
        <select
          id={id}
          required
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      )}
      <p className="text-xs text-muted-foreground">Talent answer your problem for this event, and your meetings happen there.</p>
    </div>
  );
}

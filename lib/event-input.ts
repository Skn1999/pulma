// Validation for a new event. Pure: `now` is passed in.
import type { Event } from "./types";

export type ParsedEvent = Pick<Event, "name" | "date" | "startTime" | "endTime" | "tables" | "venue" | "focus">;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function helsinkiToday(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function parseEventInput(body: unknown, now: number): { ok: true; event: ParsedEvent } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name);
  if (name.length < 3 || name.length > 80) return { ok: false, error: "The name must be 3 to 80 characters." };
  const date = str(b.date);
  if (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { ok: false, error: "Pick a valid date." };
  if (date < helsinkiToday(now)) return { ok: false, error: "The date must be today or later." };
  const startTime = str(b.startTime);
  const endTime = str(b.endTime);
  if (!TIME.test(startTime) || !TIME.test(endTime)) return { ok: false, error: "Enter start and end times as HH:MM." };
  if (Number(startTime.slice(3)) % 10 !== 0 || Number(endTime.slice(3)) % 10 !== 0) return { ok: false, error: "Times must fall on 10-minute marks, like 10:00 or 10:10." };
  if (startTime >= endTime) return { ok: false, error: "The start must be before the end." };
  const tables = typeof b.tables === "number" ? b.tables : Number(b.tables);
  if (!Number.isInteger(tables) || tables < 1 || tables > 30) return { ok: false, error: "Tables must be a whole number from 1 to 30." };
  const venue = str(b.venue);
  if (venue.length < 3 || venue.length > 120) return { ok: false, error: "Add a venue (3 to 120 characters)." };
  const focus = str(b.focus);
  if (focus.length > 120) return { ok: false, error: "Keep the focus to one line (120 characters)." };
  return { ok: true, event: { name, date, startTime, endTime, tables, venue, ...(focus ? { focus } : {}) } };
}

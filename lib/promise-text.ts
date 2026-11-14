// Wording for goals and promises, shared by server and client components. Pure: no I/O.
import { shortDate } from "./next-steps";
import type { HiringGoal, MeetMode } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;

const MODE_SHORT: Record<MeetMode, string> = { office: "office", video: "video", event: "event day" };
const MODE_ORDER: MeetMode[] = ["office", "video", "event"];

/** "Office, video, event day" */
export function modesText(modes: MeetMode[]): string {
  const t = MODE_ORDER.filter((m) => modes.includes(m)).map((m) => MODE_SHORT[m]).join(", ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const replyingText = (goal: HiringGoal) => `Replies within ${plural(goal.replyWithinDays, "day")}`;
export const decidingText = (goal: HiringGoal) => `Deciding by ${shortDate(goal.decideBy)}`;

/** "Deciding by 12 Dec · Replying within 7 days · Office, video, event day" */
export function goalLine(goal: HiringGoal): string {
  return `${decidingText(goal)} · Replying within ${plural(goal.replyWithinDays, "day")} · ${modesText(goal.meetModes)}`;
}

/** The company's own record, as shown to talent. Describes an organisation, never a person. */
export function recordText(rec: { rate: number | null; counted: number } | undefined): string {
  if (!rec || rec.rate === null) return "New on Pulma, no record yet";
  return `On time for ${Math.round(rec.rate * 100)}% of answers (${rec.counted})`;
}

/** Company-side reply promise for one answer that has no reply yet. */
export function replyPromise(dueIso: string, now: number): { overdue: boolean; text: string } {
  const due = Date.parse(dueIso);
  if (now > due) return { overdue: true, text: `Overdue · ${plural(Math.max(1, Math.floor((now - due) / DAY)), "day")}` };
  return { overdue: false, text: `Reply by ${shortDate(dueIso)}` };
}

const slotFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
/** Local Helsinki "YYYY-MM-DDTHH:MM:00" → "Tue 18 Nov, 14:00". Client-safe twin of formatLocalSlot in lib/activity.ts. */
export function localSlotLabel(local: string): string {
  return slotFmt.format(new Date(`${local.slice(0, 16)}:00Z`));
}

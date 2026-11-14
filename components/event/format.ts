// Formatting helpers for schedule and event pages. Schedule times are "YYYY-MM-DDTHH:MM:SS" (local, no Z),
// so slicing is safe and avoids timezone drift between server and browser.

export function fmtTime(iso: string): string {
  return iso.slice(11, 16);
}

/** "Saturday 5 December 2026". Fixed to UTC so server output is stable. */
export function fmtDay(date: string): string {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "5 Dec". */
export function fmtShortDate(date: string): string {
  return new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

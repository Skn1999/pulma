// Pure: turns a schedule into a grid for the public timetable. Imported by the server page only.
import { companiesInEvent, type Schedule } from "@/lib/schedule";
import type { DB, Event } from "@/lib/types";
import { fmtTime } from "./format";

export interface TimetableColumn {
  table: number;
  companies: string[]; // company names assigned to this table (fixed mapping from lib/schedule)
}

export interface TimetableRow {
  time: string;
  cells: (string | null)[]; // one per column: "Response #A7" or null when the table is free
}

export function buildTimetable(db: DB, schedule: Schedule, ev: Event): { columns: TimetableColumn[]; rows: TimetableRow[] } {
  const tables = ev.tables;
  const inEvent = companiesInEvent(db, ev.id);
  const columns: TimetableColumn[] = Array.from({ length: tables }, (_, i) => {
    const table = i + 1;
    const companies = inEvent
      .filter((_, idx) => (idx % tables) + 1 === table)
      .map((id) => db.companies.find((c) => c.id === id)?.name ?? id);
    return { table, companies };
  });

  const codeById = new Map(db.responses.map((r) => [r.id, r.publicCode]));
  const cellByKey = new Map<string, string>();
  for (const slot of schedule.slots) {
    const code = codeById.get(slot.responseId);
    cellByKey.set(`${fmtTime(slot.start)}|${slot.table}`, `Response #${code ?? "?"}`);
  }

  const times = [...new Set(schedule.slots.map((s) => fmtTime(s.start)))].sort();
  const rows: TimetableRow[] = times.map((time) => ({
    time,
    cells: columns.map((col) => cellByKey.get(`${time}|${col.table}`) ?? null),
  }));

  return { columns, rows };
}

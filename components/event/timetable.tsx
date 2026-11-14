import type { TimetableColumn, TimetableRow } from "./build-timetable";

export function Timetable({ columns, rows }: { columns: TimetableColumn[]; rows: TimetableRow[] }) {
  return (
    <div
      role="region"
      aria-labelledby="timetable-caption"
      tabIndex={0}
      className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption id="timetable-caption" className="border-b border-border px-4 py-3 text-left text-sm font-medium text-muted-foreground">
          Full timetable: meetings by start time and table. Response codes only, no names.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 border-b border-border px-4 py-3 font-semibold">
              Time
            </th>
            {columns.map((col) => (
              <th key={col.table} scope="col" className="border-b border-border px-4 py-3 font-semibold">
                <span className="block">Table {col.table}</span>
                <span className="block font-normal text-muted-foreground">
                  {col.companies.length > 0 ? col.companies.join(", ") : "No company assigned"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.time} className="align-top">
              <th scope="row" className="border-b border-border px-4 py-3 font-medium tabular-nums">
                {row.time}
              </th>
              {row.cells.map((cell, i) => (
                <td key={columns[i].table} className="border-b border-border px-4 py-3">
                  {cell ? (
                    <span className="inline-block rounded-md bg-accent px-2 py-1 font-medium text-accent-foreground">
                      {cell}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      <span aria-hidden="true">&mdash;</span>
                      <span className="sr-only">No meeting</span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

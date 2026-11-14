// Organiser view of promises kept. Describes ORGANISATIONS (and their problems), never people.
// Companies are listed alphabetically on purpose: this is not a ranking.
import { cardState, companyRecord, decideByDays, goalOf, type CompanyRecord } from "./deadlines";
import type { DB } from "./types";

export interface PromiseRow extends CompanyRecord {
  companyId: string;
  name: string;
  problems: number;
}

export interface PastDecideBy {
  cardId: string;
  title: string;
  companyName: string;
  decideBy: string;
}

export function promisesKept(db: DB, now: number): { companies: PromiseRow[]; pastDecideBy: PastDecideBy[] } {
  const companies = db.companies
    .map((c) => ({
      companyId: c.id,
      name: c.name,
      problems: db.cards.filter((x) => x.companyId === c.id && x.status === "published").length,
      ...companyRecord(db, c.id, now),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  const pastDecideBy = db.cards
    .filter((c) => c.status === "published" && cardState(c) === "open" && decideByDays(goalOf(c, db), now) < 0)
    .map((c) => ({
      cardId: c.id,
      title: c.title,
      companyName: db.companies.find((co) => co.id === c.companyId)?.name ?? "",
      decideBy: goalOf(c, db).decideBy,
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, "en") || a.title.localeCompare(b.title, "en"));
  return { companies, pastDecideBy };
}

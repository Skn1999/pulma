// One anonymous example answer shown to companies on an invitation ("What would we read?"). Pure.
import type { DB } from "./types";

/**
 * One example answer to show companies what they will read. Chosen by hand for the demo (fictional data);
 * in a real deployment it would be shared only with the author's explicit permission.
 */
export const EXAMPLE_ANSWER_ID = "r-l2";

export function exampleAnswer(db: DB): { problemTitle: string; text: string } | null {
  const r = db.responses.find((x) => x.id === EXAMPLE_ANSWER_ID);
  const card = r && db.cards.find((c) => c.id === r.cardId);
  return r && card ? { problemTitle: card.title, text: r.text } : null;
}

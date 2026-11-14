// The company's blind view of the answers to one problem. Pure; privacy is decided here.
// Only fields on the Response, Shortlist and Closure are read: nothing about the talent (name, skills, goal) is.
import { inviteStatus, isOpen, replyDueAt } from "./deadlines";
import type { BlindResponse, DB, ProblemCard } from "./types";

/** Answers for one card in a stable base order (by id). The caller applies the seeded shuffle. */
export function buildBlindResponses(db: DB, card: ProblemCard, now: number): BlindResponse[] {
  return db.responses
    .filter((r) => r.cardId === card.id)
    .map((r) => {
      const s = db.shortlists.find((x) => x.responseId === r.id);
      const cl = db.closures.find((x) => x.responseId === r.id);
      return {
        id: r.id,
        publicCode: r.publicCode,
        text: r.text,
        originalLanguage: r.originalLanguage,
        translatedText: r.translatedText,
        aiAssisted: r.aiAssisted,
        shortlist: s
          ? (() => {
              const inv = inviteStatus(db, s, now);
              return { status: s.status, note: s.note, message: s.message, respondBy: inv.respondBy, expired: inv.expired };
            })()
          : undefined,
        closed: cl ? { id: cl.id, reason: cl.reason } : undefined,
        // A paused or filled problem already told everyone, so there is no reply date left to show.
        ...(isOpen(card) ? { replyDue: replyDueAt(db, r) } : {}),
        steppedBack: r.steppedBack ? { until: r.steppedBack.until } : undefined,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

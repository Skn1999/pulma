// Server-only: who may act on a meeting. Talent owns it via the answer; the company via the problem card.
import { NextResponse } from "next/server";
import { getDB } from "./store";
import type { Account, DB, Meeting } from "./types";

export interface MeetingAccess { db: DB; meeting: Meeting; side: "talent" | "company" }

export function meetingAccess(acc: Account, id: string, only?: "talent" | "company"): MeetingAccess | NextResponse {
  const db = getDB();
  const meeting = db.meetings.find((m) => m.id === id);
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = db.responses.find((r) => r.id === meeting.responseId);
  const card = db.cards.find((c) => c.id === meeting.cardId);
  let side: "talent" | "company" | null = null;
  if (acc.role === "talent" && response && acc.talentId === response.talentId) side = "talent";
  if (acc.role === "company" && card && acc.companyId === card.companyId) side = "company";
  if (!side) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (only && side !== only) return NextResponse.json({ error: `Only the ${only} can do this` }, { status: 403 });
  return { db, meeting, side };
}

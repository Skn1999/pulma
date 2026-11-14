import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate, newId } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { defaultGoal, isOpen } from "@/lib/deadlines";
import { parseGoal } from "@/lib/goal-input";
import type { CardDraft, Format, ProblemCard } from "@/lib/types";

export async function GET() {
  const db = getDB();
  const cards = db.cards
    .filter((c) => isOpen(c))
    .map((c) => ({ ...c, company: db.companies.find((co) => co.id === c.companyId) }));
  return NextResponse.json(cards);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export async function POST(req: Request) {
  const acc = await apiAccount("company");
  if (acc instanceof NextResponse) return acc;
  const body = await req.json().catch(() => null);
  const d = body?.draft as Partial<CardDraft> | undefined;
  const companyId = acc.companyId ?? "";
  if (!d || !companyId) return NextResponse.json({ error: "draft and companyId required" }, { status: 400 });
  if (!getDB().companies.some((c) => c.id === companyId)) return NextResponse.json({ error: "Unknown company" }, { status: 400 });
  const title = str(d.title);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const format: Format = d.format === "onsite" || d.format === "online" || d.format === "hybrid" ? d.format : "hybrid";
  let goal = undefined as ProblemCard["goal"];
  if (body?.goal !== undefined && body.goal !== null) {
    const parsed = parseGoal(body.goal, defaultGoal(getDB()));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    goal = parsed.goal;
  }
  const needed = (d as { languagesNeeded?: unknown }).languagesNeeded;
  const card: ProblemCard = {
    id: newId("card"),
    companyId,
    title,
    context: str(d.context),
    weekOneReality: str(d.weekOneReality),
    hardPart: str(d.hardPart),
    niceToHave: strs(d.niceToHave),
    languages: strs(d.languages),
    ...(Array.isArray(needed) ? { languagesNeeded: strs(needed).filter((l) => strs(d.languages).includes(l)) } : {}),
    format,
    goal: goal ?? defaultGoal(getDB()),
    status: "published",
    createdAt: new Date().toISOString(),
  };
  mutate((db) => {
    db.cards.push(card);
    logActivity(db, { kind: "card_published", actor: "company", cardId: card.id, companyId, at: card.createdAt });
  });
  return NextResponse.json(card, { status: 201 });
}

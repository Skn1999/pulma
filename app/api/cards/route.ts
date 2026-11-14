import { NextResponse } from "next/server";
import { getDB, mutate, newId } from "@/lib/store";
import type { CardDraft, Format, ProblemCard } from "@/lib/types";

export async function GET() {
  const db = getDB();
  const cards = db.cards
    .filter((c) => c.status === "published")
    .map((c) => ({ ...c, company: db.companies.find((co) => co.id === c.companyId) }));
  return NextResponse.json(cards);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const d = body?.draft as Partial<CardDraft> | undefined;
  const companyId = str(body?.companyId);
  if (!d || !companyId) return NextResponse.json({ error: "draft and companyId required" }, { status: 400 });
  if (!getDB().companies.some((c) => c.id === companyId)) return NextResponse.json({ error: "Unknown company" }, { status: 400 });
  const title = str(d.title);
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const format: Format = d.format === "onsite" || d.format === "online" || d.format === "hybrid" ? d.format : "hybrid";
  const card: ProblemCard = {
    id: newId("card"),
    companyId,
    title,
    context: str(d.context),
    weekOneReality: str(d.weekOneReality),
    hardPart: str(d.hardPart),
    niceToHave: strs(d.niceToHave),
    languages: strs(d.languages),
    format,
    status: "published",
    createdAt: new Date().toISOString(),
  };
  mutate((db) => db.cards.push(card));
  return NextResponse.json(card, { status: 201 });
}

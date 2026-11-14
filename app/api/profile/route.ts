import { NextResponse } from "next/server";
import { getDB, mutate } from "@/lib/store";
import { SESSION_COOKIE, apiAccount, sessionCookieOptions } from "@/lib/session";

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const SECTORS = ["Game studio", "Clean-tech", "Medtech", "B2B SaaS", "Logistics", "Robotics", "Other"];

function view(accId: string) {
  const db = getDB();
  const a = db.accounts.find((x) => x.id === accId)!;
  const talent = a.talentId ? db.talents.find((t) => t.id === a.talentId) : undefined;
  const company = a.companyId ? db.companies.find((c) => c.id === a.companyId) : undefined;
  return {
    email: a.email,
    role: a.role,
    displayName: a.displayName,
    createdAt: a.createdAt,
    preferredLanguage: talent?.preferredLanguage ?? "",
    company: company ? { name: company.name, sector: company.sector, size: company.size, about: company.about } : undefined,
  };
}

export async function GET() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  return NextResponse.json(view(acc.id));
}

export async function PATCH(req: Request) {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  if ("role" in b || "email" in b) return NextResponse.json({ error: "Account type and email can't be changed" }, { status: 400 });
  const name = "displayName" in b ? str(b.displayName, 80) : undefined;
  if (name === "") return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  const co = b.company && typeof b.company === "object" ? (b.company as Record<string, unknown>) : undefined;
  if (co && "name" in co && !str(co.name, 80)) return NextResponse.json({ error: "Company name can't be empty" }, { status: 400 });
  if (co && "sector" in co && !SECTORS.includes(str(co.sector, 40))) return NextResponse.json({ error: "Choose a sector" }, { status: 400 });

  mutate((db) => {
    const a = db.accounts.find((x) => x.id === acc.id)!;
    if (name) a.displayName = name;
    if (a.role === "talent") {
      const t = db.talents.find((x) => x.id === a.talentId);
      if (t) {
        if (name) t.displayName = name;
        if ("preferredLanguage" in b) t.preferredLanguage = str(b.preferredLanguage, 40) || undefined;
      }
    }
    if (a.role === "company" && co) {
      const c = db.companies.find((x) => x.id === a.companyId);
      if (c) {
        if ("name" in co) c.name = str(co.name, 80);
        if ("sector" in co) c.sector = str(co.sector, 40);
        if ("size" in co) c.size = str(co.size, 40);
        if ("about" in co) c.about = str(co.about, 600);
      }
    }
  });
  return NextResponse.json(view(acc.id));
}

export async function DELETE() {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  mutate((db) => {
    const respIds = new Set(db.responses.filter((r) => r.talentId === acc.talentId).map((r) => r.id));
    db.shortlists = db.shortlists.filter((s) => !respIds.has(s.responseId));
    db.meetings = db.meetings.filter((m) => !respIds.has(m.responseId));
    db.responses = db.responses.filter((r) => !respIds.has(r.id));
    db.talents = db.talents.filter((t) => t.id !== acc.talentId);
    db.accounts = db.accounts.filter((a) => a.id !== acc.id);
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}

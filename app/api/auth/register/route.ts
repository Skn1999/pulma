import { NextResponse } from "next/server";
import { mutate, newId, syncDB } from "@/lib/store";
import { SESSION_COOKIE, normEmail, roleHome, sessionCookieOptions } from "@/lib/session";
import type { Account, Company, Role, Talent } from "@/lib/types";

const SECTORS = ["Game studio", "Clean-tech", "Medtech", "B2B SaaS", "Logistics", "Robotics", "Other"];
const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const ROLE_LABEL: Record<Role, string> = { company: "Company", talent: "Talent", organiser: "Organiser" };

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = normEmail(b?.email);
  const role = b?.role as Role;
  const p = (b?.profile && typeof b.profile === "object" ? b.profile : {}) as Record<string, unknown>;
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  if (role !== "company" && role !== "talent" && role !== "organiser")
    return NextResponse.json({ error: "Choose how you will use Pulma" }, { status: 400 });
  const displayName = str(p.displayName, 80);
  if (!displayName) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  let companyName = "", sector = "", size = "", about = "";
  if (role === "company") {
    companyName = str(p.companyName, 80);
    sector = str(p.sector, 40);
    size = str(p.size, 40);
    about = str(p.about, 600);
    if (!companyName) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    if (!SECTORS.includes(sector)) return NextResponse.json({ error: "Choose a sector" }, { status: 400 });
  }

  await syncDB();
  const result = mutate((db) => {
    const existing = db.accounts.find((a) => a.email === email);
    if (existing) return { conflict: existing.role };
    const acc: Account = { id: newId("acc"), email, role, displayName, createdAt: new Date().toISOString() };
    if (role === "talent") {
      const t: Talent = { id: newId("t"), displayName, email };
      const lang = str(p.preferredLanguage, 40);
      if (lang) t.preferredLanguage = lang;
      db.talents.push(t);
      acc.talentId = t.id;
    } else if (role === "company") {
      const c: Company = { id: newId("co"), name: companyName, sector, size, about };
      db.companies.push(c);
      acc.companyId = c.id;
    }
    db.accounts.push(acc);
    return { acc };
  });

  if ("conflict" in result) {
    const r = result.conflict as Role;
    return NextResponse.json(
      { error: `${email} is already registered as ${ROLE_LABEL[r]}. Sign in instead.`, role: r },
      { status: 409 },
    );
  }
  const res = NextResponse.json({ home: roleHome(role) }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, result.acc.id, sessionCookieOptions);
  return res;
}

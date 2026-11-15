import { NextResponse } from "next/server";
import { loadDB } from "@/lib/store";
import { SESSION_COOKIE, normEmail, roleHome, sessionCookieOptions } from "@/lib/session";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = normEmail(b?.email);
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  const acc = (await loadDB()).accounts.find((a) => a.email === email);
  if (!acc) return NextResponse.json({ status: "new" });
  const res = NextResponse.json({ status: "signed-in", role: acc.role, home: roleHome(acc.role) });
  res.cookies.set(SESSION_COOKIE, acc.id, sessionCookieOptions);
  return res;
}

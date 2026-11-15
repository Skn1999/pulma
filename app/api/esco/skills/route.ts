import { NextResponse } from "next/server";
import { getAccount } from "@/lib/session";
import { suggestSkills } from "@/lib/esco";

// Any signed-in account. Only the typed text goes to ESCO (a public API); no names, emails or ids.
export async function GET(req: Request) {
  if (!(await getAccount())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });
  const suggestions = await suggestSkills(q, url.searchParams.get("lang") ?? "en");
  return NextResponse.json({ suggestions });
}

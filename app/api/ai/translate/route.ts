import { NextResponse } from "next/server";
import { translate } from "@/lib/ai";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.text !== "string" || !b.text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  const from = typeof b.from === "string" ? b.from : "auto";
  const to = typeof b.to === "string" && b.to ? b.to : "English";
  return NextResponse.json(await translate(b.text, from, to));
}

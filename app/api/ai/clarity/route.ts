import { NextResponse } from "next/server";
import { suggestClarity } from "@/lib/ai";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b.text !== "string" || !b.text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
  return NextResponse.json(await suggestClarity(b.text));
}

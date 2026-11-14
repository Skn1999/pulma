import { NextResponse } from "next/server";
import { generateProblemCard } from "@/lib/ai";
import type { IntakeAnswers } from "@/lib/types";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const a: IntakeAnswers = { problem: s(b.problem), firstWeek: s(b.firstWeek), hardPart: s(b.hardPart), bonus: s(b.bonus), languages: s(b.languages) };
  return NextResponse.json(await generateProblemCard(a));
}

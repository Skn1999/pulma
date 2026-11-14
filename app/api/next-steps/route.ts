import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { nextSteps } from "@/lib/next-steps";

export async function GET() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ waitingOnYou: [], waitingOnThem: [] });
  return NextResponse.json(nextSteps(getDB(), acc, Date.now()));
}

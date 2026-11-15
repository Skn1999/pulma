import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { flushDB, resetDB } from "@/lib/store";

export async function POST() {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  resetDB();
  await flushDB();
  return NextResponse.json({ ok: true });
}

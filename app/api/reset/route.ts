import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { resetDB } from "@/lib/store";

export async function POST() {
  const acc = await apiAccount("organiser");
  if (acc instanceof NextResponse) return acc;
  resetDB();
  return NextResponse.json({ ok: true });
}

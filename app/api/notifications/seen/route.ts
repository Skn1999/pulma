import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { mutate } from "@/lib/store";

export async function POST() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ ok: true });
  mutate((db) => {
    const row = db.accounts.find((a) => a.id === acc.id);
    if (row) row.notificationsSeenAt = new Date().toISOString();
  });
  return NextResponse.json({ ok: true });
}

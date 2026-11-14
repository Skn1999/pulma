import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { feedFor, unseenCount } from "@/lib/activity";

export async function GET() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  if (acc.role === "organiser") return NextResponse.json({ unseen: 0, items: [] });
  const db = getDB();
  return NextResponse.json({
    unseen: unseenCount(db, acc),
    items: feedFor(db, acc, { limit: 30 }).filter((i) => !i.byMe).slice(0, 20),
  });
}

import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB, mutate } from "@/lib/store";
import { needsSweep, sweepDeadlines } from "@/lib/sweep";
import { followUpsDue, sweepFollowUps } from "@/lib/outcomes";
import { feedFor, unseenCount } from "@/lib/activity";

export async function GET() {
  const acc = await apiAccount();
  if (acc instanceof NextResponse) return acc;
  const now = Date.now();
  // A follow-up window that has ended is closed here too (anonymous snapshot kept, personal data deleted).
  if (followUpsDue(getDB(), now).length > 0) mutate((d) => sweepFollowUps(d, now));
  if (acc.role === "organiser") return NextResponse.json({ unseen: 0, items: [] });
  if (needsSweep(getDB(), now)) mutate((d) => sweepDeadlines(d, now));
  const db = getDB();
  return NextResponse.json({
    unseen: unseenCount(db, acc),
    items: feedFor(db, acc, { limit: 30 }).filter((i) => !i.byMe).slice(0, 20),
  });
}

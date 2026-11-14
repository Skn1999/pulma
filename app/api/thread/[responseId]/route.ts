import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { buildThread } from "@/lib/thread";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ responseId: string }> }) {
  const account = await apiAccount();
  if (account instanceof NextResponse) return account;
  const { responseId } = await ctx.params;
  const thread = buildThread(getDB(), account, responseId);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thread);
}

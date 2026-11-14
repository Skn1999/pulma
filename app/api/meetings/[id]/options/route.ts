import { NextResponse } from "next/server";
import { apiAccount } from "@/lib/session";
import { meetingAccess } from "@/lib/meeting-access";
import { slotOptions } from "@/lib/slots";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acc = await apiAccount("talent");
  if (acc instanceof NextResponse) return acc;
  const { id } = await params;
  const a = meetingAccess(acc, id, "talent");
  if (a instanceof NextResponse) return a;
  return NextResponse.json({ options: slotOptions(a.db, id, Date.now()) });
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getDB, syncDB } from "./store";
import type { Account, Role } from "./types";

export const SESSION_COOKIE = "pulma_session";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
};

export function normEmail(s: string): string {
  return String(s ?? "").trim().toLowerCase();
}

export function roleHome(role: Role): string {
  return role === "company" ? "/company" : role === "talent" ? "/talent/home" : "/organiser";
}

export async function getAccount(): Promise<Account | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  await syncDB();
  return getDB().accounts.find((a) => a.id === id) ?? null;
}

export async function requireAccount(role?: Role): Promise<Account> {
  const a = await getAccount();
  if (!a) redirect("/signin");
  if (role && a.role !== role) redirect(roleHome(a.role));
  return a;
}

export async function apiAccount(role?: Role): Promise<Account | NextResponse> {
  const a = await getAccount();
  if (!a) return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  if (role && a.role !== role) return NextResponse.json({ error: `This is only available to ${role} accounts` }, { status: 403 });
  return a;
}

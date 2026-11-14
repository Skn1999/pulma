import { getAccount } from "./session";
import type { Role } from "./types";

// Thin wrappers over the signed-in account (see lib/session.ts).
export async function getRole(): Promise<Role> {
  return (await getAccount())?.role ?? "talent";
}
export async function getCompanyId(): Promise<string> {
  return (await getAccount())?.companyId ?? "";
}
export async function getTalentId(): Promise<string> {
  return (await getAccount())?.talentId ?? "";
}

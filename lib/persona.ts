import { cookies } from "next/headers";
import type { Role } from "./types";

export async function getRole(): Promise<Role> {
  const v = (await cookies()).get("pulma_role")?.value;
  return v === "company" || v === "talent" || v === "organiser" ? v : "talent";
}
export async function getCompanyId(): Promise<string> {
  return (await cookies()).get("pulma_company")?.value || "co-cleantech";
}
export async function getTalentId(): Promise<string> {
  return (await cookies()).get("pulma_talent")?.value || "t-olena";
}

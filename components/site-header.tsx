import Link from "next/link";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types";
import { RoleSwitcher } from "@/components/role-switcher";

export async function SiteHeader() {
  const jar = await cookies();
  const v = jar.get("pulma_role")?.value;
  const role: Role = v === "company" || v === "organiser" || v === "talent" ? v : "talent";
  return (
    <header className="border-b border-border bg-background/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-foreground rounded-sm">
          Pulma
        </Link>
        <RoleSwitcher role={role} />
      </div>
    </header>
  );
}

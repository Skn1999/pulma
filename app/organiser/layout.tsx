import { requireAccount } from "@/lib/session";
import { AppShell } from "@/components/shell/app-shell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAccount("organiser");
  return <AppShell>{children}</AppShell>;
}

import Link from "next/link";
import { requireAccount, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

// Plain frame without the app shell, so the card prints cleanly and fills a phone screen at the event.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount();
  return (
    <div className="min-h-dvh bg-muted/40 print:bg-white">
      <header className="flex h-12 items-center justify-between border-b bg-background px-4 print:hidden">
        <Link href="/" className="font-display text-xl font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring">Pulma</Link>
        <Link
          href={roleHome(account.role)}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring"
        >
          Back to the app
        </Link>
      </header>
      <main id="main" className="px-4 py-6 print:p-0">{children}</main>
    </div>
  );
}

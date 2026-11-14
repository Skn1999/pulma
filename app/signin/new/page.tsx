import { redirect } from "next/navigation";
import { getAccount, roleHome } from "@/lib/session";
import { NewAccountForm } from "./new-account-form";

export const metadata = { title: "Create account · Pulma" };

export default async function NewAccountPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const account = await getAccount();
  if (account) redirect(roleHome(account.role));
  const { email } = await searchParams;
  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="font-display text-3xl font-semibold text-primary">Pulma</p>
        <NewAccountForm initialEmail={(email ?? "").trim()} />
      </div>
    </main>
  );
}

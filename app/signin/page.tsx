import { redirect } from "next/navigation";
import { getAccount, roleHome } from "@/lib/session";
import { SigninForm } from "./signin-form";

export const metadata = { title: "Sign in · Pulma" };

export default async function SigninPage() {
  const account = await getAccount();
  if (account) redirect(roleHome(account.role));
  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto grid min-h-dvh max-w-5xl items-center gap-10 px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-16">
        <section aria-labelledby="brand">
          <p id="brand" className="font-display text-5xl font-semibold tracking-tight text-primary sm:text-6xl">
            Pulma
          </p>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-foreground/80">
            Companies bring a real problem. Talent answers in their own words. Names are shared only when both say yes.
          </p>
        </section>
        <SigninForm />
      </div>
    </main>
  );
}

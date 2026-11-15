"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SandboxStatus } from "@/components/sandbox-status";

const DEMOS = [
  { name: "Kiertovolt", role: "Company", email: "hiring@kiertovolt.example", Icon: Building2 },
  { name: "Olena Kovalenko", role: "Talent", email: "olena.k@example.com", Icon: Sprout },
  { name: "Event team", role: "Organiser", email: "events@talentday.example", Icon: CalendarDays },
];

export function SigninForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(value: string) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else if (data.status === "new") {
        router.push(`/signin/new?email=${encodeURIComponent(value.trim())}`);
        return;
      } else {
        router.push(data.home ?? "/");
        router.refresh();
        return;
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    }
    setBusy(false);
  }

  return (
    <section aria-labelledby="signin-h" className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      <h1 id="signin-h" className="font-display text-2xl font-semibold">
        Sign in
      </h1>
      <form
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void go(email);
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-describedby="email-hint"
          />
          <p id="email-hint" className="text-sm text-muted-foreground">
            No password in this demo. New here? Enter your email and we will set you up.
          </p>
        </div>
        <p aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
          {error}
        </p>
        <Button type="submit" disabled={busy || !email.trim()} className="w-full">
          Continue
        </Button>
      </form>

      <div className="mt-8 border-t pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Demo accounts</h2>
        <ul className="mt-3 space-y-2">
          {DEMOS.map(({ name, role, email: e, Icon }) => (
            <li key={e}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void go(e)}
                className="flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <Icon className="size-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {name} <span className="font-normal text-muted-foreground">· {role}</span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{e}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <SandboxStatus variant="pill" />
        </div>
      </div>
    </section>
  );
}

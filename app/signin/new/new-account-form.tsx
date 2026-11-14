"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarDays, Lock, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Role = "company" | "talent" | "organiser";
const ROLES: { value: Role; title: string; text: string; Icon: typeof Building2 }[] = [
  { value: "company", title: "I'm hiring", text: "Post a real problem your team is stuck on.", Icon: Building2 },
  { value: "talent", title: "I'm looking", text: "Answer problems in your own words.", Icon: Sprout },
  { value: "organiser", title: "I'm organising", text: "Run the event and follow how it goes.", Icon: CalendarDays },
];
const ROLE_LABEL: Record<Role, string> = { company: "Company", talent: "Talent", organiser: "Organiser" };
const SECTORS = ["Game studio", "Clean-tech", "Medtech", "B2B SaaS", "Logistics", "Robotics", "Other"];

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function NewAccountForm({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<Role | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState("");
  const [preferredLanguage, setLang] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState("");
  const [about, setAbout] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setError("");
    setConflict(null);
    setBusy(true);
    const profile =
      role === "talent"
        ? { displayName, preferredLanguage }
        : role === "company"
          ? { displayName, companyName, sector, size, about }
          : { displayName };
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, profile }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflict(data.role as Role);
      } else if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
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
    <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (role) setStep(2);
          }}
          className="space-y-6"
        >
          <Field id="email" label="Email">
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <fieldset className="space-y-3">
            <legend className="font-display text-2xl font-semibold">What will you use Pulma for?</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {ROLES.map(({ value, title, text, Icon }) => (
                <label
                  key={value}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-2 rounded-lg border bg-background p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    role === value ? "border-primary bg-accent ring-1 ring-primary" : "hover:bg-accent/50",
                  )}
                >
                  <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
                  <Icon className="size-6 text-primary" aria-hidden />
                  <span className="font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{text}</span>
                  <span className={cn("text-xs font-semibold text-primary", role === value ? "visible" : "invisible")}>Selected</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-accent/60 p-3 text-sm font-medium">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              This choice is permanent for {email || "this email"}. To use Pulma in another way later, you&apos;ll need a different email.
            </span>
          </p>
          <div className="flex items-center justify-between">
            <Link href="/signin" className="text-sm underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Back to sign in
            </Link>
            <Button type="submit" disabled={!role || !email.trim()}>
              Next
            </Button>
          </div>
        </form>
      )}

      {step === 2 && role && (
        <form onSubmit={submit} className="space-y-5">
          <h1 className="font-display text-2xl font-semibold">Your {ROLE_LABEL[role].toLowerCase()} profile</h1>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="size-4" aria-hidden /> {email} · {ROLE_LABEL[role]} account (permanent)
          </p>
          {role === "talent" && (
            <p className="rounded-lg border bg-background p-3 text-sm">
              We collect only your display name, your email and, optionally, a preferred language. Nothing else. Companies never see them until you accept a meeting.
            </p>
          )}
          <Field id="name" label={role === "company" ? "Your name (hiring contact)" : "Display name"}>
            <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
          </Field>
          {role === "talent" && (
            <Field id="lang" label="Preferred language (optional)">
              <Input id="lang" value={preferredLanguage} onChange={(e) => setLang(e.target.value)} placeholder="e.g. Finnish" />
            </Field>
          )}
          {role === "company" && (
            <>
              <Field id="company" label="Company name">
                <Input id="company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </Field>
              <Field id="sector" label="Sector">
                <select
                  id="sector"
                  required
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose a sector</option>
                  {SECTORS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field id="size" label="Company size (optional)">
                <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 40 people" />
              </Field>
              <Field id="about" label="About the company (optional)">
                <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} />
              </Field>
            </>
          )}
          <div aria-live="polite" className="min-h-5 text-sm font-medium text-destructive">
            {conflict ? (
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  {email} is already registered as {ROLE_LABEL[conflict]}. Sign in instead.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => router.push("/signin")}>
                  Sign in
                </Button>
              </div>
            ) : (
              error
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={busy}>
              Create account
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

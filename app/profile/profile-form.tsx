"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Role = "company" | "talent" | "organiser";
const LABEL: Record<Role, string> = { company: "Company", talent: "Talent", organiser: "Organiser" };
const OTHER: Record<Role, string> = { company: "talent or organiser", talent: "company or organiser", organiser: "company or talent" };
const SECTORS = ["Game studio", "Clean-tech", "Medtech", "B2B SaaS", "Logistics", "Robotics", "Other"];
const STORED: Record<Role, string[]> = {
  talent: ["Display name", "Email", "Preferred language (optional)", "Your answers to problem cards", "Skills you choose to keep (only you see them; your CV is never saved)"],
  company: ["Contact name", "Email", "Company name, sector, size and description", "Problem cards you publish and your private shortlist notes"],
  organiser: ["Display name", "Email"],
};

interface Initial {
  displayName: string;
  preferredLanguage: string;
  companyName: string;
  sector: string;
  size: string;
  about: string;
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ProfileForm({ email, role, initial }: { email: string; role: Role; initial: Initial }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (k: keyof Initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body: Record<string, unknown> = { displayName: v.displayName };
    if (role === "talent") body.preferredLanguage = v.preferredLanguage;
    if (role === "company") body.company = { name: v.companyName, sector: v.sector, size: v.size, about: v.about };
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Profile saved");
        router.refresh();
      } else toast.error(data.error ?? "Could not save your profile");
    } catch {
      toast.error("Could not reach the server");
    }
    setSaving(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
    router.push("/signin");
    router.refresh();
  }

  async function deleteData() {
    setDeleting(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        toast.success("Your data has been deleted");
        router.push("/signin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Could not delete your data");
    } catch {
      toast.error("Could not reach the server");
    }
    setDeleting(false);
  }

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="acct" className="rounded-xl border bg-card p-5">
        <h2 id="acct" className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Account
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              <Lock className="size-4 text-muted-foreground" aria-hidden /> {email}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Account type</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              <Lock className="size-4 text-muted-foreground" aria-hidden /> {LABEL[role]}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Account type is tied to this email. To use Pulma as a {OTHER[role]}, sign in with a different email.
        </p>
      </section>

      <form onSubmit={save} className="space-y-5">
        <h2 className="font-display text-xl font-semibold">Your details</h2>
        <Field id="name" label={role === "company" ? "Contact name" : "Display name"}>
          <Input id="name" required value={v.displayName} onChange={set("displayName")} />
        </Field>
        {role === "talent" && (
          <Field id="lang" label="Preferred language (optional)">
            <Input id="lang" value={v.preferredLanguage} onChange={set("preferredLanguage")} />
          </Field>
        )}
        {role === "company" && (
          <>
            <Field id="company" label="Company name">
              <Input id="company" required value={v.companyName} onChange={set("companyName")} />
            </Field>
            <Field id="sector" label="Sector">
              <select
                id="sector"
                value={v.sector}
                onChange={set("sector")}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {!SECTORS.includes(v.sector) && <option value={v.sector}>{v.sector}</option>}
                {SECTORS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field id="size" label="Company size">
              <Input id="size" value={v.size} onChange={set("size")} />
            </Field>
            <Field id="about" label="About the company">
              <Textarea id="about" rows={3} value={v.about} onChange={set("about")} />
            </Field>
          </>
        )}
        <Button type="submit" disabled={saving}>
          Save changes
        </Button>
      </form>

      <section aria-labelledby="stored" className="rounded-xl border bg-card p-5">
        <h2 id="stored" className="font-display text-xl font-semibold">
          What we store about you
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          {STORED[role].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">Nothing else. This is a prototype with fictional data.</p>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="button" variant="outline" onClick={signOut}>
          Sign out
        </Button>
        {role === "talent" && (
          <Button type="button" variant="destructive" onClick={() => setConfirm(true)}>
            Delete my data
          </Button>
        )}
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete all your data?</DialogTitle>
            <DialogDescription>
              This removes your account, your answers, invitations and booked meetings. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={deleteData}>
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

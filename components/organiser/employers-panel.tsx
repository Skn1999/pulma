"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ParticipationBadge } from "@/components/events/stage-badge";
import type { Participation } from "@/lib/types";

export interface EmployerRow {
  id: string; // participation id
  name: string;
  sector: string;
  status: Participation["status"];
  table?: number;
  invitedOn: string;
  note?: string;
  blockedReason?: string; // why this company can't be removed now
}

export interface Invitable {
  id: string;
  name: string;
  sector: string;
}

async function call(url: string, method: string, body?: object): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  if (res?.ok) return null;
  return (res ? ((await res.json().catch(() => null)) as { error?: string } | null)?.error : undefined) ?? "That didn't save. Please try again.";
}

export function EmployersPanel({
  eventId, rows, tables, frozen, invitable, seatsLeft,
}: {
  eventId: string;
  rows: EmployerRow[];
  tables: number;
  frozen: boolean; // locked or done: no invites, no table changes
  invitable: Invitable[];
  seatsLeft: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<EmployerRow | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const taken = new Set(rows.filter((r) => r.status === "confirmed").map((r) => r.table));

  async function setTable(r: EmployerRow, table: number) {
    setError("");
    const err = await call(`/api/participations/${r.id}`, "PATCH", { table });
    if (err) setError(err);
    else toast.success(`${r.name} moved to table ${table}`);
    router.refresh();
  }

  async function remove(r: EmployerRow) {
    setBusy(true);
    const err = await call(`/api/participations/${r.id}/withdraw`, "POST");
    setBusy(false);
    setRemoving(null);
    if (err) setError(err);
    else toast.success(`${r.name} removed from the event`);
    router.refresh();
  }

  async function invite() {
    setBusy(true);
    setInviteError("");
    const err = await call(`/api/events/${eventId}/invites`, "POST", { companyIds: picked, note });
    setBusy(false);
    if (err) return setInviteError(err);
    toast.success(picked.length === 1 ? "Invitation sent" : "Invitations sent");
    setInviteOpen(false);
    setPicked([]);
    setNote("");
    router.refresh();
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <section aria-labelledby="employers-h" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="employers-h" className="font-display text-lg font-semibold">Employers</h2>
          <p className="text-sm text-muted-foreground">{seatsLeft} of {tables} tables still free (a pending invitation holds one).</p>
        </div>
        <Button disabled={frozen || seatsLeft <= 0 || invitable.length === 0} onClick={() => setInviteOpen(true)}>
          <UserPlus aria-hidden="true" /> Invite companies
        </Button>
      </div>
      {frozen && <p className="text-sm text-muted-foreground">This event is locked, so invitations and tables are fixed.</p>}
      {!frozen && seatsLeft <= 0 && <p className="text-sm text-muted-foreground">Every table is taken. Remove a company to invite another.</p>}
      <p role="alert" className="text-sm text-destructive">{error}</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-display text-lg font-semibold">No companies yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Invite companies. Each one that accepts gets a table and can publish up to 3 problems.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Companies invited to this event</caption>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium">Company</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 font-medium">Table</th>
                <th scope="col" className="px-3 py-2 font-medium">Invited</th>
                <th scope="col" className="px-4 py-2 text-right font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-medium">
                    {r.name}
                    <span className="block text-xs font-normal text-muted-foreground">{r.sector}</span>
                  </th>
                  <td className="px-3 py-3"><ParticipationBadge status={r.status} /></td>
                  <td className="px-3 py-3">
                    {r.status === "confirmed" ? (
                      <>
                        <label htmlFor={`t-${r.id}`} className="sr-only">Table for {r.name}</label>
                        <select
                          id={`t-${r.id}`}
                          disabled={frozen}
                          value={r.table}
                          onChange={(e) => void setTable(r, Number(e.target.value))}
                          className="h-10 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
                        >
                          {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
                            <option key={t} value={t} disabled={taken.has(t) && t !== r.table}>
                              Table {t}{taken.has(t) && t !== r.table ? " (taken)" : ""}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r.invitedOn}</td>
                  <td className="px-4 py-3 text-right">
                    {(r.status === "confirmed" || r.status === "invited") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={frozen || !!r.blockedReason}
                          aria-describedby={r.blockedReason ? `why-${r.id}` : undefined}
                          onClick={() => setRemoving(r)}
                        >
                          {r.status === "invited" ? "Withdraw invite" : "Remove"}
                        </Button>
                        {r.blockedReason && <span id={`why-${r.id}`} className="mt-1 block text-xs text-muted-foreground">{r.blockedReason}</span>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite companies</DialogTitle>
            <DialogDescription>{seatsLeft} table{seatsLeft === 1 ? "" : "s"} left. Each company that accepts gets a table.</DialogDescription>
          </DialogHeader>
          <fieldset className="space-y-1">
            <legend className="sr-only">Companies to invite</legend>
            {invitable.map((c) => (
              <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted">
                <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-primary" />
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.sector}</span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <label htmlFor="invite-note" className="text-sm font-medium">Message (optional)</label>
            <Textarea id="invite-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
            <p className="text-xs text-muted-foreground">The company sees this with the invitation. {note.length}/300</p>
          </div>
          <p role="alert" className="text-sm text-destructive">{inviteError}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button disabled={busy || picked.length === 0 || picked.length > seatsLeft} onClick={() => void invite()}>
              {busy ? "Sending…" : picked.length > 1 ? `Send ${picked.length} invitations` : picked.length === 1 ? "Send invitation" : "Send invitations"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{removing?.status === "invited" ? "Withdraw this invitation?" : `Remove ${removing?.name ?? "this company"}?`}</DialogTitle>
            <DialogDescription>
              {removing?.status === "invited"
                ? "The company will no longer be able to accept."
                : "Its problems for this event are paused, and everyone who answered is told. The table becomes free."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>Keep</Button>
            <Button variant="destructive" disabled={busy} onClick={() => removing && void remove(removing)}>{busy ? "Removing…" : "Yes, remove"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { CalendarClock, MapPin } from "lucide-react";
import { requireAccount } from "@/lib/session";
import { getDB } from "@/lib/store";
import { nowMs } from "@/lib/clock";
import { cardViewerSide, eventCardFor, MAX_CARD_SKILLS } from "@/lib/meet-card";
import { CardSkillsForm, PrintButton } from "@/components/meet/card-actions";

export const dynamic = "force-dynamic";

async function absoluteUrl(path: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}${path}`;
}

export default async function EventCardPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const acc = await requireAccount();
  const db = getDB();
  const side = cardViewerSide(db, acc, meetingId);
  if (!side) notFound();
  const card = eventCardFor(db, meetingId, nowMs());
  if (!card) notFound();

  const url = await absoluteUrl(`/meet/${card.meetingId}`);
  const qr = card.expired ? null : await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const ownSkills = side === "talent" ? (db.talents.find((t) => t.id === acc.talentId)?.skills ?? []).map((s) => s.label) : [];

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <article
        aria-labelledby="meet-title"
        className="relative overflow-hidden rounded-md border border-border bg-paper pb-6 pl-8 pr-5 pt-5 shadow-[0_1px_2px_rgba(30,40,60,0.08),0_6px_16px_-6px_rgba(30,40,60,0.15)] print:shadow-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--margin-red), var(--margin-red)), repeating-linear-gradient(transparent, transparent 27px, oklch(0.88 0.03 230 / 0.5) 27px, oklch(0.88 0.03 230 / 0.5) 28px)",
          backgroundSize: "100% 3px, 100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <span aria-hidden="true" className="absolute inset-y-0 left-4 w-px bg-margin-red/40" />
        <p className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Event card · {card.eventName}</p>
        <h1 id="meet-title" className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">{card.problemTitle}</h1>

        {card.expired ? (
          <p role="status" className="mt-4 rounded-md border border-border bg-background px-3 py-2 font-medium">
            This card has expired. It was valid on {card.dayLabel}.
          </p>
        ) : (
          <>
            <p className="mt-4 flex items-start gap-2 text-lg font-medium">
              <CalendarClock className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <span>{card.dayLabel} · {card.time}</span>
            </p>
            <p className="mt-1 flex items-start gap-2 text-lg font-medium">
              <MapPin className="mt-1 size-5 shrink-0" aria-hidden="true" />
              <span>Table {card.table} · {card.venue}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Valid on {card.dayLabel}.</p>
          </>
        )}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Company</dt>
            <dd className="text-lg">{card.companyName}{card.companyFirstName ? ` · ${card.companyFirstName}` : ""}</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate</dt>
            <dd className="text-lg">{card.talentFirstName}</dd>
          </div>
        </dl>

        {card.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Skills {card.talentFirstName} chose to show</p>
            <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Skills chosen to show">
              {card.skills.map((s) => (
                <li key={s} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-sm">{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-border pt-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Code</p>
            <p className="font-mono text-3xl font-semibold tracking-widest">PUL-{card.code}</p>
            {!card.expired && <p className="mt-2 max-w-48 break-all text-xs text-muted-foreground">{url}</p>}
          </div>
          {qr && (
            <div
              role="img"
              aria-label="QR code for this event card"
              className="size-40 shrink-0 rounded bg-white p-1 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          )}
        </div>
      </article>

      <p className="text-sm text-muted-foreground print:hidden">
        This card shows first names only. It appears because the company chose to meet and the candidate accepted. It stops working after the event.
      </p>

      {!card.expired && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
        </div>
      )}

      {side === "talent" && !card.expired && (
        ownSkills.length > 0 ? (
          <CardSkillsForm meetingId={card.meetingId} skills={ownSkills} chosen={card.skills} max={MAX_CARD_SKILLS} />
        ) : (
          <p className="rounded-lg border bg-background p-4 text-sm print:hidden">
            You can show up to {MAX_CARD_SKILLS} of your skills on this card.{" "}
            <Link href="/profile#skills" className="inline-flex min-h-11 items-center text-primary underline underline-offset-4">Add your skills first</Link>
          </p>
        )
      )}
    </div>
  );
}

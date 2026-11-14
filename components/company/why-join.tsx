import { MessageSquareText, ShieldCheck, Timer, Users } from "lucide-react";
import type { Outcomes } from "@/lib/outcomes";

/**
 * "Why take part": answers the brief's first problem (companies doubt the city's candidates and a free
 * service) with what a company will actually get. Aggregate counts only; the example answer is anonymous.
 */
export function WhyJoin({ outcomes, example }: { outcomes: Outcomes; example: { problemTitle: string; text: string } | null }) {
  const facts = [
    { icon: Users, value: outcomes.answersPerProblem ?? "—", label: "answers per problem so far" },
    { icon: Timer, value: outcomes.repliedOnTimePct != null ? `${outcomes.repliedOnTimePct}%` : "—", label: "of answers got a reply on time" },
    { icon: MessageSquareText, value: outcomes.meetings, label: "conversations booked" },
  ];
  return (
    <section aria-labelledby="why-h" className="rounded-lg border border-border bg-card p-5">
      <h2 id="why-h" className="font-display text-lg">Why take part</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        You bring one real problem. People from the City of Espoo&apos;s talent pool answer it in their own words, and you meet only
        the ones you choose, at your own table. No CVs to sift, no queue at the booth, and the service is free.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {facts.map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-md bg-muted px-3 py-2.5">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" /> {label}
            </dt>
            <dd className="mt-0.5 font-display text-2xl text-navy tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {example && (
        <figure className="mt-4 border-l-[3px] border-primary pl-4">
          <figcaption className="text-xs text-muted-foreground">
            What you read: an anonymous answer to &ldquo;{example.problemTitle}&rdquo;
          </figcaption>
          <blockquote className="mt-1 text-sm leading-6">{example.text}</blockquote>
        </figure>
      )}
      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Figures are anonymous counts across Pulma events (fictional demo data). Names are shared only when both sides agree.
      </p>
    </section>
  );
}

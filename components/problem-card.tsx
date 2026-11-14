import type { CardDraft, Company, ProblemCard } from "@/lib/types";

const FORMAT_LABEL = { onsite: "On-site", online: "Online", hybrid: "Hybrid" } as const;

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="font-sans text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </h3>
      <div className="mt-1 text-[0.95rem] leading-7 text-foreground">{children}</div>
    </section>
  );
}

function Tag({ prefix, text }: { prefix: string; text: string }) {
  return (
    <li className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground">
      <span className="text-muted-foreground">{prefix}: </span>
      {text}
    </li>
  );
}

export function ProblemCardView({
  card,
  company,
  compact = false,
}: {
  card: ProblemCard | CardDraft;
  company?: Company;
  compact?: boolean;
}) {
  const tags = (
    <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Languages and format">
      {card.languages.map((l) => (
        <Tag key={l} prefix="Language" text={l} />
      ))}
      <Tag prefix="Format" text={FORMAT_LABEL[card.format]} />
    </ul>
  );

  return (
    <article
      className="relative overflow-hidden rounded-md border border-border bg-paper pb-6 pl-6 pr-5 pt-5 shadow-[0_1px_2px_rgba(30,40,60,0.08),0_6px_16px_-6px_rgba(30,40,60,0.15)] transition-transform duration-200 motion-safe:hover:-rotate-[0.4deg] motion-safe:hover:-translate-y-0.5"
      style={{
        backgroundImage:
          "linear-gradient(var(--margin-red), var(--margin-red)), repeating-linear-gradient(transparent, transparent 27px, oklch(0.88 0.03 230 / 0.5) 27px, oklch(0.88 0.03 230 / 0.5) 28px)",
        backgroundSize: "100% 3px, 100% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-3 w-px bg-margin-red/40" />
      {company && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{company.name}</span> · {company.sector}
        </p>
      )}
      <h2 className={`mt-1 font-display font-semibold leading-tight text-foreground ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
        {card.title}
      </h2>
      {compact ? (
        <>
          <p className="mt-3 line-clamp-2 text-[0.95rem] leading-7 text-foreground">{card.context}</p>
          {tags}
        </>
      ) : (
        <>
          <Section label="The problem">
            <p>{card.context}</p>
          </Section>
          <Section label="Your first week">
            <p>{card.weekOneReality}</p>
          </Section>
          <Section label="The hard part">
            <p>{card.hardPart}</p>
          </Section>
          {card.niceToHave.length > 0 && (
            <Section label="Bonus, not required">
              <ul className="list-disc pl-5">
                {card.niceToHave.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Section>
          )}
          {tags}
        </>
      )}
    </article>
  );
}

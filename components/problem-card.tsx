import { Briefcase, Sparkles } from "lucide-react";
import { SUPPORT_LABEL, WORK_IN_FINLAND_URL, type CardDraft, type Company, type ProblemCard } from "@/lib/types";

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

function Pill({ text, prefix }: { text: string; prefix?: string }) {
  return (
    <li className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground">
      {prefix && <span className="text-muted-foreground">{prefix}: </span>}
      {text}
    </li>
  );
}

/** Old cards have no languagesNeeded: every language counts as needed. */
function splitLanguages(card: ProblemCard | CardDraft): { needed: string[]; nice: string[] } {
  const needed = card.languagesNeeded ?? card.languages;
  return {
    needed,
    nice: card.languages.filter((l) => !needed.includes(l)),
  };
}

function LanguageGroup({
  kind,
  langs,
  emptyText,
}: {
  kind: "needed" | "nice";
  langs: string[];
  emptyText: string;
}) {
  const label = kind === "needed" ? "Needed for the work" : "Nice to have";
  const Icon = kind === "needed" ? Briefcase : Sparkles;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      {langs.length > 0 ? (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={label}>
          {langs.map((l) => (
            <Pill key={l} text={l} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">{emptyText}</p>
      )}
    </div>
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
  const { needed, nice } = splitLanguages(card);

  return (
    <article
      className="relative overflow-hidden rounded-md border border-border bg-paper pb-6 pl-6 pr-5 pt-5 shadow-card transition-transform duration-200 motion-safe:hover:-rotate-[0.4deg] motion-safe:hover:-translate-y-0.5"
      style={{
        backgroundImage:
          "linear-gradient(var(--card-rule), var(--card-rule))",
        backgroundSize: "100% 4px",
        backgroundRepeat: "no-repeat",
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-3 w-px bg-card-rule/30" />
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
          <div className="mt-4 space-y-1.5">
            <ul className="flex flex-wrap gap-1.5" aria-label="Languages needed for the work">
              {needed.map((l) => (
                <Pill key={l} text={l} />
              ))}
              <Pill prefix="Format" text={FORMAT_LABEL[card.format]} />
            </ul>
            {nice.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden="true" />
                + {nice.join(", ")} nice to have
              </p>
            )}
          </div>
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
          {card.skills && card.skills.length > 0 && (
            <Section label="Work involved">
              <ul className="flex flex-wrap gap-1.5" aria-label="Work involved">
                {card.skills.map((k) => (
                  <Pill key={k} text={k} />
                ))}
              </ul>
            </Section>
          )}
          {card.support && card.support.length > 0 && (
            <Section label="Help for international hires">
              <ul className="flex flex-wrap gap-1.5" aria-label="Help for international hires">
                {card.support.map((k) => (
                  <Pill key={k} text={SUPPORT_LABEL[k]} />
                ))}
              </ul>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Moving to Finland?{" "}
                <a href={WORK_IN_FINLAND_URL} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                  Work in Finland<span className="sr-only"> (public service, opens in a new tab)</span>
                </a>{" "}
                explains permits, moving and settling in.
              </p>
            </Section>
          )}
          <div className="mt-5 space-y-3" aria-label="Languages and format">
            <LanguageGroup kind="needed" langs={needed} emptyText="None marked as needed" />
            {nice.length > 0 && <LanguageGroup kind="nice" langs={nice} emptyText="" />}
            <ul className="flex flex-wrap gap-1.5">
              <Pill prefix="Format" text={FORMAT_LABEL[card.format]} />
            </ul>
          </div>
        </>
      )}
    </article>
  );
}

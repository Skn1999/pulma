import { Check } from "lucide-react";

/**
 * Why a company should take part in a City of Espoo recruitment event, shown inside each invitation, right above
 * Accept. Facts come from the city's own employer pages; terms and amounts are the city's, so we link out.
 */
const ESPOO = {
  recruitment: "https://www.espoo.fi/en/business-espoo-helping-companies-thrive/recruitment-assistance-0",
  financial: "https://www.espoo.fi/en/business-espoo-helping-companies-thrive/financial-support-and-employment",
  contacts: "https://www.espoo.fi/en/business-espoo-helping-companies-thrive/contacts-employers-and-businesses",
};

const REASONS = [
  "Meet jobseekers and international professionals from Espoo you won’t find on job boards",
  "Free, with Business Espoo’s recruitment specialists behind you",
  "You may be eligible for support with hiring costs (pay subsidy, Espoo supplement)",
];

export function InvitationReasons({ example }: { example: { problemTitle: string; text: string } | null }) {
  const link = "rounded-sm text-primary underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div className="mt-3">
      <ul aria-label="Why take part" className="space-y-1 text-sm">
        {REASONS.map((r) => (
          <li key={r} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <a href={ESPOO.recruitment} target="_blank" rel="noreferrer" className={link}>
          Recruitment assistance<span className="sr-only"> (espoo.fi, opens in a new tab)</span>
        </a>
        <a href={ESPOO.financial} target="_blank" rel="noreferrer" className={link}>
          Financial support<span className="sr-only"> (espoo.fi, opens in a new tab)</span>
        </a>
        <a href={ESPOO.contacts} target="_blank" rel="noreferrer" className={link}>
          Contact an employer specialist<span className="sr-only"> (espoo.fi, opens in a new tab)</span>
        </a>
      </p>
      {example && (
        <details className="group mt-2 text-sm">
          <summary className="cursor-pointer rounded-sm text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
            What would we read?
          </summary>
          <figure className="mt-2 border-l-[3px] border-primary pl-3">
            <figcaption className="text-xs text-muted-foreground">
              An anonymous answer to &ldquo;{example.problemTitle}&rdquo; (fictional demo data)
            </figcaption>
            <blockquote className="mt-1 leading-6">{example.text}</blockquote>
          </figure>
        </details>
      )}
    </div>
  );
}

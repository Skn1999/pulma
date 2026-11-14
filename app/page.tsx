import Link from "next/link";

const STEPS = [
  { t: "A company brings a problem", d: "Not a job ad. A real, messy problem the team is stuck on, written down in minutes." },
  { t: "Talent answers in their own words", d: "A few sentences on how they would approach it, in any language. No CV needed." },
  { t: "The company picks blind", d: "Answers appear without names or photos. Identities are revealed only when both sides say yes." },
  { t: "Booked 10-minute conversations", d: "Accepted matches become scheduled slots with staggered arrival times." },
];

const DOORS = [
  { href: "/company/intake", title: "I'm hiring", text: "Describe a problem your team is stuck on and publish it as a card." },
  { href: "/talent", title: "I'm looking", text: "Browse problems and answer the ones that interest you." },
  { href: "/organiser", title: "I'm organising", text: "See when needs arrived, who is in demand, and who needs a follow-up." },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-primary">Espoo Tech Talent Day</p>
        <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] sm:text-6xl">
          Companies bring a real problem, not a job ad.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Talent answers it in their own words, not with a CV. Companies pick who to meet without
          seeing names, and the event becomes booked 10-minute conversations.
        </p>
      </section>

      <section aria-labelledby="how" className="mt-16">
        <h2 id="how" className="text-2xl font-semibold sm:text-3xl">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-4 rounded-lg border border-border bg-card p-5">
              <span aria-hidden="true" className="font-display text-3xl font-semibold leading-none text-primary">
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.t}
                </h3>
                <p className="mt-1 text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Our promise on AI" className="mt-10 rounded-lg border border-primary/30 bg-accent px-5 py-4 text-accent-foreground">
        <p className="font-medium">AI helps people write; it never chooses people.</p>
        <p className="mt-1 text-sm">
          No ranking, no scoring, no filtering. Every AI suggestion is accepted by a human and labelled.
        </p>
      </section>

      <section aria-labelledby="doors" className="mt-16">
        <h2 id="doors" className="text-2xl font-semibold sm:text-3xl">Where do you want to start?</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {DOORS.map((d) => (
            <li key={d.href}>
              <Link
                href={d.href}
                className="group flex h-full flex-col rounded-lg border border-border bg-paper p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-display text-2xl font-semibold">{d.title}</span>
                <span className="mt-2 flex-1 text-muted-foreground">{d.text}</span>
                <span className="mt-4 text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                  Go <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-20 border-t border-border pt-6">
        <p className="font-display text-lg italic text-foreground">
          We didn&apos;t build a smarter matching algorithm. We took the algorithm out and made the humans better at choosing.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">All data is synthetic.</p>
      </footer>
    </div>
  );
}

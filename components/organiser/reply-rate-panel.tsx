import type { Stats } from "@/lib/stats";

export function ReplyRatePanel({ replies }: { replies: Stats["replies"] }) {
  const pct = Math.round(replies.replyRate * 100);
  return (
    <section aria-labelledby="replies-heading" className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h2 id="replies-heading" className="font-display text-lg font-semibold">Every answer gets a reply</h2>
      <p className="mt-3 font-display text-4xl font-semibold tabular-nums">{pct}%</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {replies.shortlisted + replies.closed} of {replies.answers} answers have a reply: {replies.shortlisted} shortlisted,{" "}
        {replies.closed} closed, {replies.open} still open.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Answers shortlisted or closed with a &lsquo;not this time&rsquo;. Totals only.
      </p>
    </section>
  );
}

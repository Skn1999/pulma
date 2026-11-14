export function PageTitle({
  title, subtitle, actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b bg-background/95 px-4 py-4 backdrop-blur sm:px-6">
      <div className="min-w-0">
        <h1 className="text-balance font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

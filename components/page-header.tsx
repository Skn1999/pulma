export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
      <h1 className="text-balance text-3xl font-semibold sm:text-4xl">{title}</h1>
      {subtitle && (
        <p className="mt-3 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      )}
    </div>
  );
}

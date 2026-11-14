export function AiLabel({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="AI-assisted wording"
      className={`inline-flex items-center gap-1 rounded-full border border-primary/40 bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground ${className}`}
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
        <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" />
        <path d="M13 11l.6 1.4L15 13l-1.4.6L13 15l-.6-1.4L11 13l1.4-.6L13 11z" />
      </svg>
      AI-assisted wording
    </span>
  );
}

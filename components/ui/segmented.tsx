"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Where each control's pill last was. Pages that keep their state in the URL re-mount on every change; remembering
// the last position lets the new instance glide from there instead of snapping.
const lastClip = new Map<string, string>();

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * A row of toggle buttons with a sliding "active" pill. Technique from Emil Kowalski's tab-indicator recipe: a
 * styled copy of the row sits on top and is clipped to the active option, so text colour and background change
 * together in one 250ms ease-in-out move instead of two colour transitions. The copy is aria-hidden and ignores
 * the pointer; the real buttons underneath carry aria-pressed and focus. Movement drops out under reduced motion.
 */
export function Segmented<T extends string>({
  label, options, value, onChange, className, itemClassName, activeClassName = "bg-primary font-semibold text-primary-foreground",
}: {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  // Start where this control's pill last was (if anywhere), so a remounted control can glide on from there.
  const [clip, setClip] = useState<string | null>(() => lastClip.get(label) ?? null);
  // Move the pill the moment it is pressed; the parent's value (often a URL param) catches up after navigation.
  const [picked, setPicked] = useState<{ v: T; from: T } | null>(null);
  const current = picked && picked.from === value ? picked.v : value;

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const btn = row.querySelector<HTMLElement>(`[data-value="${CSS.escape(current)}"]`);
      if (!btn) return setClip(null);
      // Measure against the row itself (the overlay covers exactly the row's box).
      const r = row.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      const px = (n: number) => `${Math.max(0, Math.round(n))}px`;
      const next = `inset(${px(b.top - r.top)} ${px(r.right - b.right)} ${px(r.bottom - b.bottom)} ${px(b.left - r.left)} round 9999px)`;
      lastClip.set(label, next);
      setClip(next);
    };
    // With a remembered position, let it paint for a frame first, then move: the transition plays across the remount.
    // (A timer rather than requestAnimationFrame, so it still settles in a background tab.)
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (lastClip.has(label)) timer = setTimeout(measure, 32);
    else measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [current, options.length, label]);

  const item = (on: boolean, overlay: boolean) =>
    cn(
      "inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm outline-none",
      !overlay && "focus-visible:ring-3 focus-visible:ring-ring/50",
      !overlay && !on && "hover:bg-muted",
      // Before the first measurement (server render), the real button shows the active style itself.
      (overlay || (on && !clip)) && activeClassName,
      itemClassName,
    );

  return (
    <div role="group" aria-label={label} className={cn("relative rounded-full border border-border bg-card p-0.5", className)}>
      <div ref={rowRef} className="flex w-full">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            data-value={o.value}
            aria-pressed={current === o.value}
            onClick={() => {
              setPicked({ v: o.value, from: value });
              onChange(o.value);
            }}
            className={item(current === o.value, false)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {clip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0.5 flex motion-safe:transition-[clip-path] motion-safe:duration-250 motion-safe:ease-(--ease-in-out)"
          style={{ clipPath: clip }}
        >
          {options.map((o) => (
            <span key={o.value} className={item(true, true)}>
              {o.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

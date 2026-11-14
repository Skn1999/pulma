/** Wall-clock "now" in ms, for server pages (keeps render-purity lint happy; pages are force-dynamic). */
export const nowMs = (): number => Date.now();

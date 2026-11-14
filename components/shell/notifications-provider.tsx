"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ActivityView } from "@/lib/types";

const POLL_MS = 5000;

interface NotificationsState {
  unseen: number;
  items: ActivityView[];
  markSeen: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsState | null>(null);

export function useNotifications() {
  return useContext(NotificationsContext);
}

/**
 * Polls /api/notifications once per shell (not per bell), so there is one set of toasts
 * and one live region even though the bell is rendered in both the sidebar and mobile bar.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const [unseen, setUnseen] = useState(0);
  const [items, setItems] = useState<ActivityView[]>([]);
  const [announcement, setAnnouncement] = useState("");
  // null until the first successful poll, so existing items never toast on page load.
  const knownIds = useRef<Set<string> | null>(null);
  const prevUnseen = useRef(0);

  const poll = useCallback(async () => {
    if (document.hidden) return;
    let data: { unseen: number; items: ActivityView[] };
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      data = await res.json();
    } catch {
      return; // the demo must keep working when the network hiccups
    }
    const known = knownIds.current;
    const fresh = known ? data.items.filter((i) => !known.has(i.id)) : [];
    knownIds.current = new Set([...(known ?? []), ...data.items.map((i) => i.id)]);
    const increased = data.unseen > prevUnseen.current;
    prevUnseen.current = data.unseen;
    setUnseen(data.unseen);
    setItems(data.items);

    if (known && increased && fresh.length > 0) {
      const chronological = [...fresh].reverse();
      for (const item of chronological.slice(-3)) {
        toast(item.text, {
          action: item.href
            ? { label: "Open", onClick: () => routerRef.current.push(item.href as string) }
            : undefined,
        });
      }
      setAnnouncement(`New: ${chronological.map((i) => i.text).join(". ")}`);
      routerRef.current.refresh();
    }
  }, []);

  useEffect(() => {
    // First poll is deferred to a callback so the effect body itself sets no state.
    const first = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => void poll(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  const markSeen = useCallback(async () => {
    prevUnseen.current = 0;
    setUnseen(0);
    try {
      await fetch("/api/notifications/seen", { method: "POST" });
    } catch {
      // the next poll will restore the true count
    }
  }, []);

  return (
    <NotificationsContext.Provider value={{ unseen, items, markSeen }}>
      {children}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </NotificationsContext.Provider>
  );
}

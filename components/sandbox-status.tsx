"use client";

import { useEffect, useState } from "react";
import { Copy, Check, RefreshCw, Box } from "lucide-react";
import { toast } from "sonner";
import { SANDBOX_COOKIE } from "@/lib/sandbox-constants";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function SandboxStatus({
  initialId,
  variant = "pill",
}: {
  initialId?: string;
  variant?: "pill" | "menu";
}) {
  const [sandboxId, setSandboxId] = useState<string>(initialId || "default");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const val = getCookie(SANDBOX_COOKIE);
    if (val) setSandboxId(val);
  }, []);

  function copyLink() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("box", sandboxId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      toast.success("Sandbox link copied! Open it on another device to share this demo.");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function newSandbox() {
    if (typeof window === "undefined") return;
    const rand = Math.random().toString(36).slice(2, 8);
    const time = Date.now().toString(36).slice(-2);
    const id = `sbx_${rand}${time}`;
    document.cookie = `${SANDBOX_COOKIE}=${id}; path=/; max-age=604800; samesite=lax`;
    toast.info("Created a fresh sandbox");
    window.location.reload();
  }

  if (variant === "menu") {
    return (
      <div className="px-2 py-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Box className="size-3.5 text-primary" aria-hidden="true" />
            Sandbox: <code className="font-mono font-medium text-foreground">{sandboxId}</code>
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            title="Copy link to open this sandbox on another device"
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Private Sandbox:</span>
        <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground ring-1 ring-border">
          {sandboxId}
        </code>
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied link" : "Share sandbox link"}
        </button>
        <button
          type="button"
          onClick={newSandbox}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          title="Start fresh in a new empty sandbox"
        >
          <RefreshCw className="size-3" />
          <span>New</span>
        </button>
      </div>
    </div>
  );
}

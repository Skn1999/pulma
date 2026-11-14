"use client";

import { useRouter } from "next/navigation";
import { Lock, LogOut, UserRound, ChevronsUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { company: "Company account", talent: "Talent account", organiser: "Organiser account" } as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function AccountMenu({
  displayName, email, role, compact,
}: {
  displayName: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  compact?: boolean;
}) {
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${displayName}`}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "p-0.5" : "w-full p-2 hover:bg-muted",
        )}
      >
        <Avatar size={compact ? "default" : undefined}>
          <AvatarFallback>{initials(displayName)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{displayName}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" aria-hidden="true" />
                {ROLE_LABEL[role]}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} side={compact ? "bottom" : "top"} className="w-64">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
            <Lock className="size-3" aria-hidden="true" />
            {ROLE_LABEL[role]}
          </p>
          <p className="mt-1.5 truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserRound aria-hidden="true" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut aria-hidden="true" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

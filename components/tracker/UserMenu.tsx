"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, LogOut, ShieldCheck, UserCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

function getInitial(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "U";
  return trimmed[0]?.toUpperCase() ?? "U";
}

interface UserMenuProps {
  isAdmin?: boolean;
  className?: string;
}

export function UserMenu({ isAdmin = false, className }: UserMenuProps) {
  const { data: session } = useSession();

  const displayName = session?.user?.name?.trim() || "Mon compte";
  const email = session?.user?.email?.trim() || "";
  const initial = getInitial(session?.user?.name || session?.user?.email);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-full border border-gold/15 bg-card/70 pl-1.5 pr-3 text-left transition-colors hover:border-gold/30 hover:bg-card/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30",
          className
        )}
        aria-label="Ouvrir le menu utilisateur"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gold/25 bg-gold/12 text-[11px] font-semibold uppercase tracking-[0.08em] text-gold">
          {initial}
        </span>
        <span className="hidden min-w-0 sm:flex sm:flex-col">
          <span className="truncate text-[11px] font-medium text-foreground/92">{displayName}</span>
          <span className="truncate text-[10px] text-muted-foreground/78">
            {isAdmin ? "Admin" : "Compte"}
          </span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/78" />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-2xl border border-gold/10 bg-[linear-gradient(180deg,rgba(21,23,30,0.98),rgba(13,14,18,0.98))] p-2 text-sm shadow-2xl"
      >
        <PopoverHeader className="rounded-xl border border-border/60 bg-card/60 px-3 py-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-sm font-semibold uppercase tracking-[0.08em] text-gold">
              {initial}
            </span>
            <div className="min-w-0">
              <PopoverTitle className="truncate text-sm text-foreground/92">{displayName}</PopoverTitle>
              <p className="mt-1 truncate text-[11px] text-muted-foreground/82">{email || "Session active"}</p>
            </div>
          </div>
        </PopoverHeader>

        <div className="flex flex-col gap-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl border border-gold/10 px-3 py-2 text-sm text-gold/88 transition-colors hover:border-gold/20 hover:bg-gold/8 hover:text-gold"
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}

          <Link
            href="/account"
            className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-sm text-foreground/90 transition-colors hover:border-border hover:bg-card/70 hover:text-foreground"
          >
            <UserCircle2 className="h-4 w-4 text-muted-foreground/86" />
            Mon compte
          </Link>

          <Link
            href="/logout"
            className="flex items-center gap-2 rounded-xl border border-border/50 px-3 py-2 text-left text-sm text-foreground/88 transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Quitter
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  active?: boolean;
  className?: string;
}

export function AppLogo({ active = false, className }: AppLogoProps) {
  return (
    <span
      className={cn(
        "group inline-flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-all",
        active
          ? "border-gold/25 bg-gold/[0.07] shadow-[0_0_0_1px_rgba(201,162,39,0.05)]"
          : "border-border/60 bg-card/55 hover:border-gold/20 hover:bg-card/80",
        className
      )}
    >
      <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-[radial-gradient(circle_at_50%_38%,rgba(201,162,39,0.14),rgba(201,162,39,0.02)_58%,transparent_78%)]">
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="h-7 w-7 text-gold transition-transform duration-200 group-hover:scale-[1.04]"
          fill="none"
        >
          <path
            d="M16 2 L30 16 L16 30 L2 16 Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M16 7 L25 16 L16 25 L7 16 Z"
            stroke="currentColor"
            strokeWidth="0.75"
            fill="rgba(201,162,39,0.08)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="5"
            ry="3.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <circle cx="16" cy="16" r="1.8" fill="currentColor" />
        </svg>
      </span>

      <span className="min-w-0">
        <span className="flex items-baseline gap-2 leading-none">
          <span className="font-heading text-[0.98rem] font-semibold uppercase tracking-[0.18em] text-gold sm:text-[1.02rem]">
            YGO
          </span>
          <span className="text-sm font-medium tracking-[0.08em] text-foreground/82">
            Tracker
          </span>
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground/78">
          Research watchlist
        </span>
      </span>
    </span>
  );
}

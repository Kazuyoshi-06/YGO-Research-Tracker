"use client";

import { useEffect, useState } from "react";
import { Waves, Clock, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Wave {
  id: number;
  name: string;
  status: "open" | "frozen";
  deadline: string | null;
}

function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

export function HubWaveBanner() {
  const [wave, setWave] = useState<Wave | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/waves")
      .then((r) => r.ok ? r.json() : [])
      .then((waves: Wave[]) => {
        const active = waves.find((w) => w.status === "open" || w.status === "frozen") ?? null;
        setWave(active);
        if (active) {
          setDismissed(localStorage.getItem(`wave_banner_dismissed_${active.id}`) === "1");
        }
      })
      .catch(() => {});
  }, []);

  if (!wave || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(`wave_banner_dismissed_${wave!.id}`, "1");
    setDismissed(true);
  }

  const isOpen = wave.status === "open";

  return (
    <div className={cn(
      "fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
      isOpen
        ? "border-b border-gold/15 bg-[rgba(201,162,39,0.07)]"
        : "border-b border-blue-700/20 bg-blue-950/20"
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <Waves className={cn("h-4 w-4 flex-shrink-0", isOpen ? "text-gold/80" : "text-blue-400")} />
        <span className={cn("font-medium text-xs", isOpen ? "text-gold/90" : "text-blue-300")}>
          {wave.name}
        </span>
        <span className={cn(
          "rounded-full border px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0",
          isOpen
            ? "border-green-700/40 bg-green-900/30 text-green-300"
            : "border-blue-700/40 bg-blue-900/30 text-blue-300"
        )}>
          {isOpen ? "Ouverte" : "Gelée"}
        </span>
        {wave.deadline && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            Limite : {formatDeadline(wave.deadline)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isOpen && (
          <Link
            href="/tracker/tcg"
            className="flex items-center gap-1 rounded-lg border border-violet-600/40 bg-violet-600/15 px-2.5 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-600/25 transition-colors"
          >
            Soumettre ma liste
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <button
          onClick={handleDismiss}
          className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

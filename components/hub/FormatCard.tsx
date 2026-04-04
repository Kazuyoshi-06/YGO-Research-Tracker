"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FormatStats = {
  total: number;
  toOrder: number;
  estimatedValue: number;
};

interface FormatCardProps {
  format: "TCG" | "OCG";
  stats: FormatStats;
}

// ── Logos image ───────────────────────────────────────────────────────────────

function TcgLogo() {
  return (
    <Image
      src="/logos/ygo-tcg.png"
      alt="Yu-Gi-Oh! TCG"
      width={180}
      height={72}
      className="object-contain h-16 w-auto"
      priority
      unoptimized
    />
  );
}

function OcgLogo() {
  return (
    <Image
      src="/logos/ocg.png"
      alt="Yu-Gi-Oh! OCG"
      width={180}
      height={72}
      className="object-contain h-16 w-auto"
      priority
      unoptimized
    />
  );
}

// ── Carte principale ──────────────────────────────────────────────────────────

const isTcg = (f: "TCG" | "OCG") => f === "TCG";

export function FormatCard({ format, stats }: FormatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const tcg = isTcg(format);
  const href = `/tracker/${format.toLowerCase()}`;

  // Couleurs selon format
  const accent      = tcg ? "#c9a227" : "#ef4444";
  const accentClass = tcg ? "text-gold" : "text-red-400";
  const borderIdle  = tcg ? "border-gold/20"  : "border-red-900/30";
  const borderHover = tcg ? "hover:border-gold/60" : "hover:border-red-500/60";
  const bgGlow      = tcg
    ? "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.12) 0%, transparent 70%)"
    : "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.10) 0%, transparent 70%)";

  // Tilt 3D au survol
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width  - 0.5; // -0.5 → 0.5
    const y = (e.clientY - top)  / height - 0.5;
    card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) scale(1.025)`;

    // Déplacer le reflet selon la souris
    if (glowRef.current) {
      glowRef.current.style.opacity = "1";
      glowRef.current.style.backgroundPosition = `${(x + 0.5) * 100}% ${(y + 0.5) * 100}%`;
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }, []);

  return (
    <Link href={href} className="flex-1 group" tabIndex={-1}>
      <div
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ transition: "transform 0.15s ease, box-shadow 0.3s ease" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-surface cursor-pointer select-none",
          "p-8 flex flex-col items-center gap-5",
          borderIdle, borderHover,
          tcg
            ? "hover:shadow-[0_0_40px_rgba(201,162,39,0.18),0_8px_32px_rgba(0,0,0,0.5)]"
            : "hover:shadow-[0_0_40px_rgba(239,68,68,0.15),0_8px_32px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Fond dégradé subtil */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: bgGlow }}
        />

        {/* Shimmer diagonal */}
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
          style={{
            background: `linear-gradient(105deg, transparent 30%, ${accent}18 50%, transparent 70%)`,
            backgroundSize: "200% 200%",
            transition: "opacity 0.3s ease, background-position 0.1s ease",
          }}
        />

        {/* Particules losanges flottantes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { top: "12%", left: "8%",  size: 5, delay: "0s",   dur: "3.8s" },
            { top: "70%", left: "15%", size: 3, delay: "1.2s",  dur: "4.5s" },
            { top: "25%", left: "82%", size: 4, delay: "0.6s",  dur: "3.2s" },
            { top: "78%", left: "75%", size: 3, delay: "2.1s",  dur: "5.0s" },
            { top: "45%", left: "92%", size: 4, delay: "1.7s",  dur: "4.0s" },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                top: p.top, left: p.left,
                width: p.size, height: p.size,
                backgroundColor: accent,
                opacity: 0.15,
                transform: "rotate(45deg)",
                animation: `floatDiamond ${p.dur} ease-in-out ${p.delay} infinite`,
              }}
            />
          ))}
        </div>

        {/* Logo format */}
        <div className="relative z-10">
          {tcg ? <TcgLogo /> : <OcgLogo />}
        </div>

        {/* Sous-titre */}
        <p className="relative z-10 text-xs text-muted-foreground text-center leading-relaxed">
          {tcg
            ? "Trading Card Game · Éditions mondiales"
            : "Official Card Game · Éditions JP / CN"}
          <br />
          <span className={cn("font-medium", accentClass)}>
            {tcg ? "CardMarket" : "Taobao"}
          </span>
        </p>

        {/* Séparateur */}
        <div className="relative z-10 w-full border-t border-border/50" />

        {/* Stats */}
        <div className="relative z-10 w-full grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {stats.total}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Cartes
            </p>
          </div>
          <div>
            <p className="text-xl font-semibold text-foreground tabular-nums">
              {stats.toOrder}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              À commander
            </p>
          </div>
          <div>
            <p className={cn("text-xl font-semibold tabular-nums", accentClass)}>
              {tcg
                ? `€${stats.estimatedValue.toFixed(2)}`
                : `¥${Math.round(stats.estimatedValue).toLocaleString()}`}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
              Estimé
            </p>
          </div>
        </div>

        {/* Flèche d'entrée au hover */}
        <div className={cn(
          "relative z-10 text-[11px] uppercase tracking-widest font-medium transition-all duration-300",
          "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0",
          accentClass
        )}>
          Ouvrir →
        </div>
      </div>
    </Link>
  );
}

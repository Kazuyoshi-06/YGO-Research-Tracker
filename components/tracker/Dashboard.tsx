"use client";

import { useMemo } from "react";
import Image from "next/image";
import { LayoutDashboard, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistEntry, Seller } from "./types";

// ── Helpers ────────────────────────────────────────────────────────────────

function bestPrice(entry: WatchlistEntry): number | null {
  const prices = entry.prices.map((p) => p.price).filter((p): p is number => p !== null);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function bestSellerIdFn(entry: WatchlistEntry): number | null {
  let minPrice: number | null = null;
  let minSellerId: number | null = null;
  for (const p of entry.prices) {
    if (p.price !== null && (minPrice === null || p.price < minPrice)) {
      minPrice = p.price;
      minSellerId = p.sellerId;
    }
  }
  return minSellerId;
}

function computeStats(entries: WatchlistEntry[]) {
  const total = entries.length;
  const byStatus: Record<string, number> = { "À commander": 0, "Commandé": 0, "Reçu": 0, "": 0 };
  let minCost = 0;
  let coverage = 0;
  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
    const bp = bestPrice(e);
    if (bp !== null) { minCost += bp * e.quantity; coverage++; }
  }
  return { total, byStatus, minCost, coverage };
}

function computeTopCards(entries: WatchlistEntry[], n = 5) {
  return entries
    .map((e) => { const bp = bestPrice(e); return { entry: e, lineTotal: bp !== null ? bp * e.quantity : null }; })
    .filter((x): x is { entry: WatchlistEntry; lineTotal: number } => x.lineTotal !== null)
    .sort((a, b) => b.lineTotal - a.lineTotal)
    .slice(0, n);
}

function computeSellerSummary(entries: WatchlistEntry[], sellers: Seller[]) {
  return sellers.map((seller) => {
    let bestDeals = 0, coverage = 0, total = 0;
    for (const e of entries) {
      const pd = e.prices.find((p) => p.sellerId === seller.id);
      if (pd?.price != null) {
        coverage++;
        total += pd.price * e.quantity;
        if (bestSellerIdFn(e) === seller.id) bestDeals++;
      }
    }
    return { seller, bestDeals, coverage, total };
  }).sort((a, b) => b.bestDeals - a.bestDeals);
}

function dominantSeller(entries: WatchlistEntry[], sellers: Seller[]): Seller | null {
  const counts = new Map<number, number>();
  for (const e of entries) {
    const sid = bestSellerIdFn(e);
    if (sid !== null) counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return sellers.find((s) => s.id === topId) ?? null;
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[18px] px-4 py-3.5 border flex flex-col gap-1.5 shadow-[0_1px_0_rgba(255,255,255,0.02)]",
      accent
        ? "bg-[linear-gradient(180deg,rgba(201,162,39,0.12),rgba(201,162,39,0.04))] border-gold/25"
        : "bg-[linear-gradient(180deg,rgba(26,27,33,0.92),rgba(18,19,24,0.84))] border-border/50"
    )}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <span className={cn("text-2xl font-bold tabular-nums leading-none", accent ? "text-gold" : "text-foreground")}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground/50">{sub}</span>}
    </div>
  );
}

// ── Barre de statuts multi-segments ───────────────────────────────────────

function StatusBar({ byStatus, total, height = "h-3" }: {
  byStatus: Record<string, number>; total: number; height?: string;
}) {
  const segments = [
    { key: "Reçu",        color: "bg-emerald-500", label: "Reçu",        labelColor: "text-emerald-400" },
    { key: "Commandé",    color: "bg-amber-500",   label: "Commandé",    labelColor: "text-amber-400" },
    { key: "À commander", color: "bg-blue-500",    label: "À commander", labelColor: "text-blue-400" },
    { key: "",            color: "bg-zinc-600",    label: "Sans statut", labelColor: "text-zinc-500" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex rounded-full overflow-hidden gap-px w-full", height, "bg-surface-raised")}>
        {segments.map(({ key, color }) => {
          const count = byStatus[key] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={key}
              className={cn("transition-all", color)}
              style={{ width: `${(count / total) * 100}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(({ key, label, labelColor }) => {
          const count = byStatus[key] ?? 0;
          if (count === 0) return null;
          return (
            <span key={key} className={cn("text-[11px] font-medium tabular-nums", labelColor)}>
              {count} <span className="text-muted-foreground/50 font-normal">{label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Section deck ──────────────────────────────────────────────────────────

function DeckSection({ deck, entries, sellers }: {
  deck: string; entries: WatchlistEntry[]; sellers: Seller[];
}) {
  const { total, byStatus, minCost, coverage } = computeStats(entries);
  const top = dominantSeller(entries, sellers);
  const received = byStatus["Reçu"] ?? 0;
  const pctDone = total > 0 ? Math.round((received / total) * 100) : 0;

  return (
    <section className="bg-surface rounded-[20px] border border-border/60 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/40 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-1.5 h-8 rounded-full bg-gold/55 shrink-0" />
          <h2 className="font-heading text-sm font-semibold tracking-[0.12em] text-gold uppercase truncate">
          {deck || "— Sans deck"}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {pctDone > 0 && (
            <span className="text-[11px] px-2 py-1 rounded-full border border-emerald-700/20 bg-emerald-950/20 text-emerald-400/85 tabular-nums font-medium">
              {pctDone}% reçu
            </span>
          )}
          <span className="text-xs tabular-nums text-muted-foreground/40">
            {total} carte{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        <StatusBar byStatus={byStatus} total={total} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="bg-gold/8 border border-gold/20 rounded-lg px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/55">Coût min.</span>
            <span className="text-xl font-bold tabular-nums text-gold leading-none">
              <span className="text-xs font-normal text-gold/50 mr-0.5">€</span>{minCost.toFixed(2)}
            </span>
          </div>

          <div className="bg-surface-raised/50 border border-border/50 rounded-lg px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/55">Couverture</span>
            <span className="text-xl font-bold tabular-nums text-foreground leading-none">
              {coverage}<span className="text-sm font-normal text-muted-foreground/40">/{total}</span>
            </span>
            <span className="text-[10px] text-muted-foreground/40 tabular-nums">
              {total > 0 ? Math.round((coverage / total) * 100) : 0}% avec prix
            </span>
          </div>

          <div className="bg-surface-raised/50 border border-border/50 rounded-lg px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/55">Vendeur dominant</span>
            {top ? (
              <span className="text-sm font-mono font-semibold text-foreground/90 truncate leading-tight mt-0.5">
                {top.name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground/30 mt-0.5">—</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Composant principal ────────────────────────────────────────────────────

interface DashboardProps {
  entries: WatchlistEntry[];
  sellers: Seller[];
}

const RANK_COLORS = ["text-gold", "text-zinc-400", "text-amber-700/80"];

export function Dashboard({ entries, sellers }: DashboardProps) {
  const validEntries = useMemo(() => entries.filter((e) => e.card), [entries]);
  const { total, byStatus, minCost, coverage } = useMemo(() => computeStats(validEntries), [validEntries]);
  const topCards = useMemo(() => computeTopCards(validEntries), [validEntries]);
  const sellerSummary = useMemo(() => computeSellerSummary(validEntries, sellers), [validEntries, sellers]);
  const deckGroups = useMemo(() => {
    const map = new Map<string, WatchlistEntry[]>();
    for (const e of validEntries) {
      const key = e.deck || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b, "fr");
    });
  }, [validEntries]);

  if (total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground/40">
        <LayoutDashboard className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucune carte dans la watchlist</p>
      </div>
    );
  }

  const received = byStatus["Reçu"] ?? 0;
  const globalPct = total > 0 ? Math.round((received / total) * 100) : 0;
  const decksWithProgress = deckGroups.filter(([, deckEntries]) => (computeStats(deckEntries).byStatus["Reçu"] ?? 0) > 0).length;

  return (
    <div className="flex-1 overflow-auto px-3 py-3 sm:px-6 sm:py-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Vue globale ─────────────────────────────────────────────── */}
        <section className="rounded-[24px] border border-gold/10 bg-[linear-gradient(180deg,rgba(19,20,24,0.95),rgba(12,13,17,0.98))] overflow-hidden">
          <div className="px-4 py-4 border-b border-border/40 flex flex-col gap-3 sm:px-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-muted-foreground/70">
                <LayoutDashboard className="w-4 h-4 text-gold/65" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Vue globale</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/50">
                <span className="px-2 py-1 rounded-full border border-border/60 bg-card/50 tabular-nums">
                  {deckGroups.length} deck{deckGroups.length !== 1 ? "s" : ""}
                </span>
                <span className="px-2 py-1 rounded-full border border-border/60 bg-card/50 tabular-nums">
                  {decksWithProgress} avec progression
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {globalPct > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-emerald-700/20 bg-emerald-950/20 text-emerald-400/85">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold tabular-nums">{globalPct}% reçu</span>
                </div>
              )}
              <div className="px-2.5 py-1.5 rounded-full border border-gold/20 bg-gold/8 text-gold text-xs font-medium tabular-nums">
                €{minCost.toFixed(2)} estimés
              </div>
            </div>
          </div>

          <div className="px-4 py-4 flex flex-col gap-4 sm:px-5 sm:py-5 sm:gap-5">
            <StatusBar byStatus={byStatus} total={total} height="h-4" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                label="Total cartes"
                value={String(total)}
                sub={`${deckGroups.length} deck${deckGroups.length !== 1 ? "s" : ""}`}
              />
              <StatCard
                label="Couverture prix"
                value={`${coverage}/${total}`}
                sub={`${total > 0 ? Math.round((coverage / total) * 100) : 0}% des lignes`}
              />
              <StatCard
                label="Coût min. estimé"
                value={`€${minCost.toFixed(2)}`}
                sub="meilleur prix / ligne"
                accent
              />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/45">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/55" />
            Analyse détaillée
          </div>
          <span className="hidden text-[10px] text-muted-foreground/35 sm:inline">
            decks, cartes clés et vendeurs dominants
          </span>
        </div>

        {/* ── Sections par deck ───────────────────────────────────────── */}
        {deckGroups.map(([deck, deckEntries]) => (
          <DeckSection key={deck || "__no_deck__"} deck={deck} entries={deckEntries} sellers={sellers} />
        ))}

        {/* ── Top cartes les plus chères ──────────────────────────────── */}
        {topCards.length > 0 && (
          <section className="bg-surface rounded-[20px] border border-border/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/40 flex flex-col gap-1 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                Top {topCards.length} — cartes les plus chères
              </h2>
              <span className="text-[10px] text-muted-foreground/40">
                estimation basée sur le meilleur prix disponible
              </span>
            </div>
            <div className="divide-y divide-border/30">
              {topCards.map(({ entry, lineTotal }, i) => (
                <div key={entry.id} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-raised/30 transition-colors sm:gap-4 sm:px-5">
                  {/* Rang */}
                  <span className={cn("text-sm font-bold tabular-nums w-5 text-center flex-shrink-0", RANK_COLORS[i] ?? "text-muted-foreground/40")}>
                    {i + 1}
                  </span>
                  {/* Image */}
                  <div className="relative w-8 h-[46px] rounded overflow-hidden bg-surface-raised flex-shrink-0">
                    <Image
                      src={entry.card.hasLocalImage ? `/cards/${entry.card.id}.jpg` : entry.card.imageUrl}
                      alt={entry.card.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                      unoptimized={!entry.card.hasLocalImage}
                    />
                  </div>
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.card.name}</p>
                    {(entry.setName || entry.rarity) && (
                      <p className="text-[11px] text-muted-foreground/50 truncate">
                        {[entry.setName, entry.rarity].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                {/* Prix */}
                <div className="text-right flex-shrink-0">
                  <span className={cn("text-base font-bold tabular-nums", i === 0 ? "text-gold" : "text-foreground/80")}>
                    <span className="text-[11px] font-normal text-muted-foreground/40 mr-0.5">€</span>
                    {lineTotal.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-muted-foreground/35">
                    coût mini estimé
                  </p>
                  {entry.quantity > 1 && (
                    <p className="text-[10px] text-muted-foreground/40 tabular-nums">×{entry.quantity}</p>
                  )}
                </div>
              </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Synthèse vendeurs ────────────────────────────────────────── */}
        {sellerSummary.length > 0 && sellerSummary.some((s) => s.coverage > 0) && (
          <section className="bg-surface rounded-[20px] border border-border/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-border/40 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Synthèse vendeurs
                </h2>
                <span className="text-[10px] text-muted-foreground/40">
                  classés par nombre de best deals
                </span>
              </div>
            </div>
            <div className="divide-y divide-border/30">
              {sellerSummary.map(({ seller, bestDeals, coverage: cov, total: tot }, i) => (
                <div
                  key={seller.id}
                  className={cn(
                    "grid grid-cols-2 gap-3 px-3 py-3.5 transition-colors hover:bg-surface-raised/30 sm:grid-cols-4 sm:items-center sm:gap-4 sm:px-5",
                    i === 0 && bestDeals > 0 && "bg-gold/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && bestDeals > 0 && (
                      <span className="text-gold text-xs">★</span>
                    )}
                    <span className="text-sm font-mono font-semibold text-foreground/85 truncate">
                      {seller.name}
                    </span>
                  </div>
                  <div className="text-center">
                    {bestDeals > 0 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gold/15 text-gold font-bold text-sm tabular-nums">
                        {bestDeals}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/25 text-sm">—</span>
                    )}
                  </div>
                  <div className="text-sm tabular-nums text-muted-foreground/60 text-center">
                    {cov}/{total}
                    <span className="text-[10px] ml-1 text-muted-foreground/35">
                      ({total > 0 ? Math.round((cov / total) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="text-right">
                    {tot > 0 ? (
                      <span className="text-sm tabular-nums font-medium text-foreground/75">
                        <span className="text-[10px] text-muted-foreground/40 mr-0.5">€</span>
                        {tot.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/25 text-sm">—</span>
                    )}
                  </div>
                </div>
              ))}
              {/* Header labels en bas pour référence */}
              <div className="hidden sm:grid grid-cols-4 gap-4 px-5 py-2 bg-surface-raised/20">
                {["Vendeur", "Best deals", "Couverture", "Total catalogue"].map((h) => (
                  <span key={h} className="text-[10px] uppercase tracking-wider text-muted-foreground/35 text-center first:text-left last:text-right">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

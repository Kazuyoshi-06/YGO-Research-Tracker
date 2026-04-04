"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  id: number;
  name: string;
  type: string;
  imageUrl: string;
  hasLocalImage: boolean;
}

interface PriceRow {
  cardId: number;
  sellerId: number;
  price: number | null;
  updatedAt: string;
}

interface Entry {
  id: number;
  format: string;
  deck: string;
  quantity: number;
  setName: string | null;
  rarity: string | null;
  status: string;
  notes: string;
  card: Card;
  prices: PriceRow[];
}

interface Seller {
  id: number;
  name: string;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface WatchlistData {
  user: UserInfo;
  entries: Entry[];
  sellers: Seller[];
}

// ── Config statuts ────────────────────────────────────────────────────────────

const STATUS_CLASSES: Record<string, string> = {
  "À commander": "bg-blue-900/40 text-blue-300 border-blue-700/50",
  "Soumis":      "bg-violet-900/40 text-violet-300 border-violet-700/50",
  "Commandé":    "bg-amber-900/40 text-amber-300 border-amber-700/50",
  "Reçu":        "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUserWatchlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterFormat, setFilterFormat] = useState<"ALL" | "TCG" | "OCG">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}/watchlist`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const entries = data?.entries.filter((e) =>
    filterFormat === "ALL" || e.format === filterFormat
  ) ?? [];

  const toOrder  = entries.filter((e) => e.status === "À commander").length;
  const submitted = entries.filter((e) => e.status === "Soumis").length;
  const ordered  = entries.filter((e) => e.status === "Commandé").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Utilisateurs
        </Link>
        {data && (
          <div>
            <h1 className="font-heading text-lg text-gold tracking-widest uppercase">
              {data.user.name ?? data.user.email}
            </h1>
            <p className="text-xs text-muted-foreground/60">{data.user.email} · Watchlist (lecture seule)</p>
          </div>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {data && (
        <>
          {/* Stats + filtre format */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
              <span>{entries.length} carte(s)</span>
              {toOrder > 0   && <span className="text-blue-300">{toOrder} à commander</span>}
              {submitted > 0 && <span className="text-violet-300">{submitted} soumis</span>}
              {ordered > 0   && <span className="text-amber-300">{ordered} commandé</span>}
            </div>

            <div className="inline-flex items-center gap-0.5 rounded-full border border-border/50 bg-card/50 p-0.5">
              {(["ALL", "TCG", "OCG"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterFormat(f)}
                  className={cn(
                    "flex h-6 items-center rounded-full px-3 text-[11px] font-medium transition-colors",
                    filterFormat === f
                      ? "bg-gold/15 text-gold ring-1 ring-gold/25"
                      : "text-muted-foreground/60 hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Tableau */}
          {entries.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground/50">Aucune entrée.</p>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised">
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Carte</th>
                    <th className="px-4 py-3">Deck</th>
                    <th className="px-4 py-3">Édition · Rareté</th>
                    <th className="px-4 py-3 text-center">Qté</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    {data.sellers.map((s) => (
                      <th key={s.id} className="px-4 py-3 text-right">{s.name}</th>
                    ))}
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {entries.map((entry) => {
                    const priceMap = new Map(entry.prices.map((p) => [p.sellerId, p.price]));
                    return (
                      <tr key={entry.id} className={cn(
                        "bg-surface hover:bg-surface-raised transition-colors",
                        entry.status === "Reçu" && "opacity-40"
                      )}>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">
                          {entry.card.name}
                          <span className="ml-1.5 text-[10px] text-muted-foreground/50 uppercase">{entry.format}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground/70">{entry.deck || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground/60">
                          {[entry.setName, entry.rarity].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{entry.quantity}</td>
                        <td className="px-4 py-3 text-center">
                          {entry.status ? (
                            <span className={cn(
                              "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              STATUS_CLASSES[entry.status] ?? "border-border/40 text-muted-foreground/50"
                            )}>
                              {entry.status}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                        {data.sellers.map((s) => {
                          const price = priceMap.get(s.id);
                          return (
                            <td key={s.id} className="px-4 py-3 text-right tabular-nums text-xs">
                              {price != null ? (
                                <span className="text-foreground/80">€{price.toFixed(2)}</span>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-xs text-muted-foreground/60 max-w-[140px] truncate">
                          {entry.notes || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

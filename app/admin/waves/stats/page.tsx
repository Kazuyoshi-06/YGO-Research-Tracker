"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Waves, Users, CreditCard, Package } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  waveCount: number;
  userCount: number;
  totalCards: number;
  totalSpend: number;
}

interface WaveRow {
  id: number;
  name: string;
  createdAt: string;
  userCount: number;
  cardCount: number;
  totalSpend: number;
  sellers: string[];
}

interface UserRow {
  userId: string;
  userName: string;
  waveCount: number;
  cardCount: number;
  totalSpend: number;
}

interface SellerRow {
  sellerName: string;
  waveCount: number;
  cardCount: number;
  totalSpend: number;
}

interface StatsData {
  summary: Summary;
  byWave: WaveRow[];
  byUser: UserRow[];
  bySeller: SellerRow[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

// ── Cartes stats globales ─────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-surface p-5 flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-card/60 text-gold/80 flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-semibold text-gold tabular-nums">{value}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminWaveStatsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/stats/waves");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/waves"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vagues
        </Link>
        <h1 className="font-heading text-lg text-gold tracking-widest uppercase">Historique & Stats</h1>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!data && !loading && (
        <p className="text-sm text-destructive">Erreur de chargement.</p>
      )}

      {data && data.summary.waveCount === 0 && (
        <div className="rounded-xl border border-border/50 bg-surface p-12 text-center">
          <Waves className="h-10 w-10 text-muted-foreground/25 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/50">Aucune vague livrée pour le moment.</p>
          <p className="text-xs text-muted-foreground/35 mt-1">Les stats apparaîtront une fois la première vague passée en "Livré".</p>
        </div>
      )}

      {data && data.summary.waveCount > 0 && (
        <>
          {/* Résumé global */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Waves className="h-5 w-5" />}   label="Vagues livrées"   value={data.summary.waveCount} />
            <StatCard icon={<Users className="h-5 w-5" />}   label="Participants"      value={data.summary.userCount} />
            <StatCard icon={<Package className="h-5 w-5" />} label="Cartes reçues"     value={data.summary.totalCards} />
            <StatCard icon={<CreditCard className="h-5 w-5" />} label="Volume total" value={`€${data.summary.totalSpend.toFixed(2)}`} />
          </div>

          {/* Timeline des vagues */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
              Vagues livrées
            </h2>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised">
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Vague</th>
                    <th className="px-4 py-3 text-center">Users</th>
                    <th className="px-4 py-3 text-center">Cartes</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Vendeurs</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.byWave.map((w) => (
                    <tr key={w.id} className="bg-surface hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{w.name}</p>
                        <p className="text-xs text-muted-foreground/60">{fmtDate(w.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{w.userCount}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{w.cardCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gold tabular-nums">
                        €{w.totalSpend.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground/70">
                        {w.sellers.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/waves/${w.id}`}
                          className="text-xs text-muted-foreground/50 hover:text-gold transition-colors"
                        >
                          Détail →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Par utilisateur */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
              Par utilisateur
            </h2>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised">
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3 text-center">Vagues</th>
                    <th className="px-4 py-3 text-center">Cartes</th>
                    <th className="px-4 py-3 text-right">Dépense totale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data.byUser.map((u) => (
                    <tr key={u.userId} className="bg-surface hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{u.userName}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{u.waveCount}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{u.cardCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gold tabular-nums">
                        €{u.totalSpend.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Par vendeur */}
          {data.bySeller.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                Vendeurs les plus utilisés
              </h2>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-raised">
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3">Vendeur</th>
                      <th className="px-4 py-3 text-center">Vagues</th>
                      <th className="px-4 py-3 text-center">Cartes</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3">Lien</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.bySeller.map((s) => (
                      <tr key={s.sellerName} className="bg-surface hover:bg-surface-raised transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{s.sellerName}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s.waveCount}</td>
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s.cardCount}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gold tabular-nums">
                          €{s.totalSpend.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.cardmarket.com/fr/YuGiOh/Users/${encodeURIComponent(s.sellerName)}/Offers/Singles`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gold/60 hover:text-gold transition-colors"
                          >
                            CardMarket ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

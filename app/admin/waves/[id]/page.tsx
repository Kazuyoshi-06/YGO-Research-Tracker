"use client";

import { useEffect, useState, useCallback, use, Fragment } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Users, PackageCheck, Loader2,
  CheckCircle2, XCircle, LayoutList, BarChart3, Store, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "submissions" | "consolidation" | "sellers";

interface SubmissionItem {
  id: number;
  cardName: string;
  setName: string;
  rarity: string;
  quantity: number;
  snapshotPrice: number | null;
  preferredSeller: string | null;
}

interface SubmissionRow {
  id: number;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  submittedAt: string;
  itemCount: number;
  estimatedTotal: number;
  items: SubmissionItem[];
}

interface NotSubmittedRow {
  userId: string;
  userName: string;
}

interface CardRow {
  cardId: number;
  cardName: string;
  totalQty: number;
  users: { userId: string; userName: string; qty: number; seller: string | null; price: number | null }[];
  bySeller: { sellerName: string; qty: number; totalPrice: number }[];
}

interface SellerRow {
  sellerName: string;
  cards: number;
  totalPrice: number;
}

interface ConsolidationData {
  wave: { id: number; name: string; status: string; deadline: string | null };
  submissions: SubmissionRow[];
  notSubmitted: NotSubmittedRow[];
  byCard: CardRow[];
  bySeller: SellerRow[];
  totalEstimated: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

// ── Onglet Soumissions ────────────────────────────────────────────────────────

function SubmissionsTab({ data }: { data: ConsolidationData }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const total = data.submissions.length + data.notSubmitted.length;

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
        <span className="flex items-center gap-1.5 text-green-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {data.submissions.length} soumis
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground/50">
          <XCircle className="h-3.5 w-3.5" />
          {data.notSubmitted.length} en attente
        </span>
        <span>/ {total} users</span>
      </div>

      <div className="rounded-xl border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3 w-6"></th>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3 text-center">Cartes</th>
              <th className="px-4 py-3 text-right">Estimé</th>
              <th className="px-4 py-3">Soumis le</th>
              <th className="px-4 py-3 text-center">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.submissions.map((s) => (
              <Fragment key={s.id}>
                {/* Ligne principale */}
                <tr
                  onClick={() => toggle(s.id)}
                  className="bg-surface hover:bg-surface-raised transition-colors cursor-pointer"
                >
                  <td className="pl-4 py-3">
                    {expanded.has(s.id)
                      ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                      : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{s.userName}</p>
                    <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">{s.itemCount}</td>
                  <td className="px-4 py-3 text-right font-medium text-gold tabular-nums">
                    €{s.estimatedTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(s.submittedAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-700/40 bg-violet-900/25 px-2 py-0.5 text-[10px] text-violet-300">
                      <PackageCheck className="h-3 w-3" />
                      Soumis
                    </span>
                  </td>
                </tr>

                {/* Détail expandable */}
                {expanded.has(s.id) && (
                  <tr className="bg-card/40">
                    <td colSpan={6} className="px-8 pb-4 pt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground/60 border-b border-border/30">
                            <th className="pb-2 font-medium">Carte</th>
                            <th className="pb-2 font-medium">Édition · Rareté</th>
                            <th className="pb-2 text-center font-medium">Qté</th>
                            <th className="pb-2 font-medium">Vendeur</th>
                            <th className="pb-2 text-right font-medium">Prix unitaire</th>
                            <th className="pb-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.items.map((item) => (
                            <tr key={item.id} className="border-b border-border/20 last:border-0">
                              <td className="py-1.5 pr-4 font-medium text-foreground/90">{item.cardName}</td>
                              <td className="py-1.5 pr-4 text-muted-foreground/60">
                                {[item.setName, item.rarity].filter(Boolean).join(" · ") || "—"}
                              </td>
                              <td className="py-1.5 text-center tabular-nums text-foreground/80">{item.quantity}</td>
                              <td className="py-1.5 px-4 text-muted-foreground/70">{item.preferredSeller ?? "—"}</td>
                              <td className="py-1.5 text-right tabular-nums text-foreground/80">
                                {item.snapshotPrice != null ? `€${item.snapshotPrice.toFixed(2)}` : "—"}
                              </td>
                              <td className="py-1.5 text-right tabular-nums font-medium text-violet-300">
                                {item.snapshotPrice != null
                                  ? `€${(item.snapshotPrice * item.quantity).toFixed(2)}`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data.notSubmitted.map((u) => (
              <tr key={u.userId} className="bg-surface opacity-50">
                <td className="pl-4 py-3"></td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{u.userName}</p>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">—</td>
                <td className="px-4 py-3 text-right text-muted-foreground">—</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 px-2 py-0.5 text-[10px] text-muted-foreground/50">
                    <XCircle className="h-3 w-3" />
                    En attente
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onglet Consolidation ──────────────────────────────────────────────────────

function ConsolidationTab({ data, waveId }: { data: ConsolidationData; waveId: number }) {
  return (
    <div className="space-y-4">
      {/* Stats globales */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Cartes distinctes", value: data.byCard.length },
          { label: "Quantité totale", value: data.byCard.reduce((s, c) => s + c.totalQty, 0) },
          { label: "Total estimé", value: `€${data.totalEstimated.toFixed(2)}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-surface p-4 text-center">
            <p className="text-lg font-semibold text-gold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Export CSV */}
      <div className="flex justify-end">
        <a
          href={`/api/waves/${waveId}/consolidation?format=csv`}
          download
          className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Exporter CSV
        </a>
      </div>

      {/* Tableau par carte */}
      {data.byCard.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground/50">Aucune soumission.</p>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Carte</th>
                <th className="px-4 py-3 text-center">Qté</th>
                <th className="px-4 py-3">Répartition vendeurs</th>
                <th className="px-4 py-3">Users</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.byCard.map((card) => (
                <tr key={card.cardId} className="bg-surface hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{card.cardName}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gold tabular-nums">{card.totalQty}</td>
                  <td className="px-4 py-3">
                    {card.bySeller.length === 0 ? (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {card.bySeller.map((s) => (
                          <span key={s.sellerName} className="rounded-full border border-border/50 bg-card/60 px-2 py-0.5 text-[10px]">
                            {s.sellerName} × {s.qty} — €{s.totalPrice.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/70">
                    {card.users.map((u) => u.userName).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Onglet Vendeurs ───────────────────────────────────────────────────────────

function SellersTab({ data }: { data: ConsolidationData }) {
  if (data.bySeller.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground/50">Aucune donnée vendeur.</p>;
  }
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised">
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3">Vendeur</th>
            <th className="px-4 py-3 text-center">Cartes (qté)</th>
            <th className="px-4 py-3 text-right">Total estimé</th>
            <th className="px-4 py-3">Lien</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {data.bySeller.map((s) => (
            <tr key={s.sellerName} className="bg-surface hover:bg-surface-raised transition-colors">
              <td className="px-4 py-3 font-medium text-foreground">{s.sellerName}</td>
              <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s.cards}</td>
              <td className="px-4 py-3 text-right font-semibold text-gold tabular-nums">€{s.totalPrice.toFixed(2)}</td>
              <td className="px-4 py-3">
                <a
                  href={`https://www.cardmarket.com/fr/YuGiOh/Users/${encodeURIComponent(s.sellerName)}/Offers/Singles`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold/70 hover:text-gold underline-offset-2 hover:underline"
                >
                  CardMarket ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminWaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const waveId = parseInt(id, 10);

  const [data, setData] = useState<ConsolidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("submissions");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/waves/${waveId}/consolidation`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [waveId]);

  useEffect(() => { load(); }, [load]);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "submissions",   label: "Soumissions",   icon: <Users className="h-3.5 w-3.5" /> },
    { key: "consolidation", label: "Consolidation", icon: <LayoutList className="h-3.5 w-3.5" /> },
    { key: "sellers",       label: "Vendeurs",      icon: <Store className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/waves"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Vagues
        </Link>
        {data && (
          <h1 className="font-heading text-lg text-gold tracking-widest uppercase">
            {data.wave.name}
          </h1>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Onglets */}
      <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
              tab === t.key
                ? "bg-gold/10 text-gold ring-1 ring-gold/20"
                : "text-muted-foreground hover:bg-surface-raised hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
            {t.key === "submissions" && data && (
              <span className="rounded-full bg-surface-raised px-1.5 text-[10px] leading-4">
                {data.submissions.length}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={load}
          className="flex h-8 items-center gap-1 rounded-full px-2 text-muted-foreground/60 hover:text-foreground transition-colors"
          title="Rafraîchir"
        >
          <BarChart3 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : !data ? (
        <p className="text-destructive text-sm">Erreur de chargement</p>
      ) : (
        <>
          {tab === "submissions"   && <SubmissionsTab data={data} />}
          {tab === "consolidation" && <ConsolidationTab data={data} waveId={waveId} />}
          {tab === "sellers"       && <SellersTab data={data} />}
        </>
      )}
    </div>
  );
}

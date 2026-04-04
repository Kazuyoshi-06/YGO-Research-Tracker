"use client";

import { useEffect, useState, useCallback } from "react";
import { Waves, Clock, ExternalLink, SendHorizonal, Undo2, PackageCheck, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistEntry, Seller } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WaveSeller {
  id: number;
  name: string;
  platform: string;
}

interface Wave {
  id: number;
  name: string;
  status: "open" | "frozen" | "ordered" | "delivered";
  deadline: string | null;
  sellers: { seller: WaveSeller }[];
}

interface SubmissionItem {
  id: number;
  watchlistEntryId: number;
  cardId: number;
  cardName: string;
  setName: string;
  rarity: string;
  quantity: number;
  snapshotPrice: number | null;
  preferredSeller: { id: number; name: string } | null;
}

interface Submission {
  id: number;
  status: string;
  submittedAt: string;
  items: SubmissionItem[];
}

interface WaveBannerProps {
  entries: WatchlistEntry[];
  sellers: Seller[];
  onEntriesChange: (updater: (prev: WatchlistEntry[]) => WatchlistEntry[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function cmSellerUrl(name: string) {
  return `https://www.cardmarket.com/fr/YuGiOh/Users/${encodeURIComponent(name)}/Offers/Singles`;
}

// ── Modale de confirmation ────────────────────────────────────────────────────

function SubmitDialog({
  wave,
  entries,
  sellers,
  onConfirm,
  onClose,
  submitting,
}: {
  wave: Wave;
  entries: WatchlistEntry[];
  sellers: Seller[];
  onConfirm: () => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const waveSellerIds = new Set(wave.sellers.map((ws) => ws.seller.id));
  const toOrder = entries.filter((e) => e.status === "À commander");

  // Calcul du meilleur prix par carte parmi les vendeurs de la vague
  function getBestPrice(entry: WatchlistEntry): { price: number; sellerName: string } | null {
    const wavePrices = (entry.prices ?? []).filter(
      (p) => p.price !== null && waveSellerIds.has(p.sellerId)
    ) as { price: number; sellerId: number }[];
    if (wavePrices.length === 0) return null;
    const best = wavePrices.reduce((a, b) => (a.price < b.price ? a : b));
    const seller = sellers.find((s) => s.id === best.sellerId);
    return { price: best.price, sellerName: seller?.name ?? "?" };
  }

  const total = toOrder.reduce((sum, e) => {
    const best = getBestPrice(e);
    return sum + (best ? best.price * e.quantity : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Panneau */}
      <div className="relative z-10 flex w-full max-w-lg flex-col rounded-2xl border border-violet-700/30 bg-[linear-gradient(180deg,rgba(21,23,30,0.99),rgba(13,14,18,0.99))] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Confirmer la soumission</p>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Vague — {wave.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground/60 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Liste des cartes */}
        <div className="max-h-72 overflow-y-auto px-5 py-3">
          {toOrder.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground/60">Aucune carte à commander.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40 text-left">
                  <th className="pb-2 font-medium text-muted-foreground/70">Carte</th>
                  <th className="pb-2 text-center font-medium text-muted-foreground/70">Qté</th>
                  <th className="pb-2 text-right font-medium text-muted-foreground/70">Meilleur prix</th>
                </tr>
              </thead>
              <tbody>
                {toOrder.map((entry) => {
                  const best = getBestPrice(entry);
                  return (
                    <tr key={entry.id} className="border-b border-border/20 last:border-0">
                      <td className="py-2 pr-2">
                        <p className="font-medium text-foreground/90 truncate max-w-[200px]">{entry.card.name}</p>
                        {(entry.setName || entry.rarity) && (
                          <p className="text-muted-foreground/55 truncate">
                            {[entry.setName, entry.rarity].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-center text-foreground/80">{entry.quantity}</td>
                      <td className="py-2 text-right">
                        {best ? (
                          <span className="text-violet-300 font-medium">
                            €{(best.price * entry.quantity).toFixed(2)}
                            <span className="ml-1 text-muted-foreground/50">({best.sellerName})</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total estimé</p>
            <p className="text-lg font-semibold text-violet-300">€{total.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground/50">{toOrder.length} carte(s)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-border/60 px-4 py-2 text-xs text-muted-foreground/80 transition-colors hover:bg-card/60 disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={submitting || toOrder.length === 0}
              className="flex items-center gap-2 rounded-xl bg-violet-600/20 border border-violet-600/40 px-4 py-2 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-600/30 disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <SendHorizonal className="h-3.5 w-3.5" />
              )}
              Soumettre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function WaveBanner({ entries, sellers, onEntriesChange }: WaveBannerProps) {
  const [wave, setWave] = useState<Wave | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const toOrderCount = entries.filter((e) => e.status === "À commander").length;

  // Sync dismissed state from localStorage when wave changes
  useEffect(() => {
    if (wave) {
      const key = `wave_banner_dismissed_${wave.id}`;
      setDismissed(localStorage.getItem(key) === "1");
    }
  }, [wave?.id]);

  function handleDismiss() {
    if (wave) localStorage.setItem(`wave_banner_dismissed_${wave.id}`, "1");
    setDismissed(true);
  }

  const fetchWaveAndSubmission = useCallback(async () => {
    try {
      const res = await fetch("/api/waves");
      if (!res.ok) return;
      const waves: Wave[] = await res.json();
      const active = waves.find((w) => w.status === "open" || w.status === "frozen") ?? null;
      setWave(active);

      if (active) {
        const subRes = await fetch(`/api/waves/${active.id}/submission`);
        if (subRes.ok) setSubmission(await subRes.json());
      }
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWaveAndSubmission(); }, [fetchWaveAndSubmission]);

  const handleSubmit = useCallback(async () => {
    if (!wave) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/waves/${wave.id}/submission`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erreur lors de la soumission");
        return;
      }
      const newSub: Submission = await res.json();
      setSubmission(newSub);
      setShowDialog(false);
      // Passer les entrées "À commander" en "Soumis" localement
      onEntriesChange((prev) =>
        prev.map((e) => e.status === "À commander" ? { ...e, status: "Soumis" } : e)
      );
    } finally {
      setSubmitting(false);
    }
  }, [wave, onEntriesChange]);

  const handleWithdraw = useCallback(async () => {
    if (!wave || !submission) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`/api/waves/${wave.id}/submission`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erreur lors du retrait");
        return;
      }
      setSubmission(null);
      // Remettre les entrées "Soumis" en "À commander" localement
      const submittedEntryIds = new Set(submission.items.map((i) => i.watchlistEntryId));
      onEntriesChange((prev) =>
        prev.map((e) =>
          e.status === "Soumis" && submittedEntryIds.has(e.id)
            ? { ...e, status: "À commander" }
            : e
        )
      );
    } finally {
      setWithdrawing(false);
    }
  }, [wave, submission, onEntriesChange]);

  if (loading || !wave || dismissed) return null;

  const waveSellersList = wave.sellers.map((ws) => ws.seller);
  const isOpen = wave.status === "open";
  const isFrozen = wave.status === "frozen";
  const hasSubmission = submission !== null;

  return (
    <>
      <div className={cn(
        "flex-none border-b px-4 py-3",
        hasSubmission
          ? "border-violet-700/30 bg-violet-950/20"
          : "border-gold/15 bg-[rgba(201,162,39,0.04)]"
      )}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Icône + nom de la vague */}
          <div className="flex items-center gap-2">
            <Waves className={cn("h-4 w-4 flex-shrink-0", hasSubmission ? "text-violet-400" : "text-gold/80")} />
            <div>
              <span className={cn("text-xs font-semibold", hasSubmission ? "text-violet-300" : "text-gold/90")}>
                {wave.name}
              </span>
              <span className={cn(
                "ml-2 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                isOpen ? "border-green-700/40 bg-green-900/30 text-green-300" :
                isFrozen ? "border-blue-700/40 bg-blue-900/30 text-blue-300" : ""
              )}>
                {isOpen ? "Ouverte" : "Gelée"}
              </span>
            </div>
          </div>

          {/* Deadline */}
          {wave.deadline && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
              <Clock className="h-3.5 w-3.5" />
              <span>Limite : {formatDeadline(wave.deadline)}</span>
            </div>
          )}

          {/* Vendeurs désignés */}
          {waveSellersList.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <span>Vendeurs :</span>
              {waveSellersList.map((s) => (
                <a
                  key={s.id}
                  href={s.platform === "cardmarket" ? cmSellerUrl(s.name) : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-gold/80 hover:text-gold underline-offset-2 hover:underline"
                >
                  {s.name}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              ))}
            </div>
          )}

          {/* Statut soumission */}
          {hasSubmission ? (
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-violet-300/80">
                <PackageCheck className="h-3.5 w-3.5" />
                <span>{submission!.items.length} carte(s) soumise(s)</span>
              </div>
              {isOpen && (
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="flex items-center gap-1.5 rounded-lg border border-border/50 px-2.5 py-1.5 text-[11px] text-muted-foreground/70 transition-colors hover:border-red-700/40 hover:bg-red-900/20 hover:text-red-300 disabled:opacity-40"
                >
                  {withdrawing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                  Retirer
                </button>
              )}
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              {isFrozen && (
                <span className="text-[11px] text-muted-foreground/60">
                  Soumissions closes
                </span>
              )}
              {isOpen && (
                <button
                  onClick={() => setShowDialog(true)}
                  disabled={toOrderCount === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-600/40 bg-violet-600/15 px-3 py-1.5 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-600/25 disabled:cursor-not-allowed disabled:opacity-35"
                  title={toOrderCount === 0 ? "Aucune carte à commander" : undefined}
                >
                  <SendHorizonal className="h-3.5 w-3.5" />
                  Soumettre ma liste
                  {toOrderCount > 0 && (
                    <span className="rounded-full bg-violet-700/50 px-1.5 py-0.5 text-[10px] leading-none">
                      {toOrderCount}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                aria-label="Fermer le bandeau"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {showDialog && wave && (
        <SubmitDialog
          wave={wave}
          entries={entries}
          sellers={sellers}
          onConfirm={handleSubmit}
          onClose={() => setShowDialog(false)}
          submitting={submitting}
        />
      )}
    </>
  );
}

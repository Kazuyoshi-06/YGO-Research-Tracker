"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Waves, Clock, Users, Loader2, Trash2, ChevronRight, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type WaveStatus = "open" | "frozen" | "ordered" | "delivered";

interface Seller { id: number; name: string; platform: string; }

interface Wave {
  id: number;
  name: string;
  status: WaveStatus;
  deadline: string | null;
  createdAt: string;
  sellers: { seller: Seller }[];
  submissionCount: number;
}

// ── Config statuts ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<WaveStatus, { label: string; classes: string; next?: WaveStatus; nextLabel?: string }> = {
  open:      { label: "Ouverte",   classes: "border-green-700/40 bg-green-900/25 text-green-300",   next: "frozen",    nextLabel: "Geler" },
  frozen:    { label: "Gelée",     classes: "border-blue-700/40 bg-blue-900/25 text-blue-300",       next: "ordered",   nextLabel: "Passer en Commandé" },
  ordered:   { label: "Commandé",  classes: "border-amber-700/40 bg-amber-900/25 text-amber-300",    next: "delivered", nextLabel: "Marquer livré" },
  delivered: { label: "Livré",     classes: "border-emerald-700/40 bg-emerald-900/25 text-emerald-300" },
};

function formatDeadline(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ── Formulaire création ───────────────────────────────────────────────────────

interface Seller2 { id: number; name: string; }

function CreateWaveForm({ onCreated }: { onCreated: (wave: Wave) => void }) {
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sellerIds, setSellerIds] = useState<number[]>([]);
  const [availableSellers, setAvailableSellers] = useState<Seller2[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sellers").then((r) => r.ok && r.json()).then((data) => {
      if (Array.isArray(data)) setAvailableSellers(data);
    });
  }, []);

  function toggleSeller(id: number) {
    setSellerIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Le nom est requis"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          deadline: deadline ? new Date(deadline).toISOString() : null,
          sellerIds,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Erreur");
        return;
      }
      const wave = await res.json();
      onCreated(wave);
      setName(""); setDeadline(""); setSellerIds([]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-gold/20 bg-surface p-5 space-y-4">
      <h2 className="font-heading text-sm text-gold tracking-widest uppercase">Nouvelle vague</h2>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Nom *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vague Avril 2026"
            className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Date limite (optionnel)</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-gold/30"
          />
        </div>
      </div>

      {availableSellers.length > 0 && (
        <div>
          <label className="block text-xs text-muted-foreground mb-2">Vendeurs désignés</label>
          <div className="flex flex-wrap gap-2">
            {availableSellers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSeller(s.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  sellerIds.includes(s.id)
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-gold/15 border border-gold/30 px-4 py-2 text-xs font-medium text-gold hover:bg-gold/25 transition-colors disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Créer la vague
        </button>
      </div>
    </form>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminWavesPage() {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [transitioning, setTransitioning] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/waves");
    if (res.ok) setWaves(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function transition(wave: Wave, status: WaveStatus) {
    if (!confirm(`Passer la vague "${wave.name}" en "${STATUS_CFG[status].label}" ?`)) return;
    setTransitioning(wave.id);
    const res = await fetch(`/api/waves/${wave.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setWaves((prev) => prev.map((w) => w.id === wave.id ? { ...w, status: updated.status } : w));
    }
    setTransitioning(null);
  }

  async function deleteWave(wave: Wave) {
    if (!confirm(`Supprimer la vague "${wave.name}" ? Action irréversible.`)) return;
    const res = await fetch(`/api/waves/${wave.id}`, { method: "DELETE" });
    if (res.ok) setWaves((prev) => prev.filter((w) => w.id !== wave.id));
  }

  if (loading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg text-gold tracking-widest uppercase">Vagues</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/waves/stats"
            className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Historique
          </Link>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle vague
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateWaveForm
          onCreated={(wave) => {
            setWaves((prev) => [wave, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {/* Liste */}
      {waves.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface p-10 text-center">
          <Waves className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground/60">Aucune vague créée</p>
        </div>
      ) : (
        <div className="space-y-3">
          {waves.map((wave) => {
            const cfg = STATUS_CFG[wave.status];
            const isTransitioning = transitioning === wave.id;
            return (
              <div
                key={wave.id}
                className="rounded-xl border border-border/50 bg-surface p-4 flex flex-wrap items-center gap-4"
              >
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm">{wave.name}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", cfg.classes)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground/70">
                    {wave.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDeadline(wave.deadline)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {wave.submissionCount} soumission{wave.submissionCount !== 1 ? "s" : ""}
                    </span>
                    {wave.sellers.length > 0 && (
                      <span>{wave.sellers.map((ws) => ws.seller.name).join(", ")}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cfg.next && (
                    <button
                      onClick={() => transition(wave, cfg.next!)}
                      disabled={isTransitioning}
                      className="flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors disabled:opacity-40"
                    >
                      {isTransitioning ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      {cfg.nextLabel}
                    </button>
                  )}
                  {wave.status === "open" && (
                    <button
                      onClick={() => deleteWave(wave)}
                      className="flex items-center gap-1 rounded-lg border border-destructive/30 px-2 py-1.5 text-xs text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  <Link
                    href={`/admin/waves/${wave.id}`}
                    className="flex items-center gap-1 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
                  >
                    Détail
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

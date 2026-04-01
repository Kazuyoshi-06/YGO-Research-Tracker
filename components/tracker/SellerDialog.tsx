"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { Seller } from "./types";

interface SellerDialogProps {
  open: boolean;
  onClose: () => void;
  sellers: Seller[];
  onAdd: (input: { name: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function SellerDialog({
  open,
  onClose,
  sellers,
  onAdd,
  onDelete,
}: SellerDialogProps) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setAdding(true);
    setError("");
    try {
      await onAdd({ name: trimmed });
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'ajout");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setError("");
    try {
      await onDelete(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md border-gold/15 bg-[linear-gradient(180deg,rgba(19,20,24,0.98),rgba(13,14,18,0.98))] p-0 overflow-hidden">
        <DialogHeader className="border-b border-gold/10 bg-[linear-gradient(180deg,rgba(201,162,39,0.08),transparent)] px-6 py-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold/65">CardMarket</span>
            <DialogTitle className="font-heading text-gold tracking-wider text-sm uppercase">
              Gérer les vendeurs
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground/50">
              Ajoutez ou retirez les boutiques utilisées dans vos comparaisons.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
        {/* Liste existante */}
        <div className="space-y-1 max-h-56 overflow-y-auto rounded-2xl border border-border/60 bg-card/60 p-2">
          {sellers.length === 0 && (
            <p className="text-xs text-muted-foreground py-5 text-center">
              Aucun vendeur pour l'instant
            </p>
          )}
          {sellers.map((s) => (
            <div
              key={s.id}
              className="group rounded-xl border border-transparent bg-surface px-3 py-2.5 transition-colors hover:border-gold/15 hover:bg-surface-raised"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block min-w-0 truncate text-sm text-foreground font-mono">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground/45">
                    Profil : France standard
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="flex-shrink-0 text-muted-foreground transition-all hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  title="Supprimer ce vendeur"
                >
                  {deletingId === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Ajouter */}
        <div className="border-t border-border/60 pt-4 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Pseudo CardMarket…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-9 text-sm bg-surface border-border focus-visible:ring-gold/50"
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !name.trim()}
              className="h-9 bg-gold text-background hover:bg-gold/90 font-medium px-4"
            >
              {adding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

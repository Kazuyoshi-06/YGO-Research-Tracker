"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistEntry } from "./types";

// ── Parser YDK ────────────────────────────────────────────────────────────

interface YdkSections {
  main: number[];
  extra: number[];
  side: number[];
}

function parseYdk(content: string): YdkSections {
  const lines = content.split(/\r?\n/);
  const result: YdkSections = { main: [], extra: [], side: [] };
  let section: keyof YdkSections | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "#main") { section = "main"; continue; }
    if (trimmed === "#extra") { section = "extra"; continue; }
    if (trimmed === "!side") { section = "side"; continue; }
    if (!trimmed || trimmed.startsWith("#")) continue;

    const id = parseInt(trimmed, 10);
    if (!isNaN(id) && section) result[section].push(id);
  }

  return result;
}

// ── Types locaux ──────────────────────────────────────────────────────────

interface CardInfo { id: number; name: string }
interface PreviewGroup { id: number; name: string | null; count: number; found: boolean }
type Step = "configure" | "loading" | "preview" | "importing" | "done";

interface SectionFilter { main: boolean; extra: boolean; side: boolean }

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (entries: WatchlistEntry[]) => void;
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

// ── Composant ─────────────────────────────────────────────────────────────

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("configure");
  const [deck, setDeck] = useState("");
  const [sections, setSections] = useState<SectionFilter>({ main: true, extra: true, side: false });
  const [ydkData, setYdkData] = useState<YdkSections | null>(null);
  const [cardInfoMap, setCardInfoMap] = useState<Map<number, string>>(new Map());
  const [notFoundIds, setNotFoundIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ created: number; failed: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  // Reset quand le dialog se ferme
  useEffect(() => {
    if (!open) {
      setStep("configure");
      setDeck("");
      setSections({ main: true, extra: true, side: false });
      setYdkData(null);
      setCardInfoMap(new Map());
      setNotFoundIds(new Set());
      setProgress({ done: 0, total: 0 });
      setResult(null);
      setError("");
    }
  }, [open]);

  // IDs effectifs selon les sections cochées (Option B : doublons conservés)
  const effectiveIds = useMemo(() => {
    if (!ydkData) return [];
    const ids: number[] = [];
    if (sections.main) ids.push(...ydkData.main);
    if (sections.extra) ids.push(...ydkData.extra);
    if (sections.side) ids.push(...ydkData.side);
    return ids;
  }, [ydkData, sections]);

  // Groupes pour l'aperçu (unique par ID, avec count)
  const previewGroups = useMemo<PreviewGroup[]>(() => {
    const counts = new Map<number, number>();
    for (const id of effectiveIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    return Array.from(counts.entries()).map(([id, count]) => ({
      id,
      count,
      name: cardInfoMap.get(id) ?? null,
      found: cardInfoMap.has(id),
    }));
  }, [effectiveIds, cardInfoMap]);

  const foundCount = previewGroups.filter((g) => g.found).reduce((s, g) => s + g.count, 0);
  const notFoundCount = previewGroups.filter((g) => !g.found).reduce((s, g) => s + g.count, 0);

  // ── Traitement fichier ──────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".ydk")) {
      setError("Format invalide : merci de choisir un fichier .ydk");
      return;
    }

    setError("");
    setStep("loading");

    try {
      const content = await file.text();
      const parsed = parseYdk(content);
      setYdkData(parsed);

      const allIds = [
        ...parsed.main,
        ...parsed.extra,
        ...parsed.side,
      ];
      const uniqueIds = [...new Set(allIds)];

      if (uniqueIds.length === 0) { setStep("preview"); return; }

      const res = await fetch("/api/cards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: uniqueIds }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Erreur lors de la vérification du deck"));
      }
      const data: { found: CardInfo[]; notFound: number[] } = await res.json();

      const map = new Map<number, string>();
      for (const c of data.found) map.set(c.id, c.name);
      setCardInfoMap(map);
      setNotFoundIds(new Set(data.notFound));
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'analyse du fichier");
      setStep("configure");
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    const idsToImport = effectiveIds.filter((id) => !notFoundIds.has(id));
    if (idsToImport.length === 0) return;

    setError("");
    setStep("importing");
    setProgress({ done: 0, total: idsToImport.length });

    const created: WatchlistEntry[] = [];
    let failed = 0;

    for (const cardId of idsToImport) {
      try {
        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deck, cardId, quantity: 1 }),
        });
        if (res.ok) {
          created.push(await res.json());
        } else {
          setError(await readApiError(res, "Une ou plusieurs cartes n'ont pas pu être importées"));
          failed++;
        }
      } catch {
        setError("Une ou plusieurs cartes n'ont pas pu être importées");
        failed++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    onImported(created);
    setResult({ created: created.length, failed });
    setStep("done");
  }, [effectiveIds, notFoundIds, deck, onImported]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl border-gold/15 bg-[linear-gradient(180deg,rgba(19,20,24,0.98),rgba(13,14,18,0.98))] p-0 overflow-hidden">
        <DialogHeader className="border-b border-gold/10 bg-[linear-gradient(180deg,rgba(201,162,39,0.08),transparent)] px-6 py-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-gold/65">Deck Import</span>
            <DialogTitle className="font-heading text-gold tracking-wider text-sm uppercase">
              Importer un deck YDK
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground/50">
              Analyse du fichier, prévisualisation des cartes reconnues, puis import dans la watchlist.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded border border-amber-700/40 bg-amber-950/40 px-3 py-2">
              <p className="text-xs text-amber-200/90">{error}</p>
            </div>
          )}

          {/* ── Configuration (toujours visible sauf done) ── */}
          {step !== "done" && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-4">
              {/* Deck name */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground sm:w-16 flex-shrink-0">Deck</span>
                <Input
                  placeholder="Nom du deck (optionnel)…"
                  value={deck}
                  onChange={(e) => setDeck(e.target.value)}
                  disabled={step === "importing"}
                  className="h-9 text-xs bg-surface border-border focus-visible:ring-gold/50"
                />
              </div>

              {/* Sections */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground sm:w-16 flex-shrink-0">Sections</span>
                <div className="flex flex-wrap gap-2">
                {(["main", "extra", "side"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground hover:border-gold/25 transition-colors select-none">
                    <input
                      type="checkbox"
                      checked={sections[s]}
                      onChange={(e) => setSections((prev) => ({ ...prev, [s]: e.target.checked }))}
                      disabled={step === "importing"}
                      style={{ accentColor: "var(--color-gold)" }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                    {s === "main" ? "Main" : s === "extra" ? "Extra" : "Side"}
                  </label>
                ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Zone de drop (configure) ── */}
          {step === "configure" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl py-10 px-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                dragOver
                  ? "border-gold/60 bg-gold/5"
                  : "border-border/60 bg-card/50 hover:border-border hover:bg-surface/50"
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/15 bg-gold/8">
                <Upload className="w-5 h-5 text-gold/70" />
              </div>
              <p className="text-xs text-muted-foreground/70 text-center">
                Glisser un <span className="text-foreground/80 font-mono">.ydk</span> ici<br />
                ou <span className="text-gold/80">cliquer pour choisir</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ydk"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}

          {/* ── Chargement ── */}
          {step === "loading" && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyse du fichier…
            </div>
          )}

          {/* ── Aperçu ── */}
          {step === "preview" && (
            <div className="space-y-3">
              {/* Résumé */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1 rounded-full border border-emerald-700/20 bg-emerald-950/20 px-2.5 py-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {foundCount} carte{foundCount !== 1 ? "s" : ""} à importer
                </span>
                {notFoundCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-700/20 bg-amber-950/20 px-2.5 py-1 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {notFoundCount} non reconnue{notFoundCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Liste */}
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-border/60 bg-surface divide-y divide-border/40">
                {previewGroups.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Aucune carte dans les sections sélectionnées
                  </p>
                ) : (
                  previewGroups.map((g) => (
                    <div key={g.id} className="flex items-center justify-between px-3 py-2 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {g.found ? (
                          <FileText className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
                        )}
                        <span className={cn(
                          "text-xs truncate",
                          g.found ? "text-foreground/80" : "text-amber-400/70 font-mono"
                        )}>
                          {g.name ?? `ID ${g.id}`}
                        </span>
                      </div>
                      {g.count > 1 && (
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums flex-shrink-0">
                          ×{g.count}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Changer de fichier */}
              <button
                onClick={() => { setYdkData(null); setStep("configure"); }}
                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Choisir un autre fichier
              </button>
            </div>
          )}

          {/* ── Import en cours ── */}
          {step === "importing" && (
            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Import en cours…
                </span>
                <span className="tabular-nums">{progress.done} / {progress.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-gold/70 transition-all duration-200 rounded-full"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Résultat ── */}
          {step === "done" && result && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-medium text-foreground">
                {result.created} carte{result.created !== 1 ? "s" : ""} importée{result.created !== 1 ? "s" : ""}
              </p>
              {result.failed > 0 && (
                <p className="text-xs text-amber-400/80">
                  {result.failed} échec{result.failed !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex flex-col-reverse gap-2 pt-3 border-t border-border sm:flex-row sm:justify-end">
            {step === "done" ? (
              <Button
                size="sm"
                onClick={onClose}
                className="h-9 bg-gold text-background hover:bg-gold/90 font-medium px-4 text-xs"
              >
                Fermer
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  disabled={step === "importing"}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </Button>
                {step === "preview" && foundCount > 0 && (
                  <Button
                    size="sm"
                    onClick={handleImport}
                    className="h-9 bg-gold text-background hover:bg-gold/90 font-medium px-4 text-xs"
                  >
                    Importer {foundCount} carte{foundCount !== 1 ? "s" : ""}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from "react";
import Image from "next/image";
import { Plus, Trash2, Users, RefreshCw, X, ExternalLink, Search, Download, Upload, Pencil, ShoppingCart, LayoutDashboard } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CardAutocomplete } from "./CardAutocomplete";
import { SellerDialog } from "./SellerDialog";
import { ImportDialog } from "./ImportDialog";
import { PurchasePlan } from "./PurchasePlan";
import { Dashboard } from "./Dashboard";
import type { WatchlistEntry, Seller, CardInfo, RarityOption } from "./types";

// ── Helper : calcule les seller IDs au meilleur prix sur une ligne ────────
// Retourne un Set vide si moins de 2 prix sont renseignés (rien à comparer).

function getBestSellerIds(entry: WatchlistEntry, sellers: Seller[]): Set<number> {
  const activeSellersIds = new Set(sellers.map((s) => s.id));
  const valid = entry.prices.filter(
    (p) => p.price !== null && activeSellersIds.has(p.sellerId)
  ) as { sellerId: number; price: number }[];

  if (valid.length < 2) return new Set();

  const min = Math.min(...valid.map((p) => p.price));
  return new Set(valid.filter((p) => p.price === min).map((p) => p.sellerId));
}

// ── Sous-composant : sélecteur d'édition ─────────────────────────────────

function EditionSelect({
  cardId,
  value,
  onChange,
}: {
  cardId: number;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cards/${cardId}/sets`)
      .then((r) => r.json())
      .then((data: string[]) => {
        if (!cancelled) { setOptions(data); setLoaded(true); }
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [cardId]);

  if (!loaded) return <span className="text-xs text-muted-foreground px-2">…</span>;

  return (
    <Select
      value={value ?? "_none"}
      onValueChange={(v) => onChange(v === "_none" ? null : v)}
    >
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-2 shadow-none focus:ring-0 gap-1 w-full truncate">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border text-xs max-h-60">
        <SelectItem value="_none" className="text-muted-foreground text-xs">—</SelectItem>
        {options.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Sous-composant : sélecteur de rareté ─────────────────────────────────

function RaritySelect({
  cardId,
  setName,
  value,
  onChange,
}: {
  cardId: number;
  setName: string | null;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [options, setOptions] = useState<RarityOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    const url = setName
      ? `/api/cards/${cardId}/rarities?setName=${encodeURIComponent(setName)}`
      : `/api/cards/${cardId}/rarities`;
    fetch(url)
      .then((r) => r.json())
      .then((data: RarityOption[]) => {
        if (!cancelled) { setOptions(data); setLoaded(true); }
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [cardId, setName]);

  if (!loaded) return <span className="text-xs text-muted-foreground px-2">…</span>;

  return (
    <Select
      value={value ?? "_none"}
      onValueChange={(v) => onChange(v === "_none" ? null : v)}
    >
      <SelectTrigger className="h-7 text-xs border-0 bg-transparent px-2 shadow-none focus:ring-0 gap-1 w-full truncate">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border text-xs max-h-60">
        <SelectItem value="_none" className="text-muted-foreground text-xs">—</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.rarity} value={o.rarity} className="text-xs">
            <span>{o.rarity}</span>
            {o.code && <span className="ml-1 text-muted-foreground font-mono">{o.code}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Sous-composant : cellule de prix ─────────────────────────────────────

function formatDaysAgo(dateStr: string): string {
  const days = Math.round((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

function PriceCell({
  price,
  previousPrice = null,
  previousUpdatedAt = null,
  onSave,
  isBest = false,
}: {
  price: number | null;
  previousPrice?: number | null;
  previousUpdatedAt?: string | null;
  onSave: (v: number | null) => void;
  isBest?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setRaw(price != null ? String(price) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const num = parseFloat(raw.replace(",", "."));
    onSave(isNaN(num) || raw.trim() === "" ? null : num);
    setEditing(false);
  };

  const showVariation = price !== null && previousPrice !== null && previousPrice !== price;
  const isDown = showVariation && price < previousPrice!;

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full bg-surface-raised text-right text-xs tabular-nums px-2 py-1
                   border border-gold/40 rounded outline-none focus:border-gold/70
                   transition-colors"
        placeholder="0.00"
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      className={cn(
        "relative group w-full h-full text-right text-xs tabular-nums px-2 py-1 rounded transition-colors",
        isBest
          ? "bg-emerald-900/25 text-emerald-300 hover:bg-emerald-900/40"
          : "hover:bg-surface-raised text-foreground/90"
      )}
    >
      {price != null ? (
        <span className="inline-flex items-baseline gap-1 justify-end">
          <span className={cn("text-[10px]", isBest ? "text-emerald-500" : "text-muted-foreground")}>€</span>
          {price.toFixed(2)}
          {showVariation && (
            <span className={cn("text-[9px] leading-none font-bold", isDown ? "text-emerald-400" : "text-amber-400")}>
              {isDown ? "↓" : "↑"}
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground/30">—</span>
      )}

      {/* Tooltip variation */}
      {showVariation && (
        <span className="absolute bottom-full right-1 mb-1.5 px-2 py-1 rounded
                         bg-card border border-border/70 shadow-md
                         text-[10px] text-foreground/80 whitespace-nowrap
                         opacity-0 group-hover:opacity-100 transition-opacity
                         pointer-events-none z-20">
          <span className="text-muted-foreground/60">Avant : </span>
          <span className={cn("font-medium tabular-nums", isDown ? "text-amber-400/80" : "text-emerald-400/80")}>
            €{previousPrice!.toFixed(2)}
          </span>
          {previousUpdatedAt && (
            <span className="text-muted-foreground/50 ml-1">· {formatDaysAgo(previousUpdatedAt)}</span>
          )}
        </span>
      )}
    </button>
  );
}

// ── Helper : meilleur vendeur par ligne ──────────────────────────────────

function getBestDeal(
  entry: WatchlistEntry,
  sellers: Seller[]
): { sellerName: string; saving: number | null } | null {
  const sellerMap = new Map(sellers.map((s) => [s.id, s.name]));
  const valid = entry.prices
    .filter((p) => p.price !== null && sellerMap.has(p.sellerId))
    .map((p) => ({ name: sellerMap.get(p.sellerId)!, price: p.price as number }));

  if (valid.length === 0) return null;

  const sorted = [...valid].sort((a, b) => a.price - b.price);
  const best = sorted[0];
  const saving = valid.length >= 2 ? sorted[sorted.length - 1].price - best.price : null;

  return { sellerName: best.name, saving };
}

// ── Helper : totaux et couverture par vendeur ─────────────────────────────

function computeSellerStats(
  entries: WatchlistEntry[],
  sellers: Seller[]
): Map<number, { total: number; covered: number }> {
  const stats = new Map<number, { total: number; covered: number }>();
  for (const seller of sellers) {
    let total = 0;
    let covered = 0;
    for (const entry of entries) {
      const p = entry.prices.find((px) => px.sellerId === seller.id);
      if (p?.price != null) {
        total += p.price * entry.quantity;
        covered++;
      }
    }
    stats.set(seller.id, { total, covered });
  }
  return stats;
}

// ── Statuts ───────────────────────────────────────────────────────────────

const STATUSES = ["", "À commander", "Commandé", "Reçu"] as const;
type Status = typeof STATUSES[number];

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  "À commander": { label: "À commander", classes: "bg-blue-900/40 text-blue-300 border-blue-700/50" },
  "Commandé":    { label: "Commandé",    classes: "bg-amber-900/40 text-amber-300 border-amber-700/50" },
  "Reçu":        { label: "Reçu",        classes: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50" },
};

function StatusBadge({ status, onClick }: { status: string; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) {
    return (
      <button
        onClick={onClick}
        title="Définir un statut"
        className="flex items-center gap-1 text-[10px] text-muted-foreground/40 border border-dashed border-muted-foreground/20
                   px-1.5 py-0.5 rounded leading-none
                   hover:text-muted-foreground/70 hover:border-muted-foreground/40 transition-all"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 inline-block" />
        <span className="hidden group-hover:inline">—</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      title="Changer le statut"
      className={cn(
        "text-[10px] font-medium px-2 py-1 rounded-md border leading-none transition-colors hover:opacity-90",
        cfg.classes
      )}
    >
      {cfg.label}
    </button>
  );
}

// ── Types locaux ──────────────────────────────────────────────────────────

type PendingEntry = { deck: string; quantity: number };
type EditingCell = { id: number; field: "deck" | "qty" };
type SortConfig = { column: "name" | "qty" | number; dir: "asc" | "desc" } | null;

// ── Indicateur de tri dans les headers ────────────────────────────────────

function SortIndicator({ column, sort }: { column: "name" | "qty" | number; sort: SortConfig }) {
  if (!sort || sort.column !== column)
    return <span className="opacity-20 text-[10px]">⇅</span>;
  return <span className="text-gold text-[10px]">{sort.dir === "asc" ? "▲" : "▼"}</span>;
}

// ── Composant principal ───────────────────────────────────────────────────

interface TrackerClientProps {
  initialEntries: WatchlistEntry[];
  initialSellers: Seller[];
}

function hasCard(
  entry: WatchlistEntry
): entry is WatchlistEntry & { card: CardInfo } {
  return Boolean(entry.card);
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = await response.json() as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export function TrackerClient({ initialEntries, initialSellers }: TrackerClientProps) {
  const [entries, setEntries] = useState<WatchlistEntry[]>(initialEntries);
  const [sellers, setSellers] = useState<Seller[]>(initialSellers);
  const [uiError, setUiError] = useState("");
  const [pending, setPending] = useState<PendingEntry | null>(null);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [sellerDialog, setSellerDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [filterDeck, setFilterDeck] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sort, setSort] = useState<SortConfig>(null);
  const [groupByDeck, setGroupByDeck] = useState(false);
  const [view, setView] = useState<"table" | "plan" | "dashboard">("table");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Télécharge en background les images manquantes au montage
  useEffect(() => {
    const missing = initialEntries
      .filter((e) => e.card && !e.card.hasLocalImage)
      .map((e) => e.card.id);
    const unique = [...new Set(missing)];
    for (const cardId of unique) {
      fetch(`/api/cards/${cardId}/image`, { method: "POST" })
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data?.path) {
            setEntries((prev) =>
              prev.map((e) =>
                e.card?.id === cardId
                  ? { ...e, card: { ...e.card, hasLocalImage: true } }
                  : e
              )
            );
          }
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycleSort = useCallback((column: "name" | "qty" | number) => {
    setSort((prev) => {
      if (!prev || prev.column !== column) return { column, dir: "asc" };
      if (prev.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  }, []);

  const deckOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const e of entries.filter(hasCard)) {
      if (e.deck) seen.add(e.deck);
    }
    return Array.from(seen).sort();
  }, [entries]);

  const validEntries = useMemo(() => entries.filter(hasCard), [entries]);
  const toOrderCount = useMemo(
    () => validEntries.filter((e) => e.status === "À commander").length,
    [validEntries]
  );
  const orderedCount = useMemo(
    () => validEntries.filter((e) => e.status === "Commandé").length,
    [validEntries]
  );
  const receivedCount = useMemo(
    () => validEntries.filter((e) => e.status === "Reçu").length,
    [validEntries]
  );

  // ── Sélection multiple ────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const bulkSetStatus = useCallback(async (status: string) => {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/watchlist/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setEntries((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, status } : e));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const bulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => fetch(`/api/watchlist/${id}`, { method: "DELETE" })));
    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    setSelectedIds(new Set());
  }, [selectedIds]);

  const filteredEntries = useMemo(() => {
    let result = validEntries;
    if (filterDeck) result = result.filter((e) => e.deck === filterDeck);
    if (filterName) {
      const lower = filterName.toLowerCase();
      result = result.filter((e) => e.card.name.toLowerCase().includes(lower));
    }
    if (filterStatus) result = result.filter((e) => e.status === filterStatus);
    return result;
  }, [validEntries, filterDeck, filterName, filterStatus]);

  const sortedEntries = useMemo(() => {
    if (!sort) return filteredEntries;
    return [...filteredEntries].sort((a, b) => {
      let cmp = 0;
      if (sort.column === "name") {
        cmp = a.card.name.localeCompare(b.card.name, "fr");
      } else if (sort.column === "qty") {
        cmp = a.quantity - b.quantity;
      } else {
        const pa = a.prices.find((p) => p.sellerId === sort.column)?.price ?? null;
        const pb = b.prices.find((p) => p.sellerId === sort.column)?.price ?? null;
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        cmp = pa - pb;
      }
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filteredEntries, sort]);

  const showError = useCallback((error: unknown, fallback: string) => {
    setUiError(error instanceof Error ? error.message : fallback);
  }, []);

  // ── Mutations entries ──────────────────────────────────────────────────

  const addEntry = useCallback(async (deck: string, cardId: number, quantity: number) => {
    setUiError("");
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deck, cardId, quantity }),
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, "Erreur lors de l'ajout de la carte"));
    }

    const entry: WatchlistEntry = await res.json();
    setEntries((prev) => [...prev, entry]);

    // Télécharge l'image en arrière-plan et met à jour l'état local
    fetch(`/api/cards/${cardId}/image`, { method: "POST" })
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data?.path) {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? { ...e, card: { ...e.card, hasLocalImage: true } }
                : e
            )
          );
        }
      });

    return entry;
  }, []);

  const updateEntry = useCallback(async (id: number, patch: Partial<WatchlistEntry>) => {
    setUiError("");
    const res = await fetch(`/api/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, "Erreur lors de la mise à jour"));
    }

    const updated: WatchlistEntry = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const cycleStatus = useCallback((id: number, current: string) => {
    const idx = STATUSES.indexOf(current as Status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    updateEntry(id, { status: next }).catch((error) => {
      showError(error, "Erreur lors de la mise à jour");
    });
  }, [showError, updateEntry]);

  const startEditNote = useCallback((id: number, current: string) => {
    setEditingNote(id);
    setNoteValue(current);
  }, []);

  const commitNote = useCallback(() => {
    if (editingNote === null) return;
    updateEntry(editingNote, { notes: noteValue }).catch((error) => {
      showError(error, "Erreur lors de la mise à jour");
    });
    setEditingNote(null);
  }, [editingNote, noteValue, showError, updateEntry]);

  const deleteEntry = useCallback(async (id: number) => {
    setUiError("");
    const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(await readApiError(res, "Erreur lors de la suppression"));
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updatePrice = useCallback(
    async (watchlistEntryId: number, sellerId: number, price: number | null) => {
      const res = await fetch("/api/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistEntryId, sellerId, price }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Erreur lors de la mise à jour du prix"));
      }
      const updated = await res.json() as { sellerId: number; price: number | null; previousPrice: number | null; previousUpdatedAt: string | null; updatedAt: string };
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== watchlistEntryId) return e;
          const existing = e.prices.find((p) => p.sellerId === sellerId);
          const newPrice = {
            sellerId,
            price: updated.price,
            previousPrice: updated.previousPrice,
            previousUpdatedAt: updated.previousUpdatedAt,
            updatedAt: updated.updatedAt,
          };
          return {
            ...e,
            prices: existing
              ? e.prices.map((p) => (p.sellerId === sellerId ? newPrice : p))
              : [...e.prices, newPrice],
          };
        })
      );
    },
    []
  );

  // ── Mutations sellers ──────────────────────────────────────────────────

  const addSeller = useCallback(async ({ name }: { name: string }) => {
    const res = await fetch("/api/sellers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      throw new Error(await readApiError(res, "Erreur lors de l'ajout"));
    }
    const seller: Seller = await res.json();
    setSellers((prev) => [...prev, seller]);
    // Ajoute la cellule de prix (null) pour chaque entrée existante
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        prices: [...e.prices, { sellerId: seller.id, price: null, previousPrice: null, previousUpdatedAt: null, updatedAt: new Date().toISOString() }],
      }))
    );
  }, []);

  const deleteSeller = useCallback(async (id: number) => {
    const res = await fetch(`/api/sellers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(await readApiError(res, "Erreur lors de la suppression"));
    }
    setSellers((prev) => prev.filter((s) => s.id !== id));
    setEntries((prev) =>
      prev.map((e) => ({ ...e, prices: e.prices.filter((p) => p.sellerId !== id) }))
    );
  }, []);

  const handleImported = useCallback((newEntries: WatchlistEntry[]) => {
    setEntries((prev) => [...prev, ...newEntries]);
  }, []);

  const markAsOrdered = useCallback(async (ids: number[]) => {
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/watchlist/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Commandé" }),
        })
      )
    );
    setEntries((prev) =>
      prev.map((e) =>
        ids.includes(e.id) ? { ...e, status: "Commandé" } : e
      )
    );
  }, []);

  // ── Pending row ────────────────────────────────────────────────────────

  const handlePendingCardSelect = useCallback(
    async (card: CardInfo) => {
      const deck = pending?.deck ?? "";
      const quantity = pending?.quantity ?? 1;
      setPending(null);
      try {
        await addEntry(deck, card.id, quantity);
      } catch (error) {
        setPending({ deck, quantity });
        showError(error, "Erreur lors de l'ajout de la carte");
      }
    },
    [pending, addEntry, showError]
  );

  // ── Inline edit helpers ────────────────────────────────────────────────

  const startEdit = (id: number, field: "deck" | "qty", current: string) => {
    setEditing({ id, field });
    setEditValue(current);
  };

  const commitEdit = () => {
    if (!editing) return;
    const { id, field } = editing;
    setEditing(null);
    if (field === "deck") {
      updateEntry(id, { deck: editValue }).catch((error) => {
        showError(error, "Erreur lors de la mise à jour");
      });
    } else {
      const qty = parseInt(editValue, 10);
      if (!isNaN(qty) && qty > 0) {
        updateEntry(id, { quantity: qty }).catch((error) => {
          showError(error, "Erreur lors de la mise à jour");
        });
      }
    }
  };

  // ── Sync manuelle ──────────────────────────────────────────────────────

  const triggerSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
    } finally {
      setSyncing(false);
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────

  const exportToCSV = useCallback(() => {
    const escapeCell = (v: string) => {
      if (v.includes(",") || v.includes('"') || v.includes("\n"))
        return `"${v.replace(/"/g, '""')}"`;
      return v;
    };

    const headers = [
      "Deck", "Carte", "Qté", "Édition", "Rareté", "Statut",
      ...sellers.map((s) => s.name),
      "Best deal",
    ];

    const rows = validEntries.map((entry) => {
      const deal = getBestDeal(entry, sellers);
      return [
        entry.deck,
        entry.card.name,
        String(entry.quantity),
        entry.setName ?? "",
        entry.rarity ?? "",
        entry.status,
        ...sellers.map((s) => {
          const p = entry.prices.find((px) => px.sellerId === s.id);
          return p?.price != null ? p.price.toFixed(2) : "";
        }),
        deal
          ? `${deal.sellerName}${deal.saving != null && deal.saving > 0 ? ` (-€${deal.saving.toFixed(2)})` : ""}`
          : "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ygo-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [validEntries, sellers]);

  // ── Render ─────────────────────────────────────────────────────────────

  const thClass =
    "px-2 py-2.5 text-left text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-[0.1em] whitespace-nowrap border-b-2 border-gold/20 bg-[#0f1014] sticky top-0 z-10";
  const tdClass = "px-2 align-middle border-b border-border/40";

  const renderEntryRow = (entry: WatchlistEntry) => {
    if (!entry.card) return null;
    const isSelected = selectedIds.has(entry.id);
    return (
    <tr key={entry.id} className={cn("table-row-hover h-[84px] group", entry.status === "Reçu" && "opacity-35", isSelected && "!bg-gold/8 ring-inset ring-1 ring-gold/20")}>
      {/* Checkbox */}
      <td className={`${tdClass} w-[36px] text-center`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(entry.id)}
          style={{ accentColor: "var(--color-gold)" }}
          className="w-3.5 h-3.5 cursor-pointer"
        />
      </td>
      {/* Image */}
      <td className={`${tdClass} w-[52px]`}>
        <div className="relative w-[44px] h-[64px] rounded overflow-hidden bg-surface flex-shrink-0 mx-auto ring-1 ring-white/10 shadow-md">
          <Image
            src={entry.card.hasLocalImage ? `/cards/${entry.card.id}.jpg` : entry.card.imageUrl}
            alt={entry.card.name}
            fill
            className="object-cover"
            sizes="44px"
            unoptimized={!entry.card.hasLocalImage}
          />
        </div>
      </td>
      {/* Deck + Status */}
      <td className={`${tdClass} w-[120px]`}>
        <div className="flex flex-col justify-center gap-1 py-1">
          {editing?.id === entry.id && editing.field === "deck" ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
              className="w-full bg-surface-raised text-xs px-2 py-1 rounded border border-gold/40 outline-none text-foreground"
              placeholder="Deck…"
            />
          ) : (
            <button
              onClick={() => startEdit(entry.id, "deck", entry.deck)}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-surface-raised transition-colors"
            >
              {entry.deck ? (
                <span className="inline-block text-[11px] font-semibold text-gold/80 tracking-[0.03em] uppercase
                                 truncate max-w-[100px]">
                  {entry.deck}
                </span>
              ) : (
                <span className="text-muted-foreground/25 text-xs">—</span>
              )}
            </button>
          )}
        </div>
      </td>
      {/* Carte + Note */}
      <td className={`${tdClass} w-[240px]`}>
        <div className="flex flex-col gap-1.5 py-1.5">
          <div className="text-sm font-semibold text-foreground/95 truncate px-2 leading-tight">{entry.card.name}</div>
          <div className="px-2">
            <StatusBadge
              status={entry.status}
              onClick={() => cycleStatus(entry.id, entry.status)}
            />
          </div>
          {editingNote === entry.id ? (
            <textarea
              autoFocus
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={commitNote}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setEditingNote(null); }
                if (e.key === "Enter" && e.ctrlKey) commitNote();
              }}
              rows={2}
              className="mx-2 text-xs bg-surface-raised border border-gold/40 rounded-md px-2.5 py-2
                         outline-none resize-none text-foreground placeholder:text-muted-foreground/30
                         focus:border-gold/70 transition-colors"
              placeholder="Note…"
            />
          ) : entry.notes ? (
            <button
              onClick={() => startEditNote(entry.id, entry.notes)}
              className="mx-2 text-left text-[11px] text-foreground/72 px-2.5 py-2 rounded-md leading-snug
                         bg-surface-raised/80 border border-border/60 hover:border-gold/30
                         hover:text-foreground/88 transition-colors line-clamp-2"
              title={entry.notes}
            >
              {entry.notes}
            </button>
          ) : (
            <button
              onClick={() => startEditNote(entry.id, "")}
              className="flex items-center gap-1 mx-2 px-2.5 py-1.5 rounded-md border border-dashed
                         border-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-all
                         text-[10px] text-muted-foreground/45 hover:text-foreground/70 hover:border-gold/25"
              title="Ajouter une note"
            >
              <Pencil className="w-2.5 h-2.5" />
              Ajouter une note
            </button>
          )}
        </div>
      </td>
      {/* Quantité */}
      <td className={`${tdClass} w-[52px] text-center`}>
        {editing?.id === entry.id && editing.field === "qty" ? (
          <input
            autoFocus
            type="number"
            min={1}
            max={99}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
            className="w-10 bg-surface-raised text-center text-xs px-1 py-1 rounded border border-gold/40 outline-none text-foreground mx-auto block"
          />
        ) : (
          <button
            onClick={() => startEdit(entry.id, "qty", String(entry.quantity))}
            className="text-xs tabular-nums text-foreground/80 px-2 py-1 rounded hover:bg-surface-raised transition-colors w-full"
          >
            ×{entry.quantity}
          </button>
        )}
      </td>
      {/* Édition */}
      <td className={`${tdClass} w-[175px]`}>
        <EditionSelect
          cardId={entry.cardId}
          value={entry.setName}
          onChange={(v) => {
            updateEntry(entry.id, { setName: v, rarity: null }).catch((error) => {
              showError(error, "Erreur lors de la mise à jour");
            });
          }}
        />
      </td>
      {/* Rareté */}
      <td className={`${tdClass} w-[145px]`}>
        <RaritySelect
          cardId={entry.cardId}
          setName={entry.setName}
          value={entry.rarity}
          onChange={(v) => {
            updateEntry(entry.id, { rarity: v }).catch((error) => {
              showError(error, "Erreur lors de la mise à jour");
            });
          }}
        />
      </td>
      {/* Supprimer */}
      <td className={`${tdClass} w-[36px] text-center`}>
        <button
          onClick={() => {
            deleteEntry(entry.id).catch((error) => {
              showError(error, "Erreur lors de la suppression");
            });
          }}
          className="text-muted-foreground/30 hover:text-destructive transition-colors p-1 rounded"
          title="Supprimer cette ligne"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
      {/* Prix */}
      {(() => {
        const bestIds = getBestSellerIds(entry, sellers);
        return sellers.map((seller) => {
          const priceData = entry.prices.find((p) => p.sellerId === seller.id);
          return (
            <td key={seller.id} className={`${tdClass} w-[110px]`}>
              <PriceCell
                price={priceData?.price ?? null}
                previousPrice={priceData?.previousPrice ?? null}
                previousUpdatedAt={priceData?.previousUpdatedAt ?? null}
                isBest={bestIds.has(seller.id)}
                onSave={(v) => {
                  updatePrice(entry.id, seller.id, v).catch((error) => {
                    showError(error, "Erreur lors de la mise à jour du prix");
                  });
                }}
              />
            </td>
          );
        });
      })()}
      {/* Best deal */}
      {(() => {
        const deal = getBestDeal(entry, sellers);
        return (
          <td className={`${tdClass} w-[130px] px-3`}>
            {deal ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-foreground/80 truncate font-mono">{deal.sellerName}</span>
                {deal.saving != null && deal.saving > 0 && (
                  <span className="text-[10px] text-emerald-500/70 tabular-nums">−€{deal.saving.toFixed(2)}</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground/20 text-xs">—</span>
            )}
          </td>
        );
      })()}
      <td className={`${tdClass} w-[36px]`} />
    </tr>
  );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#1a1d29_0%,#0d0e12_42%)] fade-in-soft">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-none border-b border-gold/10 bg-[linear-gradient(180deg,rgba(19,20,24,0.96),rgba(13,14,18,0.98))] px-4 py-2.5 backdrop-blur-sm fade-in-up">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <button
              onClick={() => setView("table")}
              className="font-heading text-base font-semibold tracking-[0.14em] text-gold uppercase hover:opacity-80 transition-opacity sm:text-lg"
            >
              YGO Research Tracker
            </button>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-gold/20 bg-gold/8 px-2.5 py-1 font-medium tracking-[0.08em] text-gold/80 uppercase">
                Watchlist
              </span>
              <span className="hidden text-muted-foreground/55 lg:inline">
                Compare les vendeurs, priorise les achats et garde la progression visible.
              </span>
            </div>
            <div className="hidden flex-wrap gap-1.5 stagger-fade-children sm:flex">
              <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
                Cartes <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-foreground tabular-nums">{validEntries.length}</span>
              </span>
              <span className="rounded-full border border-blue-700/20 bg-blue-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-blue-300/60">
                À commander <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-blue-200 tabular-nums">{toOrderCount}</span>
              </span>
              <span className="rounded-full border border-amber-700/20 bg-amber-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300/60">
                Commandé <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-amber-200 tabular-nums">{orderedCount}</span>
              </span>
              <span className="rounded-full border border-emerald-700/20 bg-emerald-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300/60">
                Reçu <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-emerald-200 tabular-nums">{receivedCount}</span>
              </span>
              <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
                Vendeurs <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-foreground tabular-nums">{sellers.length}</span>
              </span>
            </div>
          </div>
          <div className="hidden w-full flex-wrap items-center justify-start gap-2 sm:flex sm:w-auto sm:justify-end stagger-fade-children">
            <span className="mr-1 hidden text-[11px] text-muted-foreground/55 tabular-nums lg:inline">
              {entries.length} carte{entries.length !== 1 ? "s" : ""}
            </span>
          <button
            onClick={() => setView((v) => v === "dashboard" ? "table" : "dashboard")}
            title={view === "dashboard" ? "Retour au tableau" : "Tableau de bord"}
            className={cn(
              "flex min-h-8 items-center justify-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-full border basis-[calc(50%-0.25rem)] sm:basis-auto",
              view === "dashboard"
                ? "text-gold border-gold/30 bg-gold/10 hover:bg-gold/15"
                : "text-muted-foreground border-border/60 bg-card/70 hover:text-foreground hover:bg-surface-raised"
            )}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setView((v) => v === "plan" ? "table" : "plan")}
            title={view === "plan" ? "Retour au tableau" : "Voir le plan d'achat"}
            className={cn(
              "flex min-h-8 items-center justify-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-full border basis-[calc(50%-0.25rem)] sm:basis-auto",
              view === "plan"
                ? "text-gold border-gold/30 bg-gold/10 hover:bg-gold/15"
                : "text-muted-foreground border-border/60 bg-card/70 hover:text-foreground hover:bg-surface-raised"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Plan d'achat
            {toOrderCount > 0 && (
              <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded-full tabular-nums leading-none">
                {toOrderCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setImportDialog(true)}
            title="Importer un deck YDK"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised min-h-8 basis-[calc(50%-0.25rem)] justify-center sm:basis-auto"
          >
            <Upload className="w-3.5 h-3.5" />
            Importer
          </button>
          <button
            onClick={exportToCSV}
            disabled={entries.length === 0}
            title="Exporter la watchlist complète en CSV"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised disabled:opacity-30
                       disabled:cursor-not-allowed min-h-8 basis-[calc(50%-0.25rem)] justify-center sm:basis-auto"
          >
            <Download className="w-3.5 h-3.5" />
            Watchlist CSV
          </button>
          <button
            onClick={triggerSync}
            disabled={syncing}
            title="Synchroniser la base YGOProDeck"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised disabled:opacity-50 min-h-8 basis-[calc(50%-0.25rem)] justify-center sm:basis-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={() => setSellerDialog(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground
                       transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised min-h-8 basis-[calc(50%-0.25rem)] justify-center sm:basis-auto"
          >
            <Users className="w-3.5 h-3.5" />
            Vendeurs
          </button>
        </div>

        <div className="w-full space-y-2 sm:hidden">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="shrink-0 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
              Cartes <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-foreground tabular-nums">{validEntries.length}</span>
            </span>
            <span className="shrink-0 rounded-full border border-blue-700/20 bg-blue-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-blue-300/60">
              À commander <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-blue-200 tabular-nums">{toOrderCount}</span>
            </span>
            <span className="shrink-0 rounded-full border border-amber-700/20 bg-amber-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300/60">
              Commandé <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-amber-200 tabular-nums">{orderedCount}</span>
            </span>
            <span className="shrink-0 rounded-full border border-emerald-700/20 bg-emerald-950/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300/60">
              Reçu <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-emerald-200 tabular-nums">{receivedCount}</span>
            </span>
            <span className="shrink-0 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/55">
              Vendeurs <span className="ml-1 text-sm font-semibold normal-case tracking-normal text-foreground tabular-nums">{sellers.length}</span>
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setView((v) => v === "dashboard" ? "table" : "dashboard")}
              title={view === "dashboard" ? "Retour au tableau" : "Tableau de bord"}
              className={cn(
                "shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-full border",
                view === "dashboard"
                  ? "text-gold border-gold/30 bg-gold/10 hover:bg-gold/15"
                  : "text-muted-foreground border-border/60 bg-card/70 hover:text-foreground hover:bg-surface-raised"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setView((v) => v === "plan" ? "table" : "plan")}
              title={view === "plan" ? "Retour au tableau" : "Voir le plan d'achat"}
              className={cn(
                "shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-full border",
                view === "plan"
                  ? "text-gold border-gold/30 bg-gold/10 hover:bg-gold/15"
                  : "text-muted-foreground border-border/60 bg-card/70 hover:text-foreground hover:bg-surface-raised"
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Plan
            </button>
            <button
              onClick={() => setImportDialog(true)}
              title="Importer un deck YDK"
              className="shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised"
            >
              <Upload className="w-3.5 h-3.5" />
              Importer
            </button>
            <button
              onClick={exportToCSV}
              disabled={entries.length === 0}
              title="Exporter la watchlist complète en CSV"
              className="shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={triggerSync}
              disabled={syncing}
              title="Synchroniser la base YGOProDeck"
              className="shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </button>
            <button
              onClick={() => setSellerDialog(true)}
              className="shrink-0 flex min-h-8 items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised"
            >
              <Users className="w-3.5 h-3.5" />
              Vendeurs
            </button>
          </div>
        </div>
        </div>
      </header>

      {uiError && (
        <div className="flex-none border-b border-amber-700/30 bg-amber-950/40 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-200/90">{uiError}</p>
          <button
            onClick={() => setUiError("")}
            className="text-[11px] text-amber-200/60 hover:text-amber-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      )}

      {/* ── Vue dashboard ───────────────────────────────────────────────── */}
      {view === "dashboard" && <Dashboard entries={entries} sellers={sellers} />}

      {/* ── Vue plan d'achat ────────────────────────────────────────────── */}
      {view === "plan" && <PurchasePlan entries={entries} sellers={sellers} onMarkOrdered={markAsOrdered} />}

      {/* ── Vue tableau ─────────────────────────────────────────────────── */}
      {view === "table" && (
      <Fragment>

      {/* ── Barre de filtres ────────────────────────────────────────────── */}
      <div className="flex-none border-b border-border/50 px-4 py-3 bg-[linear-gradient(180deg,rgba(19,20,24,0.72),rgba(13,14,18,0.92))] fade-in-up">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-3 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="mr-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold/70">Filtres</div>
            <div className="hidden text-[11px] text-muted-foreground/45 sm:block">Affinage instantané de la watchlist</div>
          </div>
          <Select
            value={filterDeck || "_all"}
            onValueChange={(v) => setFilterDeck(v === "_all" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="h-8 text-xs w-full sm:w-[170px] rounded-xl border-border/60 bg-surface shadow-none focus:ring-0">
              <SelectValue placeholder="Tous les decks" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-h-60">
              <SelectItem value="_all" className="text-xs text-muted-foreground">Tous les decks</SelectItem>
              {deckOptions.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40 pointer-events-none" />
            <input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filtrer par nom…"
              className="h-8 w-full sm:w-[210px] rounded-xl border border-border/60 bg-surface pl-7 pr-3 text-xs text-foreground
                         outline-none transition-colors placeholder:text-muted-foreground/30 focus:border-gold/50"
            />
          </div>

          <Select
            value={filterStatus || "_all"}
            onValueChange={(v) => setFilterStatus(v === "_all" ? "" : (v ?? ""))}
          >
            <SelectTrigger className="h-8 text-xs w-full sm:w-[160px] rounded-xl border-border/60 bg-surface shadow-none focus:ring-0">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-xs max-h-60">
              <SelectItem value="_all" className="text-xs text-muted-foreground">Tous les statuts</SelectItem>
              <SelectItem value="À commander" className="text-xs text-blue-300">À commander</SelectItem>
              <SelectItem value="Commandé" className="text-xs text-amber-300">Commandé</SelectItem>
              <SelectItem value="Reçu" className="text-xs text-emerald-300">Reçu</SelectItem>
            </SelectContent>
          </Select>

          {(filterDeck || filterName || filterStatus) && (
            <button
              onClick={() => { setFilterDeck(""); setFilterName(""); setFilterStatus(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground
                         transition-colors px-2.5 py-1.5 rounded-full border border-border/60 bg-surface hover:bg-surface-raised w-full sm:w-auto justify-center"
            >
              <X className="w-3 h-3" />
              Effacer
            </button>
          )}

          <label className="flex items-center gap-2 rounded-full border border-border/60 bg-surface px-3 py-1.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors w-full sm:w-auto sm:ml-auto justify-center sm:justify-start">
            <input
              type="checkbox"
              checked={groupByDeck}
              onChange={(e) => setGroupByDeck(e.target.checked)}
              style={{ accentColor: "var(--color-gold)" }}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            Grouper par deck
          </label>

          <div className="w-full rounded-full border border-gold/15 bg-gold/8 px-3 py-1.5 text-[11px] tabular-nums text-gold/75 sm:w-auto">
            {filteredEntries.length} visible{filteredEntries.length !== 1 ? "s" : ""} / {entries.length}
          </div>
        </div>
      </div>

      {/* ── Barre d'actions sélection ───────────────────────────────────── */}
      {selectedIds.size > 0 && (() => {
        const allVisibleIds = sortedEntries.map((e) => e.id);
        const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
        return (
          <div className="flex-none border-b border-gold/25 bg-gold/5 px-4 py-3 flex flex-wrap items-center gap-3 fade-in-up">
            <span className="text-xs font-medium text-gold tabular-nums">
              {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
            </span>
            <div className="hidden h-4 w-px bg-border/60 sm:block" />
            <Select onValueChange={(v: string | null) => { bulkSetStatus(v ?? "").catch((e) => showError(e, "Erreur statut")); }}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[170px] border-gold/30 bg-surface shadow-none focus:ring-0">
                <SelectValue placeholder="Changer le statut…" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-xs">
                <SelectItem value="" className="text-xs text-muted-foreground">Aucun statut</SelectItem>
                <SelectItem value="À commander" className="text-xs text-blue-300">À commander</SelectItem>
                <SelectItem value="Commandé"    className="text-xs text-amber-300">Commandé</SelectItem>
                <SelectItem value="Reçu"        className="text-xs text-emerald-300">Reçu</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => bulkDelete().catch((e) => showError(e, "Erreur suppression"))}
              className="flex min-h-8 items-center justify-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border w-full sm:w-auto
                         text-red-400/80 border-red-700/30 hover:bg-red-900/20 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </button>
            <button
              onClick={() => {
                if (allSelected) setSelectedIds(new Set());
                else setSelectedIds(new Set(allVisibleIds));
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover:bg-surface-raised w-full sm:w-auto text-center"
            >
              {allSelected ? "Désélectionner tout" : "Tout sélectionner"}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-muted-foreground/50 hover:text-foreground transition-colors p-1 rounded ml-auto"
              title="Fermer la sélection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}

      {/* ── Tableau ─────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 px-0 py-3 sm:px-4 sm:py-4 fade-in-up">
        <div className="relative h-full overflow-hidden rounded-[16px] border-y border-border/70 bg-[#0b0c10] shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:rounded-[20px] sm:border">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(201,162,39,0.08),transparent)]" />
          <div className="h-full overflow-auto">
        <table className="border-collapse text-sm w-full" style={{ minWidth: `${986 + sellers.length * 110}px` }}>
          <thead>
            <tr>
              <th className={`${thClass} w-[36px] text-center`}>
                {(() => {
                  const allVisibleIds = sortedEntries.map((e) => e.id);
                  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id));
                  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));
                  return (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                      onChange={() => {
                        if (allSelected) setSelectedIds(new Set());
                        else setSelectedIds(new Set(allVisibleIds));
                      }}
                      style={{ accentColor: "var(--color-gold)" }}
                      className="w-3.5 h-3.5 cursor-pointer"
                    />
                  );
                })()}
              </th>
              <th className={`${thClass} w-[52px]`} />
              <th className={`${thClass} w-[120px]`}>Deck</th>
              <th className={`${thClass} w-[240px]`}>
                <button
                  onClick={() => cycleSort("name")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Carte
                  <SortIndicator column="name" sort={sort} />
                </button>
              </th>
              <th className={`${thClass} w-[52px] text-center`}>
                <button
                  onClick={() => cycleSort("qty")}
                  className="flex items-center gap-1 justify-center w-full hover:text-foreground transition-colors"
                >
                  Qté
                  <SortIndicator column="qty" sort={sort} />
                </button>
              </th>
              <th className={`${thClass} w-[175px]`}>Édition</th>
              <th className={`${thClass} w-[145px]`}>Rareté</th>
              <th className={`${thClass} w-[36px]`} />
              {sellers.map((s) => (
                <th key={s.id} className={`${thClass} w-[110px] text-right`}>
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={`https://www.cardmarket.com/fr/YuGiOh/Users/${encodeURIComponent(s.name)}/Offers/Singles`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] hover:text-gold transition-colors inline-flex items-center gap-1 group"
                      title={`Voir le profil de ${s.name} sur CardMarket`}
                    >
                      {s.name}
                      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
                    </a>
                    <button
                      onClick={() => cycleSort(s.id)}
                      className="hover:text-foreground transition-colors flex-shrink-0"
                      title={`Trier par ${s.name}`}
                    >
                      <SortIndicator column={s.id} sort={sort} />
                    </button>
                  </div>
                </th>
              ))}
              {/* Colonne Best deal */}
              <th className={`${thClass} w-[130px]`}>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold/80">Best deal</span>
                  <span className="mt-1 text-[9px] text-muted-foreground/35 normal-case tracking-normal">meilleur prix repéré</span>
                </div>
              </th>
              {/* Colonne "+" pour ajouter vendeur */}
              <th className={`${thClass} w-[36px] text-center`}>
                <button
                  onClick={() => setSellerDialog(true)}
                  title="Ajouter un vendeur"
                  className="text-muted-foreground hover:text-gold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* ── Lignes existantes ──────────────────────────────────── */}
            {groupByDeck ? (() => {
              const groups = new Map<string, WatchlistEntry[]>();
              for (const entry of sortedEntries) {
                const key = entry.deck || "";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(entry);
              }
              const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => {
                if (!a && b) return 1;
                if (a && !b) return -1;
                return a.localeCompare(b, "fr");
              });
              const subTd = "px-2 py-2 align-middle border-b border-gold/10 bg-[#111318]";
              return sortedGroups.map(([deck, groupEntries]) => {
                const groupStats = computeSellerStats(groupEntries, sellers);
                const maxGroupCovered = Math.max(0, ...Array.from(groupStats.values()).map((s) => s.covered));
                return (
                  <Fragment key={`group-${deck}`}>
                    {/* Sous-en-tête du groupe */}
                    <tr>
                      <td colSpan={8} className={subTd}>
                        <div className="flex items-center gap-2 pl-1">
                          <span className="w-0.5 h-3.5 rounded-full bg-gold/50 inline-block flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold/80">
                            {deck || "Sans deck"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/35 tabular-nums">
                            {groupEntries.length} carte{groupEntries.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </td>
                      {sellers.map((seller) => {
                        const s = groupStats.get(seller.id) ?? { total: 0, covered: 0 };
                        const isBest = s.covered === maxGroupCovered && maxGroupCovered > 0;
                        return (
                          <td key={seller.id} className={`${subTd} w-[110px] text-right`}>
                            {s.covered > 0 ? (
                              <div className="flex flex-col items-end gap-0.5 px-2">
                                <span className={cn("text-xs tabular-nums", isBest ? "text-gold" : "text-foreground/60")}>
                                  <span className={cn("text-[10px] mr-0.5", isBest ? "text-gold/60" : "text-muted-foreground/40")}>€</span>
                                  {s.total.toFixed(2)}
                                </span>
                                <span className={cn("text-[10px] tabular-nums", isBest ? "text-gold/60" : "text-muted-foreground/30")}>
                                  {s.covered}/{groupEntries.length}{isBest && <span className="ml-1">★</span>}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/15 text-xs px-2">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className={`${subTd} w-[130px]`} />
                      <td className={`${subTd} w-[36px]`} />
                    </tr>
                    {/* Lignes du groupe */}
                    {groupEntries.map(renderEntryRow)}
                  </Fragment>
                );
              });
            })() : sortedEntries.map(renderEntryRow)}

            {/* ── Ligne en cours d'ajout ─────────────────────────────── */}
            {pending && (
              <tr className="h-[72px] bg-[linear-gradient(90deg,rgba(201,162,39,0.05),rgba(28,32,53,0.22))]">
                {/* Checkbox vide */}
                <td className={`${tdClass} w-[36px]`} />
                {/* Image placeholder */}
                <td className={`${tdClass} w-[52px]`}>
                  <div className="w-[44px] h-[64px] rounded bg-surface-raised mx-auto border border-dashed border-gold/20" />
                </td>

                {/* Deck */}
                <td className={`${tdClass} w-[120px]`}>
                  <input
                    value={pending.deck}
                    onChange={(e) =>
                      setPending((p) => p && { ...p, deck: e.target.value })
                    }
                    className="w-full bg-transparent text-xs px-2 py-1 rounded
                               border border-border outline-none text-foreground
                               focus:border-gold/50 transition-colors placeholder:text-muted-foreground/30"
                    placeholder="Deck…"
                  />
                </td>

                {/* Carte — autocomplete ouvert automatiquement */}
                <td className={`${tdClass} w-[240px]`}>
                  <CardAutocomplete
                    value={null}
                    onChange={handlePendingCardSelect}
                    autoOpen
                  />
                </td>

                {/* Quantité */}
                <td className={`${tdClass} w-[52px] text-center`}>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={pending.quantity}
                    onChange={(e) =>
                      setPending((p) =>
                        p && { ...p, quantity: parseInt(e.target.value) || 1 }
                      )
                    }
                    className="w-10 bg-transparent text-center text-xs px-1 py-1 rounded
                               border border-border outline-none text-foreground
                               focus:border-gold/50 transition-colors mx-auto block"
                  />
                </td>

                {/* Édition / Rareté — désactivés */}
                <td className={`${tdClass} w-[175px]`}>
                  <span className="text-xs text-muted-foreground/30 px-2">—</span>
                </td>
                <td className={`${tdClass} w-[145px]`}>
                  <span className="text-xs text-muted-foreground/30 px-2">—</span>
                </td>

                {/* Annuler */}
                <td className={`${tdClass} w-[36px] text-center`}>
                  <button
                    onClick={() => setPending(null)}
                    className="text-muted-foreground/40 hover:text-foreground transition-colors p-1 rounded"
                    title="Annuler"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>

                {/* Cellules prix vides */}
                {sellers.map((s) => (
                  <td key={s.id} className={`${tdClass} w-[110px]`} />
                ))}
                {/* Best deal vide */}
                <td className={`${tdClass} w-[130px]`} />
                <td className={`${tdClass} w-[36px]`} />
              </tr>
            )}

            {/* ── Ligne vide si aucune entrée ───────────────────────── */}
            {entries.length === 0 && !pending && (
              <tr>
                <td
                  colSpan={8 + sellers.length + 2}
                  className="text-center py-16 text-sm text-muted-foreground/40"
                >
                  <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gold/20 bg-card/40 px-8 py-7">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-gold/65">Collection vide</span>
                    <span>
                      Cliquez sur <span className="text-gold font-medium">+ Ajouter une carte</span> pour commencer
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {entries.length > 0 && filteredEntries.length === 0 && !pending && (
              <tr>
                <td
                  colSpan={8 + sellers.length + 2}
                  className="text-center py-16 text-sm text-muted-foreground/40"
                >
                  <div className="inline-flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/40 px-8 py-7">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/55">Aucun résultat</span>
                    <span>Aucune carte ne correspond aux filtres actifs</span>
                  </div>
                </td>
              </tr>
            )}

            {/* ── Ligne de totaux ────────────────────────────────────── */}
            {filteredEntries.length > 0 && sellers.length > 0 && (() => {
              const stats = computeSellerStats(filteredEntries, sellers);
              const maxCovered = Math.max(
                0,
                ...Array.from(stats.values()).map((s) => s.covered)
              );
              const tfootTd = "px-2 py-2 align-middle border-t-2 border-gold/20 bg-surface";

              return (
                <tr>
                  {/* Colonnes fixes — label TOTAL */}
                  <td colSpan={8} className={`${tfootTd}`}>
                    <span className="px-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
                      Total
                    </span>
                  </td>

                  {/* Cellule par vendeur */}
                  {sellers.map((seller) => {
                    const s = stats.get(seller.id) ?? { total: 0, covered: 0 };
                    const isBestCoverage = s.covered === maxCovered && maxCovered > 0;

                    return (
                      <td key={seller.id} className={`${tfootTd} w-[110px] text-right`}>
                        {s.covered > 0 ? (
                          <div className="flex flex-col items-end gap-0.5 px-2">
                            <span
                              className={cn(
                                "text-xs tabular-nums font-medium",
                                isBestCoverage ? "text-gold" : "text-foreground/80"
                              )}
                            >
                              <span className={cn("text-[10px] mr-0.5", isBestCoverage ? "text-gold/60" : "text-muted-foreground")}>€</span>
                              {s.total.toFixed(2)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] tabular-nums",
                                isBestCoverage
                                  ? "text-gold/70 font-medium"
                                  : "text-muted-foreground/50"
                              )}
                            >
                              {s.covered}/{filteredEntries.length}
                              {isBestCoverage && (
                                <span className="ml-1">★</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/20 text-xs px-2">—</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Best deal — vide sur la ligne totaux */}
                  <td className={`${tfootTd} w-[130px]`} />
                  {/* Colonne "+" vide */}
                  <td className={`${tfootTd} w-[36px]`} />
                </tr>
              );
            })()}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      </Fragment>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex-none border-t border-gold/10 bg-[linear-gradient(180deg,rgba(19,20,24,0.96),rgba(13,14,18,0.98))] px-4 py-3 fade-in-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => {
            if (!pending) setPending({ deck: "", quantity: 1 });
          }}
          disabled={!!pending}
          className="flex min-h-10 items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-gold
                     transition-colors px-4 py-2 rounded-full border border-border/60 bg-card/70 hover:bg-surface-raised
                     disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Ajouter une carte
        </button>

        <div className="hidden flex-wrap items-center gap-2 text-[10px] text-muted-foreground/35 font-mono sm:flex">
          <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1">
            {entries.length} entr{entries.length !== 1 ? "ées" : "ée"}
          </span>
          <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1">
            {sellers.length} vendeur{sellers.length !== 1 ? "s" : ""}
          </span>
          <span className="rounded-full border border-gold/15 bg-gold/8 px-2.5 py-1 text-gold/70">
            vue {view === "table" ? "tableau" : view === "plan" ? "plan" : "dashboard"}
          </span>
        </div>
        </div>
      </footer>

      {/* ── Dialog vendeurs ─────────────────────────────────────────────── */}
      <SellerDialog
        open={sellerDialog}
        onClose={() => setSellerDialog(false)}
        sellers={sellers}
        onAdd={addSeller}
        onDelete={deleteSeller}
      />

      {/* ── Dialog import YDK ───────────────────────────────────────────── */}
      <ImportDialog
        open={importDialog}
        onClose={() => setImportDialog(false)}
        onImported={handleImported}
      />
    </div>
  );
}

"use client";

import { useMemo, useState, useCallback } from "react";
import { ExternalLink, ShoppingCart, CheckCheck, Check, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistEntry, Seller } from "./types";

const SMALL_BASKET_THRESHOLD = 5; // €
const OPTIMIZATION_EPSILON = 0.009;

const MANUAL_SHIPPING_OPTIONS = [
  { id: "lvs-20", label: "Lettre Verte Suivi 20g", price: 2.52, maxOrderValue: 153, maxWeight: 20 },
  { id: "r2-50", label: "Lettre Prioritaire Recommandé R2 50g", price: 8.57, maxOrderValue: 153, maxWeight: 50 },
  { id: "lvs-100", label: "Lettre Verte Suivi 100g", price: 4.1, maxOrderValue: 153, maxWeight: 100 },
  { id: "r2-100", label: "Lettre Prioritaire Recommandé R2 100g", price: 9.47, maxOrderValue: 153, maxWeight: 100 },
  { id: "lvs-250", label: "Lettre Verte Suivi 250g", price: 6.24, maxOrderValue: 153, maxWeight: 250 },
  { id: "r2-250", label: "Lettre Prioritaire Recommandé R2 250g", price: 11.23, maxOrderValue: 153, maxWeight: 250 },
  { id: "r2-500", label: "Lettre Prioritaire Recommandé R2 500g", price: 12.85, maxOrderValue: 153, maxWeight: 500 },
  { id: "colissimo-250", label: "Colissimo France 250g", price: 6.49, maxOrderValue: 100, maxWeight: 250 },
  { id: "colissimo-500", label: "Colissimo France 500g", price: 8.59, maxOrderValue: 100, maxWeight: 500 },
  { id: "colissimo-750", label: "Colissimo France 750g", price: 10.29, maxOrderValue: 100, maxWeight: 750 },
  { id: "colissimo-1000", label: "Colissimo France 1000g", price: 10.59, maxOrderValue: 100, maxWeight: 1000 },
  { id: "colissimo-2000", label: "Colissimo France 2000g", price: 12.19, maxOrderValue: 100, maxWeight: 2000 },
  { id: "colissimo-5000", label: "Colissimo France 5000g", price: 18.39, maxOrderValue: 100, maxWeight: 5000 },
  { id: "r3-50", label: "Lettre Prioritaire Recommandé R3 50g", price: 10.17, maxOrderValue: 458, maxWeight: 50 },
  { id: "r3-100", label: "Lettre Prioritaire Recommandé R3 100g", price: 10.54, maxOrderValue: 458, maxWeight: 100 },
  { id: "r3-250", label: "Lettre Prioritaire Recommandé R3 250g", price: 12.42, maxOrderValue: 458, maxWeight: 250 },
  { id: "r3-500", label: "Lettre Prioritaire Recommandé R3 500g", price: 13.9, maxOrderValue: 458, maxWeight: 500 },
  { id: "colissimo-r2-1000", label: "Colissimo Recommandé R2 1000g", price: 14.29, maxOrderValue: 200, maxWeight: 1000 },
  { id: "colissimo-r2-2000", label: "Colissimo Recommandé R2 2000g", price: 15.89, maxOrderValue: 200, maxWeight: 2000 },
  { id: "colissimo-r2-5000", label: "Colissimo Recommandé R2 5000g", price: 22.09, maxOrderValue: 200, maxWeight: 5000 },
  { id: "colissimo-r2-10000", label: "Colissimo Recommandé R2 10000g", price: 29.99, maxOrderValue: 200, maxWeight: 10000 },
  { id: "colissimo-r2-30000", label: "Colissimo Recommandé R2 30000g", price: 36.69, maxOrderValue: 200, maxWeight: 30000 },
] as const;

type PlanMode = "simple" | "optimized";

interface PurchasePlanProps {
  entries: WatchlistEntry[];
  sellers: Seller[];
  onMarkOrdered: (ids: number[]) => Promise<void>;
  isAdmin?: boolean;
}

interface AssignedItem {
  entry: WatchlistEntry;
  unitPrice: number;
}

interface ShippingSummary {
  shippingEstimate: number | null;
  shippingLabel: string | null;
  totalWithShipping: number | null;
  requiresManualShipping: boolean;
}

interface SellerPlan {
  seller: Seller;
  items: AssignedItem[];
  subtotal: number;
  shippingEstimate: number | null;
  shippingLabel: string | null;
  totalWithShipping: number | null;
  requiresManualShipping: boolean;
  cardCount: number;
  estimatedWeight: number | null;
  isSmall: boolean;
  movedInCount: number;
  movedOutCount: number;
  hasManualShippingOverride?: boolean;
}

interface OptimizationSuggestion {
  entryId: number;
  cardName: string;
  fromSeller: string;
  toSeller: string;
  priceDelta: number;
}

interface PlanResult {
  toOrder: WatchlistEntry[];
  sellerPlans: SellerPlan[];
  unassigned: WatchlistEntry[];
  subtotalEstimated: number;
  shippingEstimated: number;
  totalEstimated: number;
  coveredCount: number;
  manualShippingCount: number;
  suggestions: OptimizationSuggestion[];
}

function getEligibleOffers(entry: WatchlistEntry, sellers: Seller[]) {
  return sellers
    .map((seller) => {
      const priceData = entry.prices.find((price) => price.sellerId === seller.id);
      return priceData?.price != null ? { seller, unitPrice: priceData.price } : null;
    })
    .filter((offer): offer is { seller: Seller; unitPrice: number } => offer !== null)
    .sort((a, b) => a.unitPrice - b.unitPrice || a.seller.createdAt.localeCompare(b.seller.createdAt));
}

function estimateWeightFromCardCount(cardCount: number) {
  if (cardCount <= 0) return null;
  if (cardCount <= 4) return 20;
  if (cardCount <= 17) return 50;
  if (cardCount <= 40) return 100;
  if (cardCount <= 108) return 250;
  return null;
}

function computeShippingSummary(seller: Seller, subtotal: number, cardCount: number): ShippingSummary {
  if (seller.shippingProfile !== "cardmarket-fr-standard") {
    return {
      shippingEstimate: null,
      shippingLabel: null,
      totalWithShipping: null,
      requiresManualShipping: subtotal > 0,
    };
  }

  const estimatedWeight = estimateWeightFromCardCount(cardCount);
  if (estimatedWeight === null) {
    return {
      shippingEstimate: null,
      shippingLabel: null,
      totalWithShipping: null,
      requiresManualShipping: subtotal > 0,
    };
  }

  const compatibleOptions = MANUAL_SHIPPING_OPTIONS
    .filter((option) => subtotal <= option.maxOrderValue && estimatedWeight <= option.maxWeight)
    .sort((a, b) => a.price - b.price || a.maxWeight - b.maxWeight);

  const bestOption = compatibleOptions[0];
  if (!bestOption) {
    return {
      shippingEstimate: null,
      shippingLabel: null,
      totalWithShipping: null,
      requiresManualShipping: subtotal > 0,
    };
  }

  return {
    shippingEstimate: bestOption.price,
    shippingLabel: bestOption.label,
    totalWithShipping: subtotal + bestOption.price,
    requiresManualShipping: false,
  };
}

function computeSimpleAssignments(toOrder: WatchlistEntry[], sellers: Seller[]) {
  const assignments = new Map<number, number>();

  for (const entry of toOrder) {
    const offers = getEligibleOffers(entry, sellers);
    if (offers.length > 0) {
      assignments.set(entry.id, offers[0].seller.id);
    }
  }

  return assignments;
}

function buildPlanFromAssignments(
  toOrder: WatchlistEntry[],
  sellers: Seller[],
  assignments: Map<number, number>
) {
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
  const simpleAssignments = computeSimpleAssignments(toOrder, sellers);
  const planMap = new Map<number, { seller: Seller; items: AssignedItem[]; subtotal: number; cardCount: number }>();

  for (const seller of sellers) {
    planMap.set(seller.id, {
      seller,
      items: [],
      subtotal: 0,
      cardCount: 0,
    });
  }

  const unassigned: WatchlistEntry[] = [];

  for (const entry of toOrder) {
    const assignedSellerId = assignments.get(entry.id);
    if (assignedSellerId == null) {
      unassigned.push(entry);
      continue;
    }

    const seller = sellerById.get(assignedSellerId);
    const priceData = entry.prices.find((price) => price.sellerId === assignedSellerId);
    if (!seller || priceData?.price == null) {
      unassigned.push(entry);
      continue;
    }

    const plan = planMap.get(assignedSellerId)!;
    plan.items.push({ entry, unitPrice: priceData.price });
    plan.subtotal += priceData.price * entry.quantity;
    plan.cardCount += entry.quantity;
  }

  const sellerPlans: SellerPlan[] = Array.from(planMap.values())
    .filter((plan) => plan.items.length > 0)
    .map((plan) => {
      const shipping = computeShippingSummary(plan.seller, plan.subtotal, plan.cardCount);
      let movedInCount = 0;
      let movedOutCount = 0;

      for (const item of plan.items) {
        const simpleSellerId = simpleAssignments.get(item.entry.id);
        if (simpleSellerId !== plan.seller.id) {
          movedInCount += 1;
        }
      }

      for (const [entryId, simpleSellerId] of simpleAssignments) {
        if (simpleSellerId !== plan.seller.id) continue;
        const finalSellerId = assignments.get(entryId);
        if (finalSellerId != null && finalSellerId !== plan.seller.id) {
          movedOutCount += 1;
        }
      }

      return {
        seller: plan.seller,
        items: plan.items.sort((a, b) => a.entry.card.name.localeCompare(b.entry.card.name, "fr")),
        subtotal: plan.subtotal,
        shippingEstimate: shipping.shippingEstimate,
        shippingLabel: shipping.shippingLabel,
        totalWithShipping: shipping.totalWithShipping,
        requiresManualShipping: shipping.requiresManualShipping,
        cardCount: plan.cardCount,
        estimatedWeight: estimateWeightFromCardCount(plan.cardCount),
        isSmall: plan.subtotal < SMALL_BASKET_THRESHOLD,
        movedInCount,
        movedOutCount,
      };
    })
    .sort((a, b) => b.subtotal - a.subtotal);

  return { sellerPlans, unassigned };
}

function summarizePlan(
  toOrder: WatchlistEntry[],
  sellers: Seller[],
  assignments: Map<number, number>
): Omit<PlanResult, "suggestions"> {
  const { sellerPlans, unassigned } = buildPlanFromAssignments(toOrder, sellers, assignments);
  const subtotalEstimated = sellerPlans.reduce((sum, plan) => sum + plan.subtotal, 0);
  const shippingEstimated = sellerPlans.reduce((sum, plan) => sum + (plan.shippingEstimate ?? 0), 0);
  const totalEstimated = sellerPlans.reduce((sum, plan) => sum + (plan.totalWithShipping ?? plan.subtotal), 0);
  const coveredCount = toOrder.length - unassigned.length;
  const manualShippingCount = sellerPlans.filter((plan) => plan.requiresManualShipping).length;

  return {
    toOrder,
    sellerPlans,
    unassigned,
    subtotalEstimated,
    shippingEstimated,
    totalEstimated,
    coveredCount,
    manualShippingCount,
  };
}

function computeSimplePlan(entries: WatchlistEntry[], sellers: Seller[]): PlanResult {
  const toOrder = entries.filter((entry) => entry.card && entry.status === "À commander");
  const assignments = computeSimpleAssignments(toOrder, sellers);

  return {
    ...summarizePlan(toOrder, sellers, assignments),
    suggestions: [],
  };
}

function optimizeAssignments(toOrder: WatchlistEntry[], sellers: Seller[]) {
  let assignments = computeSimpleAssignments(toOrder, sellers);
  let currentPlan = summarizePlan(toOrder, sellers, assignments);
  const changedEntries = new Map<number, OptimizationSuggestion>();
  let improved = true;

  while (improved) {
    improved = false;

    const candidatePlans = [...currentPlan.sellerPlans]
      .filter((plan) => plan.isSmall || plan.items.length === 1)
      .sort((a, b) => a.subtotal - b.subtotal);

    for (const sellerPlan of candidatePlans) {
      for (const { entry } of sellerPlan.items) {
        const currentSellerId = assignments.get(entry.id);
        if (currentSellerId == null) continue;

        const currentOffer = entry.prices.find((price) => price.sellerId === currentSellerId);
        if (currentOffer?.price == null) continue;

        const offers = getEligibleOffers(entry, sellers).filter((offer) => offer.seller.id !== currentSellerId);

        for (const offer of offers) {
          const nextAssignments = new Map(assignments);
          nextAssignments.set(entry.id, offer.seller.id);

          const nextPlan = summarizePlan(toOrder, sellers, nextAssignments);
          const savings = currentPlan.totalEstimated - nextPlan.totalEstimated;

          if (savings > OPTIMIZATION_EPSILON) {
            const fromSeller = sellers.find((seller) => seller.id === currentSellerId)?.name ?? "—";
            assignments = nextAssignments;
            currentPlan = nextPlan;
            changedEntries.set(entry.id, {
              entryId: entry.id,
              cardName: entry.card.name,
              fromSeller,
              toSeller: offer.seller.name,
              priceDelta: offer.unitPrice - currentOffer.price,
            });
            improved = true;
            break;
          }
        }

        if (improved) break;
      }

      if (improved) break;
    }
  }

  return {
    assignments,
    suggestions: Array.from(changedEntries.values()),
  };
}

function computeOptimizedPlan(entries: WatchlistEntry[], sellers: Seller[]): PlanResult {
  const toOrder = entries.filter((entry) => entry.card && entry.status === "À commander");
  const { assignments, suggestions } = optimizeAssignments(toOrder, sellers);

  return {
    ...summarizePlan(toOrder, sellers, assignments),
    suggestions,
  };
}

function formatEuro(amount: number) {
  return `€${amount.toFixed(2)}`;
}

function getShippingDisplayMeta(plan: SellerPlan) {
  if (plan.requiresManualShipping) {
    return {
      badgeClass: "border-amber-700/25 bg-amber-950/20 text-amber-300/80",
      statusLabel: "Choix requis",
    };
  }

  if (plan.hasManualShippingOverride) {
    return {
      badgeClass: "border-blue-700/25 bg-blue-950/20 text-blue-300/80",
      statusLabel: "Ajusté",
    };
  }

  return {
    badgeClass: "border-emerald-700/25 bg-emerald-950/20 text-emerald-300/80",
    statusLabel: "Auto",
  };
}

function getShippingOptionById(optionId: string | undefined) {
  if (!optionId) return null;
  return MANUAL_SHIPPING_OPTIONS.find((option) => option.id === optionId) ?? null;
}

function getShippingOptionsForDisplay(subtotal: number, cardCount: number) {
  const estimatedWeight = estimateWeightFromCardCount(cardCount);
  const compatible = MANUAL_SHIPPING_OPTIONS.filter((option) => {
    if (subtotal > option.maxOrderValue) return false;
    if (estimatedWeight !== null && estimatedWeight > option.maxWeight) return false;
    return true;
  });
  if (compatible.length > 0) {
    return compatible.map((option) => ({ ...option, isCompatible: true }));
  }

  return MANUAL_SHIPPING_OPTIONS.map((option) => ({
    ...option,
    isCompatible: false,
  }));
}

export function PurchasePlan({ entries, sellers, onMarkOrdered, isAdmin = false }: PurchasePlanProps) {
  const [mode, setMode] = useState<PlanMode>("simple");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedShippingOptions, setSelectedShippingOptions] = useState<Record<number, string>>({});

  const simplePlan = useMemo(() => computeSimplePlan(entries, sellers), [entries, sellers]);
  const optimizedPlan = useMemo(() => computeOptimizedPlan(entries, sellers), [entries, sellers]);
  const activePlan = mode === "optimized" ? optimizedPlan : simplePlan;
  const displayPlan = useMemo(() => {
    const sellerPlans = activePlan.sellerPlans.map((plan) => {
      const selectedOption = getShippingOptionById(selectedShippingOptions[plan.seller.id]);
      if (!selectedOption) return plan;

      return {
        ...plan,
        shippingEstimate: selectedOption.price,
        shippingLabel: selectedOption.label,
        totalWithShipping: plan.subtotal + selectedOption.price,
        requiresManualShipping: false,
        hasManualShippingOverride: true,
      };
    });

    return {
      ...activePlan,
      sellerPlans,
      shippingEstimated: sellerPlans.reduce((sum, plan) => sum + (plan.shippingEstimate ?? 0), 0),
      totalEstimated: sellerPlans.reduce((sum, plan) => sum + (plan.totalWithShipping ?? plan.subtotal), 0),
      manualShippingCount: sellerPlans.filter((plan) => plan.requiresManualShipping).length,
    };
  }, [activePlan, selectedShippingOptions]);

  const {
    toOrder,
    sellerPlans,
    unassigned,
    subtotalEstimated,
    shippingEstimated,
    totalEstimated,
    coveredCount,
    manualShippingCount,
    suggestions,
  } = displayPlan;

  const optimizationSavings = simplePlan.totalEstimated - optimizedPlan.totalEstimated;
  const optimizedSellerDelta = simplePlan.sellerPlans.length - optimizedPlan.sellerPlans.length;

  const exportCSV = useCallback(() => {
    const esc = (value: string) =>
      value.includes(",") || value.includes('"') || value.includes("\n")
        ? `"${value.replace(/"/g, '""')}"`
        : value;

    const detailHeaders = [
      "Mode",
      "Vendeur",
      "Carte",
      "Édition",
      "Rareté",
      "Qté",
      "Prix unitaire",
      "Sous-total ligne",
      "Mode d'envoi",
      "Port vendeur",
      "Total vendeur",
    ];
    const rows: string[][] = [];

    for (const { seller, items } of sellerPlans) {
      for (const { entry, unitPrice } of items) {
        rows.push([
          mode === "optimized" ? "Optimisé" : "Simple",
          seller.name,
          entry.card.name,
          entry.setName ?? "",
          entry.rarity ?? "",
          String(entry.quantity),
          unitPrice.toFixed(2),
          (unitPrice * entry.quantity).toFixed(2),
          "",
          "",
          "",
        ]);
      }
    }

    for (const entry of unassigned) {
      rows.push([
        mode === "optimized" ? "Optimisé" : "Simple",
        "— Non attribué",
        entry.card.name,
        entry.setName ?? "",
        entry.rarity ?? "",
        String(entry.quantity),
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    const sellerSummaryHeaders = [
      "Mode",
      "Vendeur",
      "Nb cartes",
      "Sous-total cartes",
      "Mode d'envoi",
      "Port vendeur",
      "Total vendeur",
      "Statut port",
    ];
    const sellerSummaryRows = sellerPlans.map((plan) => [
      mode === "optimized" ? "Optimisé" : "Simple",
      plan.seller.name,
      String(plan.cardCount),
      plan.subtotal.toFixed(2),
      plan.shippingLabel ?? "",
      plan.shippingEstimate != null ? plan.shippingEstimate.toFixed(2) : "",
      plan.totalWithShipping != null ? plan.totalWithShipping.toFixed(2) : "",
      plan.requiresManualShipping ? "À vérifier manuellement" : "OK",
    ]);

    const globalSummaryHeaders = ["Mode", "Sous-total cartes", "Port total", "Total estimé", "Couverture", "Paniers à vérifier"];
    const globalSummaryRows = [[
      mode === "optimized" ? "Optimisé" : "Simple",
      subtotalEstimated.toFixed(2),
      shippingEstimated.toFixed(2),
      totalEstimated.toFixed(2),
      `${coveredCount}/${toOrder.length}`,
      String(manualShippingCount),
    ]];

    const csvSections = [
      ["Détail du plan"],
      detailHeaders,
      ...rows,
      [],
      ["Récap vendeur"],
      sellerSummaryHeaders,
      ...sellerSummaryRows,
      [],
      ["Résumé global"],
      globalSummaryHeaders,
      ...globalSummaryRows,
    ];

    const csv = csvSections.map((row) => row.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ygo-plan-achat-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    mode,
    sellerPlans,
    unassigned,
    subtotalEstimated,
    shippingEstimated,
    totalEstimated,
    coveredCount,
    toOrder.length,
    manualShippingCount,
  ]);

  async function handleMarkAll() {
    const ids = sellerPlans.flatMap((plan) => plan.items.map((item) => item.entry.id));
    if (ids.length === 0) return;
    setLoadingId("all");
    try {
      await onMarkOrdered(ids);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleMarkSeller(sellerId: number, items: Array<{ entry: WatchlistEntry }>) {
    const ids = items.map((item) => item.entry.id);
    setLoadingId(String(sellerId));
    try {
      await onMarkOrdered(ids);
    } finally {
      setLoadingId(null);
    }
  }

  if (toOrder.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground/40">
        <ShoppingCart className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucune carte avec le statut "À commander"</p>
        <p className="text-xs opacity-60">Définissez le statut "À commander" sur vos lignes de watchlist</p>
      </div>
    );
  }

  const assignedCount = sellerPlans.flatMap((plan) => plan.items).length;

  return (
    <div className="flex-1 overflow-auto px-3 py-3 sm:px-6 sm:py-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-5">
        <div className="rounded-[20px] border border-gold/10 bg-[linear-gradient(180deg,rgba(19,20,24,0.9),rgba(13,14,18,0.96))] px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="w-3.5 h-3.5 text-gold/60 flex-shrink-0" />
                <span>
                  <span className="text-foreground font-medium tabular-nums">{toOrder.length}</span>{" "}
                  carte{toOrder.length !== 1 ? "s" : ""} à commander
                  {sellerPlans.length > 0 && (
                    <>
                      {" "}·{" "}
                      <span className="text-foreground font-medium tabular-nums">{sellerPlans.length}</span>{" "}
                      vendeur{sellerPlans.length !== 1 ? "s" : ""}
                    </>
                  )}
                </span>
              </div>

              {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-full border border-border/60 bg-card/60 p-1">
                  <button
                    type="button"
                    onClick={() => setMode("simple")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs transition-colors",
                      mode === "simple" ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("optimized")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs transition-colors",
                      mode === "optimized"
                        ? "bg-emerald-900/35 text-emerald-300"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Optimisé
                  </button>
                </div>

                {optimizationSavings > OPTIMIZATION_EPSILON ? (
                  <span className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-700/25 bg-emerald-950/25 text-emerald-300/85">
                    Gain optimisé : {formatEuro(optimizationSavings)}
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-card/60 text-muted-foreground/65">
                    Aucun gain détecté vs simple
                  </span>
                )}

                {optimizedSellerDelta > 0 && (
                  <span className="text-[11px] px-2.5 py-1 rounded-full border border-amber-700/25 bg-amber-950/25 text-amber-300/80">
                    {optimizedSellerDelta} vendeur{optimizedSellerDelta > 1 ? "s" : ""} évité{optimizedSellerDelta > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-row sm:items-center sm:flex-shrink-0">
              <button
                onClick={exportCSV}
                className="flex w-full items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-full sm:w-auto
                           text-muted-foreground border border-border/60 bg-card/70
                           hover:text-foreground hover:bg-surface-raised transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Plan CSV
              </button>
              {assignedCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  disabled={loadingId !== null}
                  className="flex w-full items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-full sm:w-auto
                             bg-amber-900/30 text-amber-300 border border-amber-700/40
                             hover:bg-amber-900/50 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {loadingId === "all" ? "En cours…" : "Tout marquer commandé"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/45">Sous-total cartes</span>
              <div className="mt-1 font-semibold tabular-nums text-foreground">{formatEuro(subtotalEstimated)}</div>
            </div>
            {isAdmin && (
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/45">Port estimé</span>
              <div className="mt-1 font-semibold tabular-nums text-foreground">{formatEuro(shippingEstimated)}</div>
            </div>
            )}
            {isAdmin && (
            <div className="rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/45">Stratégie</span>
              <div className="mt-1 font-semibold text-foreground">{mode === "optimized" ? "Optimisé" : "Simple"}</div>
              <div className="mt-1 text-[10px] text-muted-foreground/45">
                {manualShippingCount === 0 ? "Tous les ports sont résolus" : `${manualShippingCount} panier${manualShippingCount > 1 ? "s" : ""} à confirmer`}
              </div>
            </div>
            )}
            <div className="rounded-xl border border-gold/15 bg-gold/8 px-3 py-2">
              <span className="text-[10px] uppercase tracking-[0.14em] text-gold/60">Total estimé</span>
              <div className="mt-1 font-semibold tabular-nums text-gold">{formatEuro(totalEstimated)}</div>
            </div>
          </div>

          {mode === "optimized" && suggestions.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-700/20 bg-emerald-950/15 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/70">Ajustements appliqués</span>
                <span className="text-[11px] text-muted-foreground/55">
                  {suggestions.length} carte{suggestions.length > 1 ? "s" : ""} déplacée{suggestions.length > 1 ? "s" : ""} pour réduire le coût global.
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1.5">
                {suggestions.slice(0, 4).map((suggestion) => (
                  <p key={suggestion.entryId} className="text-[11px] text-muted-foreground/75">
                    <span className="text-foreground/90">{suggestion.cardName}</span>{" "}
                    basculée de <span className="text-amber-300/80">{suggestion.fromSeller}</span> vers{" "}
                    <span className="text-emerald-300/80">{suggestion.toSeller}</span>
                    {Math.abs(suggestion.priceDelta) > OPTIMIZATION_EPSILON && (
                      <>
                        {" "}({suggestion.priceDelta > 0 ? "+" : ""}{formatEuro(suggestion.priceDelta).replace("€", "")} sur la carte)
                      </>
                    )}
                  </p>
                ))}
                {suggestions.length > 4 && (
                  <p className="text-[11px] text-muted-foreground/45">
                    + {suggestions.length - 4} autre{suggestions.length - 4 > 1 ? "s" : ""} déplacement{suggestions.length - 4 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {manualShippingCount > 0 && (
            <p className="mt-3 text-[11px] text-amber-300/75">
              {manualShippingCount} panier{manualShippingCount > 1 ? "s" : ""} dépasse{manualShippingCount === 1 ? "" : "nt"} le barème V1 et nécessite{manualShippingCount === 1 ? "" : "nt"} une vérification manuelle du port.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/45">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/55" />
            Répartition vendeurs
          </div>
          <span className="hidden text-[10px] text-muted-foreground/35 sm:inline">
            lecture optimisée pour la décision d'achat
          </span>
        </div>

        {sellerPlans.map(
          ({
            seller,
            items,
            subtotal,
            shippingEstimate,
            shippingLabel,
            totalWithShipping,
            requiresManualShipping,
            cardCount,
            estimatedWeight,
            isSmall,
            movedInCount,
            movedOutCount,
            hasManualShippingOverride,
          }) => {
            const shippingMeta = getShippingDisplayMeta({
              seller,
              items,
              subtotal,
              shippingEstimate,
              shippingLabel,
              totalWithShipping,
              requiresManualShipping,
              cardCount,
              estimatedWeight,
              isSmall,
              movedInCount,
              movedOutCount,
              hasManualShippingOverride,
            });

            return (
              <div
                key={seller.id}
                className={cn(
                  "bg-surface rounded-[18px] border overflow-hidden",
                  isSmall ? "border-amber-700/25" : "border-border/60"
                )}
              >
              <div className="flex flex-col gap-3 px-3 py-3 border-b border-border/40 bg-surface-raised/30 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {seller.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/45 tabular-nums">
                    {cardCount} carte{cardCount > 1 ? "s" : ""}
                  </span>
                  {estimatedWeight !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-card/50 text-muted-foreground/65 tabular-nums">
                      {estimatedWeight}g estimés
                    </span>
                  )}
                  {isSmall && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded border
                                 bg-amber-900/30 text-amber-400/80 border-amber-700/30"
                      title={`Sous-total inférieur à €${SMALL_BASKET_THRESHOLD} — envisager de regrouper`}
                    >
                      Petit panier
                    </span>
                  )}
                  {mode === "optimized" && movedInCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-700/25 bg-emerald-950/20 text-emerald-300/80">
                      +{movedInCount} regroupée{movedInCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {mode === "optimized" && movedOutCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 bg-card/50 text-muted-foreground/65">
                      -{movedOutCount} déplacée{movedOutCount > 1 ? "s" : ""}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded border",
                      shippingMeta.badgeClass
                    )}
                  >
                    {shippingMeta.statusLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                  <button
                    onClick={() => handleMarkSeller(seller.id, items)}
                    disabled={loadingId !== null}
                    className="flex items-center justify-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full
                               text-amber-400/70 border border-amber-700/25
                               hover:bg-amber-900/20 hover:text-amber-300 transition-colors
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" />
                    {loadingId === String(seller.id) ? "En cours…" : "Commandé"}
                  </button>
                  <a
                    href={`https://www.cardmarket.com/fr/YuGiOh/Users/${encodeURIComponent(seller.name)}/Offers/Singles`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-gold transition-colors"
                  >
                    CardMarket
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="divide-y divide-border/25">
                {items.map(({ entry, unitPrice }) => (
                  <div key={entry.id} className="flex items-start gap-3 px-3 py-3 sm:px-4 sm:items-center">
                    <span className="text-xs text-muted-foreground/50 tabular-nums w-6 text-right flex-shrink-0">
                      ×{entry.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">
                        {entry.card.name}
                      </span>
                      {(entry.setName || entry.rarity) && (
                        <span className="text-[10px] text-muted-foreground/45 truncate block">
                          {[entry.setName, entry.rarity].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-auto">
                      <span className="text-xs tabular-nums text-foreground/80">
                        <span className="text-[10px] text-muted-foreground/40 mr-0.5">€</span>
                        {unitPrice.toFixed(2)}
                      </span>
                      {entry.quantity > 1 && (
                        <span className="block text-[10px] text-muted-foreground/40 tabular-nums">
                          = €{(unitPrice * entry.quantity).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 px-3 py-3 border-t border-border/40 bg-surface-raised/20 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-muted-foreground/50 uppercase tracking-wider">
                    Sous-total · {items.reduce((sum, item) => sum + item.entry.quantity, 0)} unité{items.reduce((sum, item) => sum + item.entry.quantity, 0) !== 1 ? "s" : ""}
                  </span>
                  {isAdmin && !requiresManualShipping && shippingLabel && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/60 bg-card/60 text-foreground/75">
                        {shippingLabel}
                      </span>
                      {shippingEstimate !== null && (
                        <span className="text-[10px] text-muted-foreground/45">
                          Port retenu : <span className="tabular-nums text-foreground/75">{formatEuro(shippingEstimate)}</span>
                        </span>
                      )}
                    </div>
                  )}
                  {isAdmin && requiresManualShipping ? (
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const shippingOptions = getShippingOptionsForDisplay(subtotal, cardCount);
                        const hasCompatibleOption = shippingOptions.some((option) => option.isCompatible);

                        return (
                          <>
                      <span className="text-[10px] text-amber-300/70">
                        Port à vérifier manuellement
                      </span>
                      <label className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                        <span className="text-[10px] text-muted-foreground/45">Choisir l'envoi</span>
                        <select
                          value={selectedShippingOptions[seller.id] ?? ""}
                          onChange={(event) =>
                            setSelectedShippingOptions((current) => ({
                              ...current,
                              [seller.id]: event.target.value,
                            }))
                          }
                          className="w-full min-w-0 rounded-full border border-amber-700/25 bg-card/70 py-1 pl-3 pr-8 text-[11px] text-foreground outline-none transition-colors focus:border-gold/40 sm:min-w-56"
                        >
                          <option value="">Choisir une ligne du barème…</option>
                          {shippingOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label} — {formatEuro(option.price)}
                              {!option.isCompatible ? " (hors plafond du tableau)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!hasCompatibleOption && (
                        <span className="text-[10px] text-muted-foreground/45">
                          Aucune ligne n'est officiellement compatible avec ce montant selon les plafonds du tableau, mais tu peux quand meme en choisir une comme référence.
                        </span>
                      )}
                          </>
                        );
                      })()}
                    </div>
                  ) : isAdmin && shippingEstimate !== null ? (
                    <span className="text-[10px] text-muted-foreground/45">
                      Calcul {hasManualShippingOverride ? "ajusté manuellement" : "automatique"} appliqué.
                    </span>
                  ) : null}
                </div>
                <div className="text-left sm:text-right">
                  <span
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      isSmall ? "text-amber-400/80" : "text-foreground"
                    )}
                  >
                    <span className="text-[11px] font-normal text-muted-foreground/50 mr-0.5">€</span>
                    {subtotal.toFixed(2)}
                  </span>
                  {isAdmin && totalWithShipping !== null && (
                    <span className="block text-[10px] tabular-nums text-gold/70">
                      Total avec port : {formatEuro(totalWithShipping)}
                    </span>
                  )}
                  {isAdmin && hasManualShippingOverride && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedShippingOptions((current) => {
                          const next = { ...current };
                          delete next[seller.id];
                          return next;
                        })
                      }
                      className="mt-1 text-[10px] text-muted-foreground/45 hover:text-foreground transition-colors"
                    >
                      Revenir au calcul auto
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          }
        )}

        {unassigned.length > 0 && (
          <div className="bg-surface rounded-[18px] border border-amber-700/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-700/20 bg-amber-950/20">
              <span className="text-sm font-medium text-amber-400/80">Non attribuées</span>
              <span className="text-[10px] text-muted-foreground/40">
                — {unassigned.length} carte{unassigned.length !== 1 ? "s" : ""} sans prix saisi
              </span>
            </div>
            <div className="divide-y divide-border/25">
              {unassigned.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-muted-foreground/40 tabular-nums w-6 text-right flex-shrink-0">
                    ×{entry.quantity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground/60 truncate block">
                      {entry.card.name}
                    </span>
                    {(entry.setName || entry.rarity) && (
                      <span className="text-[10px] text-muted-foreground/35 truncate block">
                        {[entry.setName, entry.rarity].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground/25 flex-shrink-0">—</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 px-4 py-4 bg-surface rounded-[18px] border border-gold/20 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              Total estimé
            </span>
            <span className="text-[11px] text-muted-foreground/40 tabular-nums">
              Couverture : {coveredCount}/{toOrder.length} carte{toOrder.length !== 1 ? "s" : ""}
              {unassigned.length > 0 && (
                <span className="text-amber-400/60 ml-1">
                  ({unassigned.length} sans prix)
                </span>
              )}
            </span>
            <span className="text-[11px] text-muted-foreground/40 tabular-nums">
              {isAdmin
                ? `Cartes : ${formatEuro(subtotalEstimated)} · Port : ${formatEuro(shippingEstimated)}`
                : `Cartes : ${formatEuro(subtotalEstimated)}`}
            </span>
            {isAdmin && mode === "optimized" && optimizationSavings > OPTIMIZATION_EPSILON && (
              <span className="text-[11px] text-emerald-300/70 tabular-nums">
                Soit {formatEuro(optimizationSavings)} de moins que le mode simple
              </span>
            )}
          </div>
          <div className="text-left sm:text-right">
            <span className="text-2xl font-semibold tabular-nums text-gold">
              <span className="text-sm font-normal text-gold/50 mr-1">€</span>
              {totalEstimated.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

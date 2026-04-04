import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TrackerClient } from "@/components/tracker/TrackerClient";
import type { WatchlistEntry } from "@/components/tracker/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ format: string }> };

export default async function TrackerPage({ params }: Props) {
  const { format: rawFormat } = await params;

  // Valider le format dans l'URL (tcg ou ocg)
  if (rawFormat !== "tcg" && rawFormat !== "ocg") notFound();
  const format = rawFormat === "tcg" ? "TCG" : "OCG";

  const session = await auth();
  if (!session) redirect("/login");

  const [entries, sellers] = await Promise.all([
    prisma.watchlistEntry.findMany({
      where: { userId: session.user.id, format },
      orderBy: { sortOrder: "asc" },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            type: true,
            frameType: true,
            imageUrl: true,
            hasLocalImage: true,
          },
        },
      },
    }),
    prisma.seller.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // Charger les prix globaux pour les cartes de la watchlist
  const cardIds = [...new Set(entries.map((e) => e.cardId))];
  const prices = cardIds.length > 0
    ? await prisma.price.findMany({
        where: { cardId: { in: cardIds } },
        select: {
          cardId: true,
          sellerId: true,
          price: true,
          previousPrice: true,
          previousUpdatedAt: true,
          updatedAt: true,
        },
      })
    : [];

  const pricesByCardId = new Map<number, typeof prices>();
  for (const p of prices) {
    const arr = pricesByCardId.get(p.cardId) ?? [];
    arr.push(p);
    pricesByCardId.set(p.cardId, arr);
  }

  // Sérialisation explicite pour Next.js (évite les objets Prisma bruts)
  const serialized = entries.map((e) => ({
    id: e.id,
    format: e.format as "TCG" | "OCG",
    deck: e.deck,
    status: (e as Record<string, unknown>).status as string ?? "",
    notes: (e as Record<string, unknown>).notes as string ?? "",
    cardId: e.cardId,
    quantity: e.quantity,
    setName: e.setName,
    rarity: e.rarity,
    sortOrder: e.sortOrder,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    card: {
      id: e.card.id,
      name: e.card.name,
      type: e.card.type,
      frameType: e.card.frameType,
      imageUrl: e.card.imageUrl,
      hasLocalImage: e.card.hasLocalImage,
    },
    prices: (pricesByCardId.get(e.cardId) ?? []).map((p) => ({
      sellerId: p.sellerId,
      price: p.price,
      previousPrice: p.previousPrice,
      previousUpdatedAt: p.previousUpdatedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  }));

  const serializedSellers = sellers.map((s) => ({
    id: s.id,
    name: s.name,
    platform: s.platform,
    shippingProfile: s.shippingProfile,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <TrackerClient
      format={format}
      initialEntries={serialized as WatchlistEntry[]}
      initialSellers={serializedSellers}
      isAdmin={session.user.role === "ADMIN"}
    />
  );
}

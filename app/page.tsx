import { prisma } from "@/lib/prisma";
import { TrackerClient } from "@/components/tracker/TrackerClient";
import type { WatchlistEntry } from "@/components/tracker/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [entries, sellers] = await Promise.all([
    prisma.watchlistEntry.findMany({
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
        prices: {
          select: { sellerId: true, price: true, previousPrice: true, previousUpdatedAt: true, updatedAt: true },
        },
      },
    }),
    prisma.seller.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  // Conversion DateTime → string pour la sérialisation Next.js
  const serialized = entries.map((e) => ({
    id: e.id,
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
    prices: e.prices.map((p) => ({
      sellerId: p.sellerId,
      price: p.price,
      previousPrice: p.previousPrice,
      previousUpdatedAt: p.previousUpdatedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
    })),
  }));

  const serializedSellers = sellers.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <TrackerClient
      initialEntries={serialized as WatchlistEntry[]}
      initialSellers={serializedSellers}
    />
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const CreateEntrySchema = z.object({
  deck: z.string().max(100).default(""),
  cardId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99).default(1),
  setName: z.string().max(200).nullable().optional(),
  rarity: z.string().max(100).nullable().optional(),
});

// GET /api/watchlist — entrées de l'utilisateur connecté + prix globaux
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [entries, sellers] = await Promise.all([
    prisma.watchlistEntry.findMany({
      where: { userId: session.user.id },
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

  // Charger les prix globaux pour toutes les cartes de la watchlist
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

  // Indexer les prix par cardId
  const pricesByCardId = new Map<number, typeof prices>();
  for (const p of prices) {
    const arr = pricesByCardId.get(p.cardId) ?? [];
    arr.push(p);
    pricesByCardId.set(p.cardId, arr);
  }

  const entriesWithPrices = entries.map((e) => ({
    ...e,
    prices: pricesByCardId.get(e.cardId) ?? [],
  }));

  return NextResponse.json({ entries: entriesWithPrices, sellers });
}

// POST /api/watchlist — ajouter une ligne à la watchlist de l'utilisateur
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deck, cardId, quantity, setName, rarity } = parsed.data;

  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const maxOrder = await prisma.watchlistEntry.aggregate({
    where: { userId: session.user.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const entry = await prisma.watchlistEntry.create({
    data: {
      userId: session.user.id,
      deck,
      cardId,
      quantity,
      setName: setName ?? null,
      rarity: rarity ?? null,
      sortOrder,
    },
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
  });

  // Attacher les prix globaux existants pour cette carte
  const prices = await prisma.price.findMany({
    where: { cardId },
    select: {
      cardId: true,
      sellerId: true,
      price: true,
      previousPrice: true,
      previousUpdatedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ...entry, prices }, { status: 201 });
}

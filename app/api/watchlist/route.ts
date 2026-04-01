import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateEntrySchema = z.object({
  deck: z.string().max(100).default(""),
  cardId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99).default(1),
  setName: z.string().max(200).nullable().optional(),
  rarity: z.string().max(100).nullable().optional(),
});

// GET /api/watchlist — toutes les entrées avec carte + prix par vendeur
export async function GET() {
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
          select: { sellerId: true, price: true, updatedAt: true },
        },
      },
    }),
    prisma.seller.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({ entries, sellers });
}

// POST /api/watchlist — ajouter une ligne
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { deck, cardId, quantity, setName, rarity } = parsed.data;

  // Vérifier que la carte existe
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  // sortOrder = max existant + 1
  const maxOrder = await prisma.watchlistEntry.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  // Créer l'entrée + initialiser les prix pour tous les vendeurs existants
  const sellers = await prisma.seller.findMany({ select: { id: true } });

  const entry = await prisma.watchlistEntry.create({
    data: {
      deck,
      cardId,
      quantity,
      setName: setName ?? null,
      rarity: rarity ?? null,
      sortOrder,
      prices: {
        create: sellers.map((s) => ({ sellerId: s.id, price: null })),
      },
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
      prices: { select: { sellerId: true, price: true, updatedAt: true } },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

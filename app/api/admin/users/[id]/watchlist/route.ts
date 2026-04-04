import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/users/[id]/watchlist — watchlist complète d'un user (lecture seule)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const userId = (await params).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const [entries, sellers] = await Promise.all([
    prisma.watchlistEntry.findMany({
      where: { userId },
      orderBy: [{ format: "asc" }, { sortOrder: "asc" }],
      include: {
        card: {
          select: { id: true, name: true, type: true, frameType: true, imageUrl: true, hasLocalImage: true },
        },
      },
    }),
    prisma.seller.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const cardIds = [...new Set(entries.map((e) => e.cardId))];
  const prices = cardIds.length > 0
    ? await prisma.price.findMany({
        where: { cardId: { in: cardIds } },
        select: { cardId: true, sellerId: true, price: true, updatedAt: true },
      })
    : [];

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

  return NextResponse.json({ user, entries: entriesWithPrices, sellers });
}

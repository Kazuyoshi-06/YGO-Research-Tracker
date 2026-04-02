import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const UpsertPriceSchema = z.object({
  cardId: z.number().int().positive(),
  sellerId: z.number().int().positive(),
  price: z.number().positive().nullable(),
});

// PUT /api/prices — crée ou met à jour un prix (global Card×Seller)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = UpsertPriceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { cardId, sellerId, price } = parsed.data;

  const existing = await prisma.price.findUnique({
    where: { cardId_sellerId: { cardId, sellerId } },
    select: { price: true, updatedAt: true },
  });

  const shouldShift =
    existing !== null &&
    existing.price !== null &&
    existing.price !== price;

  const priceRecord = await prisma.price.upsert({
    where: { cardId_sellerId: { cardId, sellerId } },
    update: {
      price,
      updatedById: session.user.id,
      ...(shouldShift && {
        previousPrice: existing!.price,
        previousUpdatedAt: existing!.updatedAt,
      }),
    },
    create: { cardId, sellerId, price, updatedById: session.user.id },
    select: {
      cardId: true,
      sellerId: true,
      price: true,
      previousPrice: true,
      previousUpdatedAt: true,
      updatedAt: true,
    },
  });

  // Log pour notification admin
  if (shouldShift || (existing === null && price !== null)) {
    await prisma.priceChangeLog.create({
      data: {
        cardId,
        sellerId,
        oldPrice: existing?.price ?? null,
        newPrice: price,
        changedById: session.user.id,
      },
    });
  }

  return NextResponse.json(priceRecord);
}

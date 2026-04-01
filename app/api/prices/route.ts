import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpsertPriceSchema = z.object({
  watchlistEntryId: z.number().int().positive(),
  sellerId: z.number().int().positive(),
  price: z.number().positive().nullable(),
});

// PUT /api/prices — crée ou met à jour un prix
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = UpsertPriceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { watchlistEntryId, sellerId, price } = parsed.data;

  // Lire la valeur actuelle avant de la remplacer
  const existing = await prisma.price.findUnique({
    where: { watchlistEntryId_sellerId: { watchlistEntryId, sellerId } },
    select: { price: true, updatedAt: true },
  });

  // Décaler current → previous uniquement si la nouvelle valeur est différente
  // et si l'ancienne n'était pas null (pas d'historique sur un premier saisie depuis null)
  const shouldShift =
    existing !== null &&
    existing.price !== null &&
    existing.price !== price;

  const priceRecord = await prisma.price.upsert({
    where: { watchlistEntryId_sellerId: { watchlistEntryId, sellerId } },
    update: {
      price,
      ...(shouldShift && {
        previousPrice: existing!.price,
        previousUpdatedAt: existing!.updatedAt,
      }),
    },
    create: { watchlistEntryId, sellerId, price },
    select: {
      watchlistEntryId: true,
      sellerId: true,
      price: true,
      previousPrice: true,
      previousUpdatedAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(priceRecord);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSellerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

// GET /api/sellers — liste tous les vendeurs
export async function GET() {
  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(sellers);
}

// POST /api/sellers — crée un vendeur
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = CreateSellerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  }

  try {
    const seller = await prisma.seller.create({
      data: {
        name: parsed.data.name,
        shippingProfile: "cardmarket-fr-standard",
      },
    });

    // Initialise les cellules de prix pour toutes les entrées watchlist existantes
    const existingEntries = await prisma.watchlistEntry.findMany({ select: { id: true } });
    if (existingEntries.length > 0) {
      await prisma.price.createMany({
        data: existingEntries.map((e) => ({
          watchlistEntryId: e.id,
          sellerId: seller.id,
          price: null,
        })),
      });
    }

    return NextResponse.json(seller, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ce vendeur existe déjà" }, { status: 409 });
  }
}

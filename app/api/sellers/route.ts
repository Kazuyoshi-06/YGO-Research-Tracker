import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const CreateSellerSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

// GET /api/sellers — liste tous les vendeurs (pool global)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const sellers = await prisma.seller.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(sellers);
}

// POST /api/sellers — crée un vendeur dans le pool global
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

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
    return NextResponse.json(seller, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ce vendeur existe déjà" }, { status: 409 });
  }
}

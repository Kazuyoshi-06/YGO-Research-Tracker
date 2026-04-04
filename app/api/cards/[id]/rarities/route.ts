import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const cardId = parseInt(id, 10);

  if (isNaN(cardId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const setName = req.nextUrl.searchParams.get("setName");
  const format = req.nextUrl.searchParams.get("format"); // "TCG" | "OCG" | null

  // En mode OCG, pas de données de raretés en DB → saisie libre côté client
  if (format === "OCG") {
    return NextResponse.json([]);
  }

  const where = setName
    ? { cardId, setName }
    : { cardId };

  const rarities = await prisma.cardSet.findMany({
    where,
    select: { setRarity: true, setRarityCode: true },
    distinct: ["setRarity"],
    orderBy: { setRarity: "asc" },
  });

  return NextResponse.json(
    rarities.map((r) => ({ rarity: r.setRarity, code: r.setRarityCode }))
  );
}

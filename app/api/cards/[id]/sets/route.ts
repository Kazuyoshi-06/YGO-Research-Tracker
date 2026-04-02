import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const cardId = parseInt(id, 10);

  if (isNaN(cardId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const sets = await prisma.cardSet.findMany({
    where: { cardId },
    select: { setName: true },
    distinct: ["setName"],
    orderBy: { setName: "asc" },
  });

  return NextResponse.json(sets.map((s) => s.setName));
}

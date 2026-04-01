import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  ids: z.array(z.number().int().positive()).max(1000),
});

// POST /api/cards/batch — retourne les cartes trouvées + IDs inconnus
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const uniqueIds = [...new Set(parsed.data.ids)];

  const found = await prisma.card.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true },
  });

  const foundIds = new Set(found.map((c) => c.id));
  const notFound = uniqueIds.filter((id) => !foundIds.has(id));

  return NextResponse.json({ found, notFound });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = SearchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Paramètre 'q' requis" }, { status: 400 });
  }

  const { q, limit } = parsed.data;

  const cards = await prisma.card.findMany({
    where: { name: { contains: q } },
    select: { id: true, name: true, type: true, frameType: true, imageUrl: true, hasLocalImage: true },
    orderBy: [
      // exact match en premier
      { name: "asc" },
    ],
    take: limit,
  });

  // Trier : exact match en premier, puis starts-with, puis contains
  const lower = q.toLowerCase();
  const sorted = cards.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aExact = aName === lower ? 0 : aName.startsWith(lower) ? 1 : 2;
    const bExact = bName === lower ? 0 : bName.startsWith(lower) ? 1 : 2;
    return aExact - bExact || aName.localeCompare(bName);
  });

  return NextResponse.json(sorted);
}

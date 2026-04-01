import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_STATUSES = ["", "À commander", "Commandé", "Reçu"] as const;

const UpdateEntrySchema = z.object({
  deck: z.string().max(100).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  notes: z.string().max(2000).optional(),
  quantity: z.number().int().min(1).max(99).optional(),
  setName: z.string().max(200).nullable().optional(),
  rarity: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

// PATCH /api/watchlist/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const entry = await prisma.watchlistEntry.update({
      where: { id: entryId },
      data: parsed.data,
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
    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
}

// DELETE /api/watchlist/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entryId = parseInt(id, 10);

  if (isNaN(entryId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    await prisma.watchlistEntry.delete({ where: { id: entryId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
}

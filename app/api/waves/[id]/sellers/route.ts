import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";

const PutSellersSchema = z.object({
  sellerIds: z.array(z.number().int().positive()),
});

function waveId(id: string) {
  const n = parseInt(id, 10);
  return isNaN(n) ? null : n;
}

// GET /api/waves/[id]/sellers
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = waveId((await params).id);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const waveSellerRows = await prisma.waveSeller.findMany({
    where: { waveId: id },
    include: { seller: true },
  });

  return NextResponse.json(waveSellerRows.map((ws) => ws.seller));
}

// PUT /api/waves/[id]/sellers — remplace la liste des vendeurs désignés (admin)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const id = waveId((await params).id);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const wave = await prisma.wave.findUnique({ where: { id } });
  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });
  if (!["open", "frozen"].includes(wave.status)) {
    return NextResponse.json({ error: "Les vendeurs ne peuvent être modifiés que sur une vague open ou frozen" }, { status: 422 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PutSellersSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sellerIds } = parsed.data;

  // Remplacer en transaction : supprimer les anciens, créer les nouveaux
  await prisma.$transaction([
    prisma.waveSeller.deleteMany({ where: { waveId: id } }),
    prisma.waveSeller.createMany({
      data: sellerIds.map((sellerId) => ({ waveId: id, sellerId })),
    }),
  ]);

  const updated = await prisma.waveSeller.findMany({
    where: { waveId: id },
    include: { seller: true },
  });

  return NextResponse.json(updated.map((ws) => ws.seller));
}

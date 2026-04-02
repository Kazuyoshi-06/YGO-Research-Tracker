import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH /api/sellers/[id] — mise à jour shippingProfile
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const sellerId = parseInt(id, 10);
  if (isNaN(sellerId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body?.shippingProfile) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  try {
    const seller = await prisma.seller.update({
      where: { id: sellerId },
      data: { shippingProfile: body.shippingProfile },
    });
    return NextResponse.json(seller);
  } catch {
    return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });
  }
}

// DELETE /api/sellers/[id] — suppression vendeur (admin uniquement)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });

  const { id } = await params;
  const sellerId = parseInt(id, 10);
  if (isNaN(sellerId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    await prisma.seller.delete({ where: { id: sellerId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });
  }
}

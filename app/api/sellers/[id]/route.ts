import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/sellers/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sellerId = parseInt(id, 10);

  if (isNaN(sellerId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  try {
    await prisma.seller.delete({ where: { id: sellerId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });
  }
}

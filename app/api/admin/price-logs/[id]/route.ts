import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH /api/admin/price-logs/[id] — marquer comme lu
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const { id } = await params;
  const logId = parseInt(id, 10);
  if (isNaN(logId)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  try {
    const log = await prisma.priceChangeLog.update({
      where: { id: logId },
      data: { readByAdmin: true },
    });
    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "Log introuvable" }, { status: 404 });
  }
}

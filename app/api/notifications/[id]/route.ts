import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// PATCH /api/notifications/[id] — marquer une notification comme lue
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (notif.userId !== session.user.id) return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: notif.readAt ?? new Date() },
  });

  return NextResponse.json(updated);
}

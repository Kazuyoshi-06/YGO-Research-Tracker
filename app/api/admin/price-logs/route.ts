import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const logs = await prisma.priceChangeLog.findMany({
    orderBy: { changedAt: "desc" },
    take: 100,
    include: {
      card: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(logs);
}

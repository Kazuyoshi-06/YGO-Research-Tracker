import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/notifications — nombre de modifications de prix non lues
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ count: 0 });

  const count = await prisma.priceChangeLog.count({
    where: { readByAdmin: false },
  });

  return NextResponse.json({ count });
}

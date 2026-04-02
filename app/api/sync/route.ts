import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncYGOCards } from "@/lib/sync";
import { prisma } from "@/lib/prisma";

// POST /api/sync — sync manuelle (admin uniquement)
export async function POST(req: NextRequest) {
  // Autoriser aussi les appels cron via Bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Réservé aux admins" }, { status: 403 });
  }

  try {
    const result = await syncYGOCards();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json({ error: "Sync échouée" }, { status: 500 });
  }
}

// GET /api/sync — statut DB (authentifié)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const [cards, cardSets] = await Promise.all([
    prisma.card.count(),
    prisma.cardSet.count(),
  ]);
  return NextResponse.json({ cards, cardSets });
}

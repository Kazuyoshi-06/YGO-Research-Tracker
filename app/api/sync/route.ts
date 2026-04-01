import { NextRequest, NextResponse } from "next/server";
import { syncYGOCards } from "@/lib/sync";

// POST /api/sync — déclenche une synchronisation manuelle
export async function POST(req: NextRequest) {
  // Protection simple par token (optionnel en dev)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await syncYGOCards();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    return NextResponse.json({ error: "Sync échouée" }, { status: 500 });
  }
}

// GET /api/sync — status de la dernière sync (nb de cartes en base)
export async function GET() {
  const { prisma } = await import("@/lib/prisma");
  const [cards, cardSets] = await Promise.all([
    prisma.card.count(),
    prisma.cardSet.count(),
  ]);
  return NextResponse.json({ cards, cardSets });
}

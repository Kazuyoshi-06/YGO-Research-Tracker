import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET /api/admin/stats/waves — statistiques globales sur les vagues livrées
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const deliveredWaves = await prisma.wave.findMany({
    where: { status: "delivered" },
    orderBy: { createdAt: "desc" },
    include: {
      submissions: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              preferredSeller: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  // ── Stats globales ────────────────────────────────────────────────────────

  let totalCards = 0;
  let totalSpend = 0;
  const uniqueUsers = new Set<string>();

  // ── Par vague ─────────────────────────────────────────────────────────────

  const byWave = deliveredWaves.map((wave) => {
    let waveCards = 0;
    let waveSpend = 0;
    const waveUsers = new Set<string>();

    for (const sub of wave.submissions) {
      waveUsers.add(sub.userId);
      uniqueUsers.add(sub.userId);
      for (const item of sub.items) {
        waveCards += item.quantity;
        waveSpend += (item.snapshotPrice ?? 0) * item.quantity;
      }
    }

    totalCards += waveCards;
    totalSpend += waveSpend;

    const sellerNames = [...new Set(
      wave.submissions.flatMap((s) => s.items.map((i) => i.preferredSeller?.name).filter(Boolean))
    )];

    return {
      id: wave.id,
      name: wave.name,
      createdAt: wave.createdAt,
      userCount: waveUsers.size,
      cardCount: waveCards,
      totalSpend: waveSpend,
      sellers: sellerNames,
    };
  });

  // ── Par utilisateur ───────────────────────────────────────────────────────

  const userMap = new Map<string, {
    userId: string;
    userName: string;
    waveCount: number;
    cardCount: number;
    totalSpend: number;
  }>();

  for (const wave of deliveredWaves) {
    for (const sub of wave.submissions) {
      const existing = userMap.get(sub.userId) ?? {
        userId: sub.userId,
        userName: sub.user.name ?? sub.user.email,
        waveCount: 0,
        cardCount: 0,
        totalSpend: 0,
      };
      existing.waveCount += 1;
      for (const item of sub.items) {
        existing.cardCount += item.quantity;
        existing.totalSpend += (item.snapshotPrice ?? 0) * item.quantity;
      }
      userMap.set(sub.userId, existing);
    }
  }

  const byUser = Array.from(userMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend);

  // ── Par vendeur ───────────────────────────────────────────────────────────

  const sellerMap = new Map<string, {
    sellerName: string;
    waveCount: number;
    cardCount: number;
    totalSpend: number;
  }>();

  for (const wave of deliveredWaves) {
    const waveSellers = new Set<string>();
    for (const sub of wave.submissions) {
      for (const item of sub.items) {
        if (!item.preferredSeller) continue;
        const key = item.preferredSeller.name;
        waveSellers.add(key);
        const existing = sellerMap.get(key) ?? {
          sellerName: key, waveCount: 0, cardCount: 0, totalSpend: 0,
        };
        existing.cardCount += item.quantity;
        existing.totalSpend += (item.snapshotPrice ?? 0) * item.quantity;
        sellerMap.set(key, existing);
      }
    }
    // Incrémenter waveCount une seule fois par vague par vendeur
    for (const name of waveSellers) {
      const s = sellerMap.get(name);
      if (s) s.waveCount += 1;
    }
  }

  const bySeller = Array.from(sellerMap.values())
    .sort((a, b) => b.totalSpend - a.totalSpend);

  return NextResponse.json({
    summary: {
      waveCount: deliveredWaves.length,
      userCount: uniqueUsers.size,
      totalCards,
      totalSpend,
    },
    byWave,
    byUser,
    bySeller,
  });
}

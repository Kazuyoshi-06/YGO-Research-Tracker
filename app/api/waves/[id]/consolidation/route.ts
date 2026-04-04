import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function parseId(id: string) {
  const n = parseInt(id, 10);
  return isNaN(n) ? null : n;
}

// GET /api/waves/[id]/consolidation?format=json|csv
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const waveId = parseId((await params).id);
  if (!waveId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const wave = await prisma.wave.findUnique({
    where: { id: waveId },
    include: {
      sellers: { include: { seller: { select: { id: true, name: true, platform: true } } } },
      submissions: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              card: { select: { id: true, name: true } },
              preferredSeller: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });

  // Tous les users actifs pour savoir qui n'a pas soumis
  const allUsers = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true, name: true, email: true },
  });

  const submittedUserIds = new Set(wave.submissions.map((s) => s.userId));
  const notSubmitted = allUsers.filter((u) => !submittedUserIds.has(u.id));

  // ── Consolidation par carte ───────────────────────────────────────────────
  type CardRow = {
    cardId: number;
    cardName: string;
    totalQty: number;
    users: { userId: string; userName: string; qty: number; seller: string | null; price: number | null }[];
    bySeller: Map<string, { sellerName: string; qty: number; totalPrice: number }>;
  };

  const byCardMap = new Map<number, CardRow>();

  for (const sub of wave.submissions) {
    for (const item of sub.items) {
      const existing: CardRow = byCardMap.get(item.cardId) ?? {
        cardId: item.cardId,
        cardName: item.cardName,
        totalQty: 0,
        users: [],
        bySeller: new Map(),
      };

      existing.totalQty += item.quantity;
      existing.users.push({
        userId: sub.userId,
        userName: sub.user.name ?? sub.user.email,
        qty: item.quantity,
        seller: item.preferredSeller?.name ?? null,
        price: item.snapshotPrice,
      });

      // Grouper par vendeur préféré
      if (item.preferredSeller) {
        const sKey = item.preferredSeller.name;
        const sRow = existing.bySeller.get(sKey) ?? {
          sellerName: sKey,
          qty: 0,
          totalPrice: 0,
        };
        sRow.qty += item.quantity;
        sRow.totalPrice += (item.snapshotPrice ?? 0) * item.quantity;
        existing.bySeller.set(sKey, sRow);
      }

      byCardMap.set(item.cardId, existing);
    }
  }

  const byCard = Array.from(byCardMap.values())
    .sort((a, b) => a.cardName.localeCompare(b.cardName))
    .map((row) => ({
      cardId: row.cardId,
      cardName: row.cardName,
      totalQty: row.totalQty,
      users: row.users,
      bySeller: Array.from(row.bySeller.values()),
    }));

  // ── Consolidation par vendeur ─────────────────────────────────────────────
  const bySellerMap = new Map<string, { sellerName: string; cards: number; totalPrice: number }>();

  for (const sub of wave.submissions) {
    for (const item of sub.items) {
      if (!item.preferredSeller) continue;
      const key = item.preferredSeller.name;
      const row = bySellerMap.get(key) ?? { sellerName: key, cards: 0, totalPrice: 0 };
      row.cards += item.quantity;
      row.totalPrice += (item.snapshotPrice ?? 0) * item.quantity;
      bySellerMap.set(key, row);
    }
  }

  const bySeller = Array.from(bySellerMap.values()).sort((a, b) => b.totalPrice - a.totalPrice);

  const totalEstimated = bySeller.reduce((s, r) => s + r.totalPrice, 0);

  // ── Format CSV ────────────────────────────────────────────────────────────
  const fmt = req.nextUrl.searchParams.get("format");
  if (fmt === "csv") {
    const rows: string[][] = [
      ["Carte", "Édition", "Rareté", "Qté totale", "Vendeur recommandé", "Prix unitaire", "Prix total"],
    ];

    for (const sub of wave.submissions) {
      for (const item of sub.items) {
        rows.push([
          item.cardName,
          item.setName || "",
          item.rarity || "",
          String(item.quantity),
          item.preferredSeller?.name ?? "",
          item.snapshotPrice != null ? item.snapshotPrice.toFixed(2) : "",
          item.snapshotPrice != null ? (item.snapshotPrice * item.quantity).toFixed(2) : "",
        ]);
      }
    }

    const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vague-${waveId}-consolidation.csv"`,
      },
    });
  }

  return NextResponse.json({
    wave: {
      id: wave.id,
      name: wave.name,
      status: wave.status,
      deadline: wave.deadline,
      sellers: wave.sellers.map((ws) => ws.seller),
    },
    submissions: wave.submissions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user.name ?? s.user.email,
      userEmail: s.user.email,
      status: s.status,
      submittedAt: s.submittedAt,
      itemCount: s.items.length,
      estimatedTotal: s.items.reduce((sum, i) => sum + (i.snapshotPrice ?? 0) * i.quantity, 0),
      items: s.items.map((i) => ({
        id: i.id,
        cardName: i.cardName,
        setName: i.setName,
        rarity: i.rarity,
        quantity: i.quantity,
        snapshotPrice: i.snapshotPrice,
        preferredSeller: i.preferredSeller?.name ?? null,
      })),
    })),
    notSubmitted: notSubmitted.map((u) => ({ userId: u.id, userName: u.name ?? u.email })),
    byCard,
    bySeller,
    totalEstimated,
  });
}

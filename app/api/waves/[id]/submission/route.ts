import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { broadcastNotification, getAdminIds } from "@/lib/notifications";
import { sendSubmissionReceivedEmail } from "@/lib/email";

function parseId(id: string) {
  const n = parseInt(id, 10);
  return isNaN(n) ? null : n;
}

// GET /api/waves/[id]/submission — ma soumission pour cette vague (null si aucune)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const waveId = parseId((await params).id);
  if (!waveId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const submission = await prisma.orderSubmission.findUnique({
    where: { waveId_userId: { waveId, userId: session.user.id } },
    include: {
      items: {
        include: {
          card: { select: { id: true, name: true, imageUrl: true, hasLocalImage: true } },
          preferredSeller: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(submission ?? null);
}

// POST /api/waves/[id]/submission — soumettre (ou re-soumettre) ma liste
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const waveId = parseId((await params).id);
  if (!waveId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  // Vérifier que la vague existe et est ouverte
  const wave = await prisma.wave.findUnique({
    where: { id: waveId },
    include: { sellers: { select: { sellerId: true } } },
  });
  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });
  if (wave.status !== "open") {
    return NextResponse.json({ error: "Cette vague n'accepte plus de soumissions" }, { status: 422 });
  }

  const waveSellerIds = wave.sellers.map((ws) => ws.sellerId);

  // Récupérer toutes les entrées "À commander" de l'utilisateur
  const toOrderEntries = await prisma.watchlistEntry.findMany({
    where: { userId: session.user.id, status: "À commander" },
    include: { card: { select: { id: true, name: true } } },
  });

  if (toOrderEntries.length === 0) {
    return NextResponse.json(
      { error: "Aucune carte à commander dans votre watchlist" },
      { status: 422 }
    );
  }

  // Récupérer les prix parmi les vendeurs désignés pour toutes les cartes concernées
  const cardIds = [...new Set(toOrderEntries.map((e) => e.cardId))];
  const prices =
    waveSellerIds.length > 0
      ? await prisma.price.findMany({
          where: {
            cardId: { in: cardIds },
            sellerId: { in: waveSellerIds },
            price: { not: null },
          },
          select: { cardId: true, sellerId: true, price: true },
        })
      : [];

  // Indexer par cardId → meilleur prix + vendeur préféré
  type BestPrice = { price: number; sellerId: number };
  const bestByCard = new Map<number, BestPrice>();
  for (const p of prices) {
    if (p.price === null) continue;
    const current = bestByCard.get(p.cardId);
    if (!current || p.price < current.price) {
      bestByCard.set(p.cardId, { price: p.price, sellerId: p.sellerId });
    }
  }

  // Supprimer l'ancienne soumission si elle existe (re-soumission idempotente)
  const existing = await prisma.orderSubmission.findUnique({
    where: { waveId_userId: { waveId, userId: session.user.id } },
    include: { items: { select: { watchlistEntryId: true } } },
  });

  if (existing) {
    // Remettre les anciennes entrées en "À commander" avant d'écraser
    const oldEntryIds = existing.items.map((i) => i.watchlistEntryId);
    if (oldEntryIds.length > 0) {
      await prisma.watchlistEntry.updateMany({
        where: { id: { in: oldEntryIds } },
        data: { status: "À commander" },
      });
    }
    await prisma.orderSubmission.delete({ where: { id: existing.id } });
  }

  // Créer la nouvelle soumission avec snapshot des entrées
  const submission = await prisma.orderSubmission.create({
    data: {
      waveId,
      userId: session.user.id,
      status: "submitted",
      items: {
        create: toOrderEntries.map((entry) => {
          const best = bestByCard.get(entry.cardId);
          return {
            watchlistEntryId: entry.id,
            cardId: entry.cardId,
            cardName: entry.card.name,
            setName: entry.setName ?? "",
            rarity: entry.rarity ?? "",
            quantity: entry.quantity,
            preferredSellerId: best?.sellerId ?? null,
            snapshotPrice: best?.price ?? null,
          };
        }),
      },
    },
    include: {
      items: {
        include: {
          card: { select: { id: true, name: true, imageUrl: true, hasLocalImage: true } },
          preferredSeller: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Passer les entrées watchlist en statut "Soumis"
  await prisma.watchlistEntry.updateMany({
    where: { id: { in: toOrderEntries.map((e) => e.id) } },
    data: { status: "Soumis" },
  });

  // Notifier les admins (in-app + email)
  const userName = session.user.name ?? session.user.email ?? "Un utilisateur";
  const adminIds = await getAdminIds();
  await broadcastNotification(adminIds, {
    type: "submission_received",
    title: `Nouvelle soumission — ${userName}`,
    body: `${toOrderEntries.length} carte(s) soumise(s) pour la vague "${wave.name}".`,
    waveId,
    payload: { waveId, submissionId: submission.id, userId: session.user.id },
  });

  // Email admins en arrière-plan
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", banned: false },
    select: { email: true },
  });
  sendSubmissionReceivedEmail(
    admins.map((a) => a.email),
    userName,
    wave.name,
    toOrderEntries.length
  );

  return NextResponse.json(submission, { status: 201 });
}

// DELETE /api/waves/[id]/submission — retirer ma soumission (vague open uniquement)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const waveId = parseId((await params).id);
  if (!waveId) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const wave = await prisma.wave.findUnique({ where: { id: waveId } });
  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });
  if (wave.status !== "open") {
    return NextResponse.json(
      { error: "Impossible de retirer une soumission après la fermeture de la vague" },
      { status: 422 }
    );
  }

  const submission = await prisma.orderSubmission.findUnique({
    where: { waveId_userId: { waveId, userId: session.user.id } },
    include: { items: { select: { watchlistEntryId: true } } },
  });
  if (!submission) return NextResponse.json({ error: "Aucune soumission trouvée" }, { status: 404 });

  // Remettre les entrées watchlist en "À commander"
  const entryIds = submission.items.map((i) => i.watchlistEntryId);
  if (entryIds.length > 0) {
    await prisma.watchlistEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { status: "À commander" },
    });
  }

  await prisma.orderSubmission.delete({ where: { id: submission.id } });

  return new NextResponse(null, { status: 204 });
}

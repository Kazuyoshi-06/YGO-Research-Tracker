import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { broadcastNotification, getSubmitterIds, getAllUserIds } from "@/lib/notifications";
import { sendWaveOrderedEmail, sendWaveDeliveredEmail } from "@/lib/email";

const PatchWaveSchema = z.object({
  status: z.enum(["frozen", "ordered", "delivered"]),
});

function waveId(params: { id: string }) {
  const id = parseInt(params.id, 10);
  return isNaN(id) ? null : id;
}

// PATCH /api/waves/[id] — changer le statut (admin)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const id = waveId(await params);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const parsed = PatchWaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { status } = parsed.data;

  const wave = await prisma.wave.findUnique({ where: { id } });
  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });

  // Validation des transitions autorisées
  const transitions: Record<string, string[]> = {
    open: ["frozen"],
    frozen: ["ordered"],
    ordered: ["delivered"],
  };
  if (!transitions[wave.status]?.includes(status)) {
    return NextResponse.json(
      { error: `Transition invalide : ${wave.status} → ${status}` },
      { status: 422 }
    );
  }

  // Effets de bord selon la transition
  if (status === "ordered") {
    // Passer toutes les entrées watchlist soumises en "Commandé"
    const submissions = await prisma.orderSubmission.findMany({
      where: { waveId: id, status: { in: ["submitted", "confirmed"] } },
      include: { items: { select: { watchlistEntryId: true } } },
    });
    const entryIds = submissions.flatMap((s) => s.items.map((i) => i.watchlistEntryId));
    if (entryIds.length > 0) {
      await prisma.watchlistEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { status: "Commandé" },
      });
    }
  }

  if (status === "delivered") {
    // Passer toutes les entrées "Commandé" de la vague en "Reçu"
    const submissions = await prisma.orderSubmission.findMany({
      where: { waveId: id, status: { in: ["submitted", "confirmed"] } },
      include: { items: { select: { watchlistEntryId: true } } },
    });
    const entryIds = submissions.flatMap((s) => s.items.map((i) => i.watchlistEntryId));
    if (entryIds.length > 0) {
      await prisma.watchlistEntry.updateMany({
        where: { id: { in: entryIds }, status: "Commandé" },
        data: { status: "Reçu" },
      });
    }
  }

  const updated = await prisma.wave.update({ where: { id }, data: { status } });

  // Notifications selon la transition
  if (status === "frozen") {
    const userIds = await getAllUserIds();
    await broadcastNotification(userIds, {
      type: "wave_frozen",
      title: `Vague gelée — ${wave.name}`,
      body: "Les soumissions sont closes. La commande est en préparation.",
      waveId: id,
      payload: { waveId: id },
    });
  }

  if (status === "ordered") {
    const submitterIds = await getSubmitterIds(id);
    await broadcastNotification(submitterIds, {
      type: "wave_ordered",
      title: `Commande passée — ${wave.name}`,
      body: "Vos cartes ont été commandées. Vous serez notifié à la livraison.",
      waveId: id,
      payload: { waveId: id },
    });
    sendWaveOrderedEmail(wave.name, id);
  }

  if (status === "delivered") {
    const submitterIds = await getSubmitterIds(id);
    await broadcastNotification(submitterIds, {
      type: "wave_delivered",
      title: `Vague livrée — ${wave.name}`,
      body: "Vos cartes sont arrivées !",
      waveId: id,
      payload: { waveId: id },
    });
    sendWaveDeliveredEmail(wave.name, id);
  }

  return NextResponse.json(updated);
}

// DELETE /api/waves/[id] — supprimer une vague open (admin)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const id = waveId(await params);
  if (!id) return NextResponse.json({ error: "ID invalide" }, { status: 400 });

  const wave = await prisma.wave.findUnique({ where: { id } });
  if (!wave) return NextResponse.json({ error: "Vague introuvable" }, { status: 404 });
  if (wave.status !== "open") {
    return NextResponse.json({ error: "Seule une vague ouverte peut être supprimée" }, { status: 422 });
  }

  await prisma.wave.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

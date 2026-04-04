import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { z } from "zod";
import { broadcastNotification, getAllUserIds } from "@/lib/notifications";
import { sendWaveOpenEmail } from "@/lib/email";

const CreateWaveSchema = z.object({
  name: z.string().min(1).max(100),
  deadline: z.string().datetime().nullable().optional(),
  sellerIds: z.array(z.number().int().positive()).default([]),
});

// GET /api/waves
// Admin : toutes les vagues. User : uniquement les vagues open/frozen.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const isAdmin = session.user.role === "ADMIN";

  const waves = await prisma.wave.findMany({
    where: isAdmin ? {} : { status: { in: ["open", "frozen"] } },
    orderBy: { createdAt: "desc" },
    include: {
      sellers: { include: { seller: { select: { id: true, name: true, platform: true } } } },
      submissions: { select: { id: true } },
    },
  });

  const result = waves.map(({ submissions, ...w }) => ({
    ...w,
    submissionCount: submissions.length,
  }));

  return NextResponse.json(result);
}

// POST /api/waves — admin seulement
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Interdit" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = CreateWaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, deadline, sellerIds } = parsed.data;

  const wave = await prisma.wave.create({
    data: {
      name,
      deadline: deadline ? new Date(deadline) : null,
      createdById: session.user.id,
      sellers: {
        create: sellerIds.map((sellerId) => ({ sellerId })),
      },
    },
    include: {
      sellers: { include: { seller: { select: { id: true, name: true } } } },
    },
  });

  // Notifier tous les users de l'ouverture de la vague
  const sellerNames = wave.sellers.map((ws) => ws.seller.name).join(", ");
  const body_notif = sellerNames
    ? `Vendeurs désignés : ${sellerNames}`
    : "Consultez les vendeurs et soumettez votre liste.";

  const userIds = await getAllUserIds();
  await broadcastNotification(userIds, {
    type: "wave_open",
    title: `Vague ouverte — ${name}`,
    body: body_notif,
    waveId: wave.id,
    payload: { waveId: wave.id, waveName: name },
  });

  // Email en arrière-plan (non bloquant)
  sendWaveOpenEmail(name, wave.id, wave.sellers.map((ws) => ws.seller.name));

  return NextResponse.json(wave, { status: 201 });
}

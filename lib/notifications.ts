import { prisma } from "@/lib/prisma";

type NotificationType =
  | "wave_open"
  | "wave_frozen"
  | "wave_ordered"
  | "wave_delivered"
  | "submission_received";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  waveId?: number;
  payload?: Record<string, unknown>;
}

export async function createNotification(p: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: p.userId,
      type: p.type,
      title: p.title,
      body: p.body ?? "",
      waveId: p.waveId,
      payload: JSON.stringify(p.payload ?? {}),
    },
  });
}

// Envoie la même notification à une liste d'utilisateurs
export async function broadcastNotification(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body ?? "",
      waveId: params.waveId,
      payload: JSON.stringify(params.payload ?? {}),
    })),
  });
}

// Récupère les IDs de tous les users actifs (non bannis, non admin)
export async function getAllUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Récupère les IDs des users qui ont soumis pour une vague
export async function getSubmitterIds(waveId: number): Promise<string[]> {
  const submissions = await prisma.orderSubmission.findMany({
    where: { waveId, status: { in: ["submitted", "confirmed"] } },
    select: { userId: true },
  });
  return submissions.map((s) => s.userId);
}

// Récupère les IDs des admins
export async function getAdminIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", banned: false },
    select: { id: true },
  });
  return admins.map((u) => u.id);
}

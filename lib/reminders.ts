import { prisma } from "@/lib/prisma";
import { sendWaveReminderEmail } from "@/lib/email";

/**
 * Vérifie les vagues ouvertes dont la deadline est dans moins de 48h
 * et envoie un rappel aux users qui n'ont pas encore soumis.
 * Utilise les notifications existantes pour éviter les doublons.
 */
export async function sendDeadlineReminders() {
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Vagues ouvertes avec deadline dans les 48h
  const waves = await prisma.wave.findMany({
    where: {
      status: "open",
      deadline: { gte: now, lte: in48h },
    },
    include: {
      submissions: { select: { userId: true } },
    },
  });

  if (waves.length === 0) return;

  // Tous les users actifs
  const allUsers = await prisma.user.findMany({
    where: { banned: false },
    select: { id: true, email: true, name: true },
  });

  for (const wave of waves) {
    const submittedIds = new Set(wave.submissions.map((s) => s.userId));

    // Users qui n'ont pas encore soumis
    const pending = allUsers.filter((u) => !submittedIds.has(u.id));
    if (pending.length === 0) continue;

    // Éviter les doublons : ne pas envoyer si une notif "wave_reminder" existe déjà
    const alreadyNotified = await prisma.notification.findMany({
      where: {
        type: "wave_reminder",
        waveId: wave.id,
        userId: { in: pending.map((u) => u.id) },
      },
      select: { userId: true },
    });
    const alreadyNotifiedIds = new Set(alreadyNotified.map((n) => n.userId));

    const toNotify = pending.filter((u) => !alreadyNotifiedIds.has(u.id));
    if (toNotify.length === 0) continue;

    const deadlineStr = wave.deadline!.toLocaleString("fr-FR");

    // Notifications in-app
    await prisma.notification.createMany({
      data: toNotify.map((u) => ({
        userId: u.id,
        type: "wave_reminder",
        title: `Rappel — ${wave.name}`,
        body: `La vague se termine le ${deadlineStr}. Tu n'as pas encore soumis ta liste.`,
        waveId: wave.id,
        payload: JSON.stringify({ waveId: wave.id }),
      })),
    });

    // Emails
    const emails = toNotify.map((u) => u.email).filter(Boolean);
    await sendWaveReminderEmail(emails, wave.name, wave.id, wave.deadline!);

    console.log(
      `[reminders] ⏰ Rappel envoyé pour "${wave.name}" → ${toNotify.length} user(s)`
    );
  }
}

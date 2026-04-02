import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildPasswordResetUrl(origin: string, token: string) {
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function createPasswordResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function getValidPasswordResetToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          password: true,
        },
      },
    },
  });
}

export async function markPasswordResetTokenUsed(id: string) {
  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function clearPasswordResetTokensForUser(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });
}

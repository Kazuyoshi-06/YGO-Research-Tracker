import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  clearPasswordResetTokensForUser,
  getValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/lib/password-reset";

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ valid: false, error: "Token manquant." }, { status: 400 });
  }

  const resetToken = await getValidPasswordResetToken(token);
  if (!resetToken || !resetToken.user.password) {
    return NextResponse.json({ valid: false, error: "Lien invalide ou expiré." }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    expiresAt: resetToken.expiresAt.toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ResetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const resetToken = await getValidPasswordResetToken(token);

  if (!resetToken || !resetToken.user.password) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.user.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.user.id,
        id: { not: resetToken.id },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { buildPasswordResetUrl, createPasswordResetToken } from "@/lib/password-reset";

const ForgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ForgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  let resetUrl: string | null = null;

  if (user?.password) {
    const { rawToken } = await createPasswordResetToken(user.id);
    resetUrl = buildPasswordResetUrl(req.nextUrl.origin, rawToken);
  }

  return NextResponse.json({
    ok: true,
    message:
      "Si un compte compatible existe pour cet email, un lien de réinitialisation a été préparé.",
    resetUrl: process.env.NODE_ENV !== "production" ? resetUrl : null,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cardId = parseInt(id, 10);

  if (isNaN(cardId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, imageUrl: true, hasLocalImage: true },
  });

  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const localPath = join(process.cwd(), "public", "cards", `${cardId}.jpg`);

  // Déjà en cache local
  if (card.hasLocalImage && existsSync(localPath)) {
    return NextResponse.json({ cached: true, path: `/cards/${cardId}.jpg` });
  }

  if (!card.imageUrl) {
    return NextResponse.json({ error: "Pas d'URL d'image" }, { status: 422 });
  }

  try {
    const res = await fetch(card.imageUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(localPath, buffer);

    await prisma.card.update({
      where: { id: cardId },
      data: { hasLocalImage: true },
    });

    return NextResponse.json({ cached: false, path: `/cards/${cardId}.jpg` });
  } catch (err) {
    console.error(`Image download failed for card ${cardId}:`, err);
    return NextResponse.json({ error: "Téléchargement échoué" }, { status: 502 });
  }
}

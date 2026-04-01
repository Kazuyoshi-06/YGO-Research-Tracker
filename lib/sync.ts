/**
 * Synchronisation YGOProDeck → SQLite
 * Utilisé par : /api/sync (manuel) et le cron job quotidien
 */

import { prisma } from "./prisma";

const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
const BATCH_SIZE = 300;

interface ApiCardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
}

interface ApiCard {
  id: number;
  name: string;
  type: string;
  frameType?: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  card_sets?: ApiCardSet[];
  card_images?: Array<{ id: number; image_url: string }>;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export async function syncYGOCards(): Promise<{
  cards: number;
  cardSets: number;
  durationMs: number;
}> {
  const start = Date.now();

  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`YGOProDeck API error: ${res.status}`);
  const { data: cards } = (await res.json()) as { data: ApiCard[] };

  // Upsert cartes
  for (const batch of chunk(cards, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((card) =>
        prisma.card.upsert({
          where: { id: card.id },
          update: {
            name: card.name,
            type: card.type,
            frameType: card.frameType ?? "",
            description: card.desc ?? "",
            atk: card.atk ?? null,
            def: card.def ?? null,
            level: card.level ?? null,
            race: card.race ?? "",
            attribute: card.attribute ?? null,
            imageUrl: card.card_images?.[0]?.image_url ?? "",
          },
          create: {
            id: card.id,
            name: card.name,
            type: card.type,
            frameType: card.frameType ?? "",
            description: card.desc ?? "",
            atk: card.atk ?? null,
            def: card.def ?? null,
            level: card.level ?? null,
            race: card.race ?? "",
            attribute: card.attribute ?? null,
            imageUrl: card.card_images?.[0]?.image_url ?? "",
            hasLocalImage: false,
          },
        })
      )
    );
  }

  // Upsert sets
  const allSets = cards.flatMap((card) =>
    (card.card_sets ?? []).map((s) => ({
      cardId: card.id,
      setName: s.set_name,
      setCode: s.set_code,
      setRarity: s.set_rarity,
      setRarityCode: s.set_rarity_code ?? "",
    }))
  );

  for (const batch of chunk(allSets, BATCH_SIZE)) {
    await prisma.$transaction(
      batch.map((s) =>
        prisma.cardSet.upsert({
          where: { cardId_setCode_setRarity: { cardId: s.cardId, setCode: s.setCode, setRarity: s.setRarity } },
          update: { setName: s.setName, setRarityCode: s.setRarityCode },
          create: s,
        })
      )
    );
  }

  const [totalCards, totalCardSets] = await Promise.all([
    prisma.card.count(),
    prisma.cardSet.count(),
  ]);

  return { cards: totalCards, cardSets: totalCardSets, durationMs: Date.now() - start };
}

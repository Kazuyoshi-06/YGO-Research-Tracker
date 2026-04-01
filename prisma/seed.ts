/**
 * Seed YGOProDeck → SQLite
 * Télécharge toutes les cartes depuis l'API YGOProDeck et les insère en base.
 * Utilise upsert → idempotent (safe à relancer).
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";

const prisma = new PrismaClient({ log: ["error"] });

const API_URL = "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes";
const BATCH_SIZE = 300;

// ── Types API YGOProDeck ─────────────────────────────────────────────────────

interface ApiCardSet {
  set_name: string;
  set_code: string;
  set_rarity: string;
  set_rarity_code: string;
  set_price?: string;
}

interface ApiCardImage {
  id: number;
  image_url: string;
  image_url_small: string;
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
  card_images?: ApiCardImage[];
}

interface ApiResponse {
  data: ApiCard[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function log(msg: string) {
  process.stdout.write(`\r${msg}`.padEnd(80));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎴 YGO Research Tracker — Seed YGOProDeck\n");

  // 1. Téléchargement
  console.log("⬇  Téléchargement de toutes les cartes...");
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as ApiResponse;
  const cards = json.data;
  console.log(`✓  ${cards.length} cartes reçues\n`);

  // 2. Insertion des cartes par batch
  console.log("💾 Insertion des cartes...");
  const cardBatches = chunk(cards, BATCH_SIZE);
  let cardsDone = 0;

  for (const batch of cardBatches) {
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
    cardsDone += batch.length;
    log(`  ${cardsDone}/${cards.length} cartes insérées`);
  }
  console.log(`\n✓  ${cardsDone} cartes en base\n`);

  // 3. Insertion des CardSets par batch
  console.log("📦 Insertion des éditions/raretés...");

  // Construire la liste plate de tous les card_sets
  const allSets: Array<{
    cardId: number;
    setName: string;
    setCode: string;
    setRarity: string;
    setRarityCode: string;
  }> = [];

  for (const card of cards) {
    if (!card.card_sets) continue;
    for (const s of card.card_sets) {
      allSets.push({
        cardId: card.id,
        setName: s.set_name,
        setCode: s.set_code,
        setRarity: s.set_rarity,
        setRarityCode: s.set_rarity_code ?? "",
      });
    }
  }

  console.log(`   ${allSets.length} combinaisons carte×édition×rareté`);

  const setBatches = chunk(allSets, BATCH_SIZE);
  let setsDone = 0;

  for (const batch of setBatches) {
    await prisma.$transaction(
      batch.map((s) =>
        prisma.cardSet.upsert({
          where: {
            cardId_setCode_setRarity: {
              cardId: s.cardId,
              setCode: s.setCode,
              setRarity: s.setRarity,
            },
          },
          update: {
            setName: s.setName,
            setRarityCode: s.setRarityCode,
          },
          create: {
            cardId: s.cardId,
            setName: s.setName,
            setCode: s.setCode,
            setRarity: s.setRarity,
            setRarityCode: s.setRarityCode,
          },
        })
      )
    );
    setsDone += batch.length;
    log(`  ${setsDone}/${allSets.length} sets insérés`);
  }

  console.log(`\n✓  ${setsDone} sets en base\n`);

  // 4. Stats finales
  const [totalCards, totalSets] = await Promise.all([
    prisma.card.count(),
    prisma.cardSet.count(),
  ]);

  console.log("═══════════════════════════════════");
  console.log(`✅ Seed terminé`);
  console.log(`   Cards    : ${totalCards}`);
  console.log(`   CardSets : ${totalSets}`);
  console.log("═══════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed échoué :", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

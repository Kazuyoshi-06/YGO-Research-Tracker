/**
 * Script de sync manuelle — à lancer avec : tsx scripts/sync-now.ts
 * Met à jour toutes les cartes depuis YGOProDeck (format=All) + sets OCG/CN
 */

import "dotenv/config";
import { syncYGOCards } from "../lib/sync";

console.log("🔄 Démarrage de la sync YGOProDeck (TCG + OCG)...");
console.log("   URL : https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes&format=All");
console.log("   Patience, ça peut prendre 2-3 minutes...\n");

syncYGOCards()
  .then(({ cards, cardSets, durationMs }) => {
    console.log(`✅ Sync terminée en ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`   Cartes  : ${cards.toLocaleString()}`);
    console.log(`   CardSets: ${cardSets.toLocaleString()}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Erreur sync :", err);
    process.exit(1);
  });

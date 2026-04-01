/**
 * Cron job — sync quotidienne YGOProDeck
 * Démarré une seule fois via instrumentation.ts au lancement du serveur Next.js.
 */

import cron from "node-cron";
import { syncYGOCards } from "./sync";

// Guard contre les double-démarrages (hot-reload dev)
const g = globalThis as { __ygocronstared?: boolean };

export function startCronJob() {
  if (g.__ygocronstared) return;
  g.__ygocronstared = true;

  // Tous les jours à 3h00 du matin
  cron.schedule("0 3 * * *", async () => {
    console.log("[cron] ⏱ Démarrage de la sync quotidienne YGOProDeck…");
    try {
      const result = await syncYGOCards();
      console.log(
        `[cron] ✅ Sync terminée — ${result.cards} cartes, ${result.cardSets} sets (${result.durationMs}ms)`
      );
    } catch (err) {
      console.error("[cron] ❌ Sync échouée :", err);
    }
  });

  // Calcul de la prochaine exécution pour le log de démarrage
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + (now.getHours() >= 3 ? 1 : 0));
  next.setHours(3, 0, 0, 0);

  console.log(
    `[cron] ✓ Sync YGOProDeck planifiée — prochaine exécution : ${next.toLocaleString("fr-FR")}`
  );
}

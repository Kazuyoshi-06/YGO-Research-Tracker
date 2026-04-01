/**
 * Next.js Instrumentation Hook
 * Exécuté une seule fois au démarrage du serveur Node.js.
 * Ne s'exécute PAS sur le Edge Runtime ni dans le navigateur.
 */

export async function register() {
  // Uniquement sur le runtime Node.js (pas Edge, pas browser)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCronJob } = await import("./lib/cron");
    startCronJob();
  }
}

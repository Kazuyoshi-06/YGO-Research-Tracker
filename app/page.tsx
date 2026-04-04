import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { HubClient } from "@/components/hub/HubClient";

export const dynamic = "force-dynamic";

export default async function HubPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user.id;

  // Charger les stats TCG et OCG en parallèle
  const [tcgEntries, ocgEntries] = await Promise.all([
    prisma.watchlistEntry.findMany({
      where: { userId, format: "TCG" },
      select: { id: true, quantity: true, status: true, cardId: true },
    }),
    prisma.watchlistEntry.findMany({
      where: { userId, format: "OCG" },
      select: { id: true, quantity: true, status: true, cardId: true },
    }),
  ]);

  // Calculer la valeur estimée (meilleur prix disponible par carte)
  async function getEstimatedValue(entries: typeof tcgEntries) {
    if (entries.length === 0) return 0;
    const cardIds = [...new Set(entries.map((e) => e.cardId))];
    const prices = await prisma.price.findMany({
      where: { cardId: { in: cardIds }, price: { not: null } },
      select: { cardId: true, price: true },
    });
    // Meilleur prix par carte
    const bestByCard = new Map<number, number>();
    for (const p of prices) {
      if (p.price === null) continue;
      const current = bestByCard.get(p.cardId);
      if (current === undefined || p.price < current) {
        bestByCard.set(p.cardId, p.price);
      }
    }
    let total = 0;
    for (const e of entries) {
      const best = bestByCard.get(e.cardId);
      if (best !== undefined) total += best * e.quantity;
    }
    return Math.round(total * 100) / 100;
  }

  const [tcgValue, ocgValue] = await Promise.all([
    getEstimatedValue(tcgEntries),
    getEstimatedValue(ocgEntries),
  ]);

  const tcgStats = {
    total: tcgEntries.length,
    toOrder: tcgEntries.filter((e) => e.status === "").length,
    estimatedValue: tcgValue,
  };

  const ocgStats = {
    total: ocgEntries.length,
    toOrder: ocgEntries.filter((e) => e.status === "").length,
    estimatedValue: ocgValue,
  };

  return (
    <HubClient
      userName={session.user.name ?? session.user.email ?? ""}
      isAdmin={session.user.role === "ADMIN"}
      tcgStats={tcgStats}
      ocgStats={ocgStats}
    />
  );
}

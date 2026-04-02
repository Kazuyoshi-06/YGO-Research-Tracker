"use client";

import { useEffect, useState } from "react";

type PriceLog = {
  id: number;
  oldPrice: number | null;
  newPrice: number | null;
  changedAt: string;
  readByAdmin: boolean;
  card: { id: number; name: string };
  seller: { id: number; name: string };
  changedBy: { id: string; name: string | null; email: string };
};

function fmt(price: number | null) {
  if (price === null) return <span className="text-muted-foreground">—</span>;
  return `€${price.toFixed(2)}`;
}

export default function AdminPricesPage() {
  const [logs, setLogs] = useState<PriceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/price-logs")
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  async function markRead(log: PriceLog) {
    const res = await fetch(`/api/admin/price-logs/${log.id}`, { method: "PATCH" });
    if (res.ok) setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, readByAdmin: true } : l));
  }

  async function markAllRead() {
    const unread = logs.filter((l) => !l.readByAdmin);
    await Promise.all(unread.map((l) => fetch(`/api/admin/price-logs/${l.id}`, { method: "PATCH" })));
    setLogs((prev) => prev.map((l) => ({ ...l, readByAdmin: true })));
  }

  const unreadCount = logs.filter((l) => !l.readByAdmin).length;

  if (loading) return <p className="text-muted-foreground text-sm">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-lg text-gold tracking-widest uppercase">Prix modifiés</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-gold/20 border border-gold/30 px-2 py-0.5 text-xs font-medium text-gold">
              {unreadCount} non lu{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs px-3 py-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucune modification de prix enregistrée.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">Carte</th>
                <th className="px-4 py-3">Vendeur</th>
                <th className="px-4 py-3">Modification</th>
                <th className="px-4 py-3">Par</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Lu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className={`transition-colors ${log.readByAdmin ? "bg-surface opacity-60" : "bg-surface hover:bg-surface-raised"}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{log.card.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.seller.name}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className="text-muted-foreground">{fmt(log.oldPrice)}</span>
                    <span className="mx-2 text-muted-foreground/40">→</span>
                    <span className={log.newPrice !== null && (log.oldPrice === null || log.newPrice < log.oldPrice) ? "text-emerald-400" : "text-amber-400"}>
                      {fmt(log.newPrice)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.changedBy.name ?? log.changedBy.email}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(log.changedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!log.readByAdmin && (
                      <button
                        onClick={() => markRead(log)}
                        className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-colors"
                      >
                        Marquer lu
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  _count: { watchlistEntries: number };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    else setError("Erreur de chargement");
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleBan(user: User) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !user.banned }),
    });
    if (res.ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, banned: !u.banned } : u));
  }

  async function toggleRole(user: User) {
    const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
  }

  async function deleteUser(user: User) {
    if (!confirm(`Supprimer le compte de ${user.name ?? user.email} ? Cette action est irréversible.`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== user.id));
  }

  if (loading) return <p className="text-muted-foreground text-sm">Chargement…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg text-gold tracking-widest uppercase">Utilisateurs</h1>
        <span className="text-xs text-muted-foreground">{users.length} compte{users.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-raised">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3 text-center">Cartes</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => (
              <tr key={user.id} className={`bg-surface hover:bg-surface-raised transition-colors ${user.banned ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{user.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                  {user.banned && <span className="text-xs text-destructive">Suspendu</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${user.role === "ADMIN" ? "bg-gold/15 text-gold border border-gold/30" : "bg-surface-overlay text-muted-foreground border border-border"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">
                  {user._count.watchlistEntries}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${user.id}/watchlist`}
                      className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-colors"
                    >
                      Watchlist
                    </Link>
                    <button
                      onClick={() => toggleBan(user)}
                      className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-colors"
                    >
                      {user.banned ? "Réactiver" : "Suspendre"}
                    </button>
                    <button
                      onClick={() => toggleRole(user)}
                      className="text-xs px-2 py-1 rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-surface-overlay transition-colors"
                    >
                      {user.role === "ADMIN" ? "→ USER" : "→ ADMIN"}
                    </button>
                    <button
                      onClick={() => deleteUser(user)}
                      className="text-xs px-2 py-1 rounded border border-destructive/30 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

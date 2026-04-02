"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { AppLogo } from "@/components/tracker/AppLogo";
import { ArrowLeft, LoaderCircle, ShieldAlert, UserCircle2 } from "lucide-react";

export default function AccountPage() {
  const { data: session } = useSession();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user?.email ?? "";

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmEmail !== userEmail) {
      setError("L'email saisi ne correspond pas à votre compte.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/account", { method: "DELETE" });

    if (!res.ok) {
      setError("Erreur lors de la suppression du compte.");
      setLoading(false);
      return;
    }

    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1d29_0%,#0d0e12_42%)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <section className="rounded-[28px] border border-gold/12 bg-[linear-gradient(160deg,rgba(23,25,32,0.96),rgba(13,14,18,0.98))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="max-w-md space-y-5">
              <AppLogo />
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/18 bg-gold/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold/84">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Mon compte
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Gérer l&apos;accès et les informations du compte
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  Vérifie tes informations, ton rôle, puis utilise la zone de danger
                  seulement si tu veux supprimer définitivement ton espace de travail.
                </p>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-card/60 p-5 space-y-4">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/78">Nom</p>
                  <p className="text-sm text-foreground/92">{session?.user?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/78">Email</p>
                  <p className="text-sm text-foreground/92">{userEmail}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/78">Rôle</p>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                    session?.user?.role === "ADMIN"
                      ? "border border-gold/30 bg-gold/15 text-gold"
                      : "border border-border bg-surface-overlay text-foreground/82"
                  }`}>
                    {session?.user?.role ?? "USER"}
                  </span>
                </div>
              </div>

              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground/82 transition-colors hover:text-gold"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour au tracker
              </Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-destructive/18 bg-[linear-gradient(180deg,rgba(28,18,20,0.94),rgba(14,13,18,0.98))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Zone danger
                </span>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Supprimer mon compte
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Cette action est irréversible. Toute ta wishlist et les données liées
                  à ton compte seront supprimées définitivement.
                </p>
              </div>

              {error && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <form onSubmit={handleDelete} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                    Confirme avec ton email
                  </label>
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={loading || signingOut}
                    className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-destructive/50 focus:outline-none transition-colors"
                    placeholder={userEmail}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || signingOut || confirmEmail !== userEmail}
                  className="flex w-full items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/85 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Suppression…
                    </span>
                  ) : (
                    "Supprimer mon compte"
                  )}
                </button>
              </form>

              <button
                onClick={() => {
                  setSigningOut(true);
                  void signOut({ callbackUrl: "/login" });
                }}
                disabled={loading || signingOut}
                className="w-full rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium text-foreground/88 transition-colors hover:bg-card/80 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? "Déconnexion…" : "Se déconnecter à la place"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

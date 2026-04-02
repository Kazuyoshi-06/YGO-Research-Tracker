"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from "lucide-react";

import { AppLogo } from "@/components/tracker/AppLogo";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    setInfo("Compte créé. Connexion automatique en cours…");

    // Connexion automatique après inscription
    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      setInfo(null);
      router.push("/login");
    } else {
      router.push("/");
    }
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
                  <Sparkles className="h-3.5 w-3.5" />
                  Nouveau compte
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Crée ton espace de veille Yu-Gi-Oh!
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  Ouvre ton espace personnel pour suivre tes cartes, comparer les vendeurs
                  et piloter ton plan d&apos;achat sans perdre ton historique.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                    Inclus
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">Wishlist, dashboard, suivi</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                    Démarrage
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">Connexion auto après inscription</p>
                </div>
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground/82 transition-colors hover:text-gold"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(19,20,24,0.96),rgba(12,13,18,0.98))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/78">
                  Inscription
                </p>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Configurer le compte
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Choisis un nom, un email et un mot de passe pour démarrer.
                </p>
              </div>

              {error && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {info && (
                <p className="rounded-2xl border border-blue-700/30 bg-blue-950/20 px-4 py-3 text-sm text-blue-200">
                  {info}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                    Nom d&apos;utilisateur
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none transition-colors"
                    placeholder="DuelMaster42"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none transition-colors"
                    placeholder="vous@exemple.com"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none transition-colors"
                    placeholder="Au moins 8 caractères"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                    Confirmation
                  </label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none transition-colors"
                    placeholder="Retape le mot de passe"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-gold/92 disabled:opacity-50"
                >
                  {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {loading ? "Inscription…" : "Créer mon compte"}
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted-foreground/82">
                  Déjà un compte ?
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                >
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

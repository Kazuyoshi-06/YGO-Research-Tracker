"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Link2, LoaderCircle, MailQuestion } from "lucide-react";

import { AppLogo } from "@/components/tracker/AppLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setResetUrl(null);
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de préparer le lien de réinitialisation.");
      return;
    }

    setMessage(
      data.message ??
        "Si un compte compatible existe, un lien de réinitialisation a été préparé."
    );
    setResetUrl(data.resetUrl ?? null);
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
                  <MailQuestion className="h-3.5 w-3.5" />
                  Récupération
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Réinitialiser le mot de passe
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  En mode dev, le lien de réinitialisation s&apos;affichera directement ici.
                  Plus tard, il suffira de brancher un provider email.
                </p>
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
                  Mot de passe oublié
                </p>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Générer un lien de reset
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Saisis ton email. La réponse reste générique pour éviter de révéler si un compte existe.
                </p>
              </div>

              {error && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-2xl border border-blue-700/30 bg-blue-950/20 px-4 py-3 text-sm text-blue-200">
                  {message}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-gold/92 disabled:opacity-50"
                >
                  {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {loading ? "Préparation…" : "Préparer le lien"}
                </button>
              </form>

              {resetUrl && (
                <div className="rounded-2xl border border-gold/20 bg-gold/[0.06] px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-gold/84">
                    Lien de reset dev
                  </p>
                  <a
                    href={resetUrl}
                    className="mt-2 flex items-start gap-2 break-all text-sm text-foreground/90 transition-colors hover:text-gold"
                  >
                    <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {resetUrl}
                  </a>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted-foreground/82">
                  Déjà le bon mot de passe ?
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                >
                  Revenir au login
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

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";

import { AppLogo } from "@/components/tracker/AppLogo";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function validate() {
      if (!token) {
        setError("Lien invalide ou incomplet.");
        setValidating(false);
        return;
      }

      const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;

      setValidating(false);
      if (!res.ok || !data.valid) {
        setTokenValid(false);
        setError(data.error ?? "Lien invalide ou expiré.");
        return;
      }

      setTokenValid(true);
      setError(null);
    }

    void validate();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "Impossible de réinitialiser le mot de passe.");
      return;
    }

    setSuccess("Mot de passe mis à jour. Redirection vers la connexion…");
    setTimeout(() => router.push("/login"), 1200);
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
                  <KeyRound className="h-3.5 w-3.5" />
                  Nouveau mot de passe
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Choisir un nouveau mot de passe
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  Le lien ne peut être utilisé qu&apos;une fois et expire automatiquement.
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
                  Réinitialisation
                </p>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Sécuriser l&apos;accès
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Choisis un mot de passe fort de 8 caractères minimum.
                </p>
              </div>

              {validating && (
                <p className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground/82">
                  Vérification du lien…
                </p>
              )}
              {error && (
                <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-2xl border border-emerald-700/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                  {success}
                </p>
              )}

              {tokenValid && !success && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground/78">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={submitting}
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
                      disabled={submitting}
                      className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-gold focus:outline-none transition-colors"
                      placeholder="Retape le mot de passe"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold px-4 py-3 text-sm font-semibold text-background transition-colors hover:bg-gold/92 disabled:opacity-50"
                  >
                    {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {submitting ? "Validation…" : "Mettre à jour le mot de passe"}
                  </button>
                </form>
              )}

              {!tokenValid && !validating && (
                <div className="border-t border-border/70 pt-4">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gold transition-colors hover:text-gold/80"
                  >
                    Demander un nouveau lien
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1d29_0%,#0d0e12_42%)] px-4 py-10 text-foreground">
          <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
            <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(19,20,24,0.96),rgba(12,13,18,0.98))] px-8 py-10 text-sm text-muted-foreground/82">
              Chargement du formulaire de réinitialisation…
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ArrowLeft, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";

import { AppLogo } from "@/components/tracker/AppLogo";

export default function LogoutPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1d29_0%,#0d0e12_42%)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="rounded-[28px] border border-gold/12 bg-[linear-gradient(160deg,rgba(23,25,32,0.96),rgba(13,14,18,0.98))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="max-w-md space-y-5">
              <AppLogo />
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/18 bg-gold/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-gold/84">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Session active
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Quitter la session proprement
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  La déconnexion coupe immédiatement l&apos;accès au tracker, à l&apos;admin
                  et aux pages compte. Tu pourras te reconnecter ensuite avec tes identifiants
                  ou via Google / Discord.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                    Effet
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">Fin de session immédiate</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                    Retour
                  </p>
                  <p className="mt-1 text-sm text-foreground/90">Redirection vers connexion</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(19,20,24,0.96),rgba(12,13,18,0.98))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/78">
                  Déconnexion
                </p>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Confirmer la sortie
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Tu peux revenir au tracker si c&apos;était involontaire, ou confirmer la
                  déconnexion maintenant.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setLoading(true);
                    void signOut({ callbackUrl: "/login" });
                  }}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/25 bg-gold text-background px-4 py-3 text-sm font-semibold transition-colors hover:bg-gold/92 disabled:opacity-60"
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  {loading ? "Déconnexion…" : "Se déconnecter"}
                </button>

                <Link
                  href="/"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm font-medium text-foreground/88 transition-colors hover:bg-surface-raised hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour au tracker
                </Link>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                  Note
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground/82">
                  Si tu utilisais un compte OAuth, tu seras déconnecté du tracker, mais pas
                  forcément de ton compte Google ou Discord au niveau navigateur.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

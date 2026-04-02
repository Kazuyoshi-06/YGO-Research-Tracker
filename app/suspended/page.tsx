import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

import { AppLogo } from "@/components/tracker/AppLogo";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1d29_0%,#0d0e12_42%)] px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center justify-center">
        <div className="grid w-full max-w-3xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[28px] border border-gold/12 bg-[linear-gradient(160deg,rgba(23,25,32,0.96),rgba(13,14,18,0.98))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="max-w-md space-y-5">
              <AppLogo />
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Accès suspendu
                </span>
                <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
                  Le compte est actuellement suspendu
                </h1>
                <p className="text-sm leading-6 text-muted-foreground/82 sm:text-[15px]">
                  L&apos;accès au tracker a été désactivé pour ce compte. Si c&apos;est une erreur
                  ou si tu as besoin d&apos;un retour, il faut contacter l&apos;administrateur.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-destructive/18 bg-[linear-gradient(180deg,rgba(28,18,20,0.94),rgba(14,13,18,0.98))] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.28)] sm:p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/78">
                  Information
                </p>
                <h2 className="text-2xl font-semibold text-foreground/94">
                  Que faire maintenant ?
                </h2>
                <p className="text-sm leading-6 text-muted-foreground/82">
                  Tu peux revenir à la page de connexion, mais l&apos;accès restera bloqué tant
                  que la suspension n&apos;aura pas été levée.
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/78">
                  Conseil
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground/82">
                  Prépare l&apos;email du compte et le contexte de la demande avant de contacter
                  l&apos;administration, cela accélérera la vérification.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm font-medium text-foreground/88 transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour à la connexion
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { HubHeader } from "@/components/hub/HubHeader";
import { FormatCard } from "@/components/hub/FormatCard";
import { HubWaveBanner } from "@/components/hub/HubWaveBanner";

type FormatStats = {
  total: number;
  toOrder: number;
  estimatedValue: number;
};

type Props = {
  userName: string;
  isAdmin: boolean;
  tcgStats: FormatStats;
  ocgStats: FormatStats;
};

export function HubClient({ isAdmin, tcgStats, ocgStats }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <HubWaveBanner />
      <HubHeader isAdmin={isAdmin} />

      {/* Contenu centré verticalement */}
      <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 pt-14">

        {/* Titre */}
        <div className="text-center space-y-2 animate-[fade-in-up_0.5s_ease_both]">
          <h1 className="font-heading text-2xl tracking-[0.22em] uppercase text-gold sm:text-3xl">
            Votre collection
          </h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            Choisissez le format à gérer
          </p>
        </div>

        {/* Les deux cartes */}
        <div
          className="flex w-full max-w-2xl flex-col gap-5 sm:flex-row animate-[fade-in-up_0.6s_ease_0.1s_both]"
        >
          <FormatCard format="TCG" stats={tcgStats} />
          <FormatCard format="OCG" stats={ocgStats} />
        </div>

      </div>
    </div>
  );
}

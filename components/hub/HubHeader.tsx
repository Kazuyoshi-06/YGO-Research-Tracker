"use client";

import Link from "next/link";
import { AppLogo } from "@/components/tracker/AppLogo";
import { UserMenu } from "@/components/tracker/UserMenu";

interface HubHeaderProps {
  isAdmin?: boolean;
}

export function HubHeader({ isAdmin = false }: HubHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/90 backdrop-blur-md px-4 sm:px-6">
      <Link href="/" aria-label="Accueil">
        <AppLogo />
      </Link>
      <UserMenu isAdmin={isAdmin} />
    </header>
  );
}

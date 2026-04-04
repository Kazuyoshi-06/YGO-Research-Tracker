import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-gold/10 bg-surface px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-heading text-sm text-gold/70 hover:text-gold tracking-widest uppercase transition-colors">
            ← Tracker
          </Link>
          <span className="text-muted-foreground/30">|</span>
          <span className="font-heading text-sm text-gold tracking-widest uppercase">Admin</span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/admin/users"
            className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            Utilisateurs
          </Link>
          <Link
            href="/admin/prices"
            className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            Prix modifiés
          </Link>
          <Link
            href="/admin/waves"
            className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            Vagues
          </Link>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

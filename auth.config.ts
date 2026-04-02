import type { NextAuthConfig } from "next-auth";

// Config légère — Edge compatible (pas de Prisma, pas de bcrypt)
// Utilisée par le proxy ET comme base de auth.ts
export const authConfig = {
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const publicPaths = ["/login", "/logout", "/register", "/forgot-password", "/reset-password", "/suspended", "/api/auth"];
      if (publicPaths.some((p) => pathname.startsWith(p))) return true;

      if (!isLoggedIn) return false;

      // Banni → /suspended
      if ((auth?.user as { banned?: boolean })?.banned) {
        if (pathname === "/suspended") return true;
        return Response.redirect(new URL("/suspended", nextUrl));
      }

      // Routes admin
      if (pathname.startsWith("/admin")) {
        return (auth?.user as { role?: string })?.role === "ADMIN";
      }

      return true;
    },
    // Ces callbacks sont nécessaires dans auth.config.ts pour que le proxy
    // puisse lire role/banned depuis le JWT token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
        token.banned = (user as { banned?: boolean }).banned ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
        session.user.banned = (token.banned as boolean) ?? false;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

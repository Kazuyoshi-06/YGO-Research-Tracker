import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "YGO Research Tracker",
  description: "Tableau de recherche de prix CardMarket pour Yu-Gi-Oh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} dark h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased tracking-[0.01em]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

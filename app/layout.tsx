import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { getServerSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: "Terminarz, statystyki i społeczność na boisku",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();

  let accountNav: {
    firstName: string;
    lastName: string;
    zawodnik: string;
    profilePhotoPath: string | null;
  } | null = null;
  if (session) {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT first_name, last_name, player_alias AS zawodnik, profile_photo_path FROM users WHERE id = ?"
      )
      .get(session.userId) as
      | {
          first_name: string;
          last_name: string;
          zawodnik: string;
          profile_photo_path: string | null;
        }
      | undefined;
    accountNav = {
      firstName: row?.first_name ?? session.firstName,
      lastName: row?.last_name ?? session.lastName,
      zawodnik: row?.zawodnik ?? session.zawodnik,
      profilePhotoPath: row?.profile_photo_path ?? null,
    };
  }

  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} murawa-bg min-h-screen antialiased font-sans`}>
        <SiteShell
          isLoggedIn={Boolean(session)}
          isAdmin={session?.isAdmin ?? false}
          account={accountNav}
        >
          {children}
        </SiteShell>
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 4200,
            classNames: {
              toast:
                "group rounded-xl border border-emerald-200/90 bg-white/95 font-sans shadow-[0_12px_40px_-12px_rgba(5,80,55,0.28)] backdrop-blur-md",
              title: "text-[15px] font-semibold text-emerald-950",
              description: "text-sm text-slate-600",
              closeButton:
                "rounded-lg border border-emerald-100 bg-white text-emerald-800 hover:bg-emerald-50",
            },
          }}
        />
      </body>
    </html>
  );
}

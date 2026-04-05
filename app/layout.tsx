import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { getServerSession } from "@/lib/auth";
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
  return (
    <html lang="pl">
      <body className={`${geistSans.variable} ${geistMono.variable} murawa-bg min-h-screen antialiased font-sans`}>
        <SiteShell isLoggedIn={Boolean(session)} isAdmin={session?.isAdmin ?? false}>
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

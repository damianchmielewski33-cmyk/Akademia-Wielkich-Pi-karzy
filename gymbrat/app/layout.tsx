import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { ActiveWorkoutGlobalBar } from "@/components/active-workout/active-workout-global-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
});

const displayFont = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../public/fonts/teko-latin-ext.woff2", weight: "400 700", style: "normal" },
    { path: "../public/fonts/teko-latin.woff2", weight: "400 700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "GymBrat — centrum treningowe",
    template: "%s · GymBrat",
  },
  description:
    "Dziennik treningowy i żywieniowy: plany, historia, raporty, wartości odżywcze i Fitatu — w ekosystemie Akademii Wielkich Piłkarzy.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GymBrat",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#00C9B1",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: "html,body{background-color:#f4f5f7;}",
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased marketplace-bg text-foreground">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('gymbrat-ui-theme');if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}})();",
          }}
        />
        <AppProviders>
          {children}
          <ActiveWorkoutGlobalBar />
        </AppProviders>
      </body>
    </html>
  );
}

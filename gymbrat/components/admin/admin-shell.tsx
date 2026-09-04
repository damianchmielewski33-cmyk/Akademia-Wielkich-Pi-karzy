"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ScrollText, Shield, Users } from "lucide-react";
import { useSaveFeedback } from "@/components/feedback/save-feedback";
import { ensureCsrfCookie, getXsrfHeaders } from "@/lib/client-csrf";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/overview", label: "Analityka", icon: LayoutDashboard },
  { href: "/admin/users", label: "Użytkownicy", icon: Users },
  { href: "/admin/audit", label: "Dziennik", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifySaved, notifyError } = useSaveFeedback();

  return (
    <div className="space-y-8">
      <header className="pitch-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--mp-teal)] text-white shadow-sm">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mp-teal-dark)]">
              GymBrat
            </p>
            <h1 className="font-heading text-lg font-semibold text-zinc-950 dark:text-white">
              Administrator
            </h1>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href}>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-[var(--mp-teal)] text-white shadow-sm"
                      : "bg-zinc-50 text-zinc-700 hover:bg-teal-50 hover:text-[var(--mp-teal-dark)] dark:bg-zinc-900 dark:text-zinc-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              </Link>
            );
          })}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void (async () => {
                await ensureCsrfCookie();
                const res = await fetch("/api/admin/lock", {
                  method: "POST",
                  credentials: "include",
                  headers: { ...getXsrfHeaders() },
                });
                if (!res.ok) {
                  notifyError("Nie udało się zablokować panelu.");
                  return;
                }
                notifySaved("Zablokowano panel administratora.");
                router.push("/");
                router.refresh();
              })();
            }}
          >
            Wyjdź z panelu
          </Button>
          <Link href="/">
            <Button type="button" variant="ghost" size="sm">
              Wróć do aplikacji
            </Button>
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

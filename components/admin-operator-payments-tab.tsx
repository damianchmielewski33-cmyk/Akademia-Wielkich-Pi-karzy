"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";
import {
  AdminCard,
  AdminToolbar,
  adminEmptyStateClass,
  adminFieldClass,
  adminStatusChipClass,
  adminToggleRowClass,
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { YesNoSwitchRow } from "@/components/ui/yes-no-switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AppSettingsApiResponse } from "@/app/api/admin/app-settings/route";
import { AdminHotpayConfirmPanel } from "@/components/admin-hotpay-confirm-panel";
import { grossUpHotpayAmount } from "@/lib/hotpay";

type HotpaySettings = Pick<
  AppSettingsApiResponse,
  "hotpay_enabled" | "hotpay_commission_pct" | "hotpay_commission_fixed"
> & {
  system: Pick<AppSettingsApiResponse["system"], "hotpay_configured">;
};

function formatExampleGross(net: number, pct: number, fixed: number) {
  return grossUpHotpayAmount(net, pct, fixed).toFixed(2);
}

/**
 * Zakładka admina: wszystkie ustawienia płatności u operatora (HotPay).
 */
export function AdminOperatorPaymentsTab() {
  const [settings, setSettings] = useState<HotpaySettings | null>(null);
  const [fetching, setFetching] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/admin/app-settings");
      if (!res.ok) throw new Error("Nie udało się wczytać ustawień");
      const data = (await res.json()) as AppSettingsApiResponse;
      setSettings({
        hotpay_enabled: data.hotpay_enabled,
        hotpay_commission_pct: data.hotpay_commission_pct,
        hotpay_commission_fixed: data.hotpay_commission_fixed,
        system: { hotpay_configured: data.system.hotpay_configured },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd wczytywania");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<Pick<HotpaySettings, "hotpay_enabled" | "hotpay_commission_pct" | "hotpay_commission_fixed">>) => {
      if (busy) return;
      setBusy(true);
      const previous = settings;
      if (previous && patch.hotpay_enabled !== undefined) {
        setSettings({ ...previous, hotpay_enabled: patch.hotpay_enabled });
      }
      const toastId = toast.loading("Zapisywanie…");
      try {
        const res = await fetch("/api/admin/app-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = (await res.json().catch(() => ({}))) as AppSettingsApiResponse & { error?: string };
        if (!res.ok) {
          if (previous) setSettings(previous);
          toast.error(typeof data.error === "string" ? data.error : "Nie udało się zapisać", { id: toastId });
          return;
        }
        setSettings({
          hotpay_enabled: data.hotpay_enabled,
          hotpay_commission_pct: data.hotpay_commission_pct,
          hotpay_commission_fixed: data.hotpay_commission_fixed,
          system: { hotpay_configured: data.system.hotpay_configured },
        });
        window.dispatchEvent(
          new CustomEvent("awp-hotpay-settings-changed", {
            detail: { enabled: data.hotpay_enabled, configured: data.system.hotpay_configured },
          })
        );
        toast.success("Zapisano ustawienia płatności operatora", { id: toastId });
      } catch (e) {
        if (previous) setSettings(previous);
        toast.error(e instanceof Error ? e.message : "Błąd zapisu", { id: toastId });
      } finally {
        setBusy(false);
      }
    },
    [busy, settings]
  );

  if (fetching && !settings) {
    return (
      <div className={cn(adminEmptyStateClass, "flex items-center justify-center gap-2 py-16")}>
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Wczytywanie płatności operatora…
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={adminEmptyStateClass}>
        <p>Nie udało się wczytać ustawień.</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => void load()}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  const configured = settings.system.hotpay_configured;

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Płatności operatora"
        description="HotPay — włączanie bramki, prowizja i stała opłata. Gracze płacą zaległości i doładowania przez operatora."
        onReload={() => void load()}
        loading={fetching || busy}
      />

      <AdminCard
        title="Bramka HotPay"
        description="Wymaga zmiennych HOTPAY_SEKRET i HOTPAY_NOTIFICATION_PASSWORD na serwerze (Vercel / env)."
      >
        <ul className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <li className={adminStatusChipClass}>
            <span className="text-emerald-100/70">HotPay (env):</span>{" "}
            <strong className={configured ? "text-emerald-300" : "text-amber-300"}>
              {configured
                ? "Skonfigurowany — klucze API ustawione"
                : "Nieskonfigurowany — brak HOTPAY_SEKRET lub HOTPAY_NOTIFICATION_PASSWORD"}
            </strong>
          </li>
          <li className={adminStatusChipClass}>
            <span className="text-emerald-100/70">Dla graczy:</span>{" "}
            <strong className={settings.hotpay_enabled && configured ? "text-emerald-300" : "text-amber-300"}>
              {settings.hotpay_enabled && configured ? "Płatności online włączone" : "Płatności online wyłączone"}
            </strong>
          </li>
        </ul>

        <YesNoSwitchRow
          className={adminToggleRowClass}
          label="Włącz płatności HotPay"
          hint={
            configured
              ? "Gracze zobaczą przyciski „Zapłać kartą lub Blikiem” (terminarz, portfel, linki podsumowania meczu)."
              : "Ustaw najpierw HOTPAY_SEKRET i HOTPAY_NOTIFICATION_PASSWORD w env, żeby przełącznik miał efekt."
          }
          checked={settings.hotpay_enabled}
          disabled={busy || !configured}
          onCheckedChange={(v) => void save({ hotpay_enabled: v })}
        />
      </AdminCard>

      <AdminCard
        title="Prowizja operatora"
        description="Kwota wysłana do HotPay jest powiększana tak, aby gracz pokrył prowizję. Na portfelu księgowana jest kwota netto (zaległość / doładowanie)."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hotpay-commission-pct">Prowizja operatora (%)</Label>
            <p className="text-xs text-emerald-100/65">
              Aktualny cennik HotPay dla dz. niezarejestrowanej: 2,45%.
            </p>
            <Input
              id="hotpay-commission-pct"
              type="number"
              min={0}
              max={50}
              step={0.01}
              className={adminFieldClass}
              defaultValue={settings.hotpay_commission_pct}
              disabled={busy}
              key={`commission_pct-${settings.hotpay_commission_pct}`}
              onBlur={(e) => {
                const n = parseFloat(e.target.value);
                if (!Number.isFinite(n) || n < 0) return;
                if (n !== settings.hotpay_commission_pct) void save({ hotpay_commission_pct: n });
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.currentTarget.blur();
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hotpay-commission-fixed">Stała opłata operatora (zł)</Label>
            <p className="text-xs text-emerald-100/65">
              Aktualny cennik HotPay dla dz. niezarejestrowanej: 0,30 zł / transakcję. Wpisz 0, jeśli brak.
            </p>
            <Input
              id="hotpay-commission-fixed"
              type="number"
              min={0}
              max={100}
              step={0.01}
              className={adminFieldClass}
              defaultValue={settings.hotpay_commission_fixed}
              disabled={busy}
              key={`commission_fixed-${settings.hotpay_commission_fixed}`}
              onBlur={(e) => {
                const n = parseFloat(e.target.value);
                if (!Number.isFinite(n) || n < 0) return;
                if (n !== settings.hotpay_commission_fixed) void save({ hotpay_commission_fixed: n });
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.currentTarget.blur();
              }}
            />
          </div>
        </div>

        {(settings.hotpay_commission_pct > 0 || settings.hotpay_commission_fixed > 0) && (
          <p className="mt-4 text-xs leading-relaxed text-emerald-100/80">
            Przykład: przy zaległości <strong className="text-white">50,00 zł</strong> gracz zostanie
            przekierowany do operatora z kwotą{" "}
            <strong className="text-white">
              {formatExampleGross(50, settings.hotpay_commission_pct, settings.hotpay_commission_fixed)} zł
            </strong>
            . Na portfelu zostanie zaksięgowane <strong className="text-white">50,00 zł</strong>. Zawyżenie
            składki meczu (zaokrąglenie w górę do 0,50 zł) jest odejmowane od prowizji — gracz płaci mniej, gdy
            składka była podniesiona względem dokładnego podziału wynajmu.
          </p>
        )}
      </AdminCard>

      <div className="mt-6">
        <AdminHotpayConfirmPanel />
      </div>
    </div>
  );
}

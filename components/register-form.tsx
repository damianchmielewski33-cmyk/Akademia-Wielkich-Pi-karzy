"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RegisterForm({ availablePlayers }: { availablePlayers: string[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zawodnik, setZawodnik] = useState("");
  const [autoLogin, setAutoLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          zawodnik,
          auto_login: autoLogin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Błąd rejestracji");
        return;
      }
      if (data.logged_in) {
        toast.success("Konto utworzone — jesteś zalogowany");
        router.push("/");
        router.refresh();
      } else {
        toast.success("Konto utworzone — zaloguj się");
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="reg_fn">Imię</Label>
        <Input
          id="reg_fn"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Imię"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="reg_ln">Nazwisko</Label>
        <Input
          id="reg_ln"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Nazwisko"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Piłkarz (awatar)</Label>
        <Select required value={zawodnik} onValueChange={setZawodnik}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="Wybierz swojego piłkarza" />
          </SelectTrigger>
          <SelectContent>
            {availablePlayers.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-start gap-3 pt-1">
        <input
          id="reg_auto_login"
          type="checkbox"
          checked={autoLogin}
          onChange={(e) => setAutoLogin(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border border-zinc-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/30"
        />
        <Label htmlFor="reg_auto_login" className="cursor-pointer font-normal leading-snug text-zinc-700">
          Zaloguj mnie automatycznie po rejestracji
        </Label>
      </div>
      <Button type="submit" className="w-full" disabled={loading || availablePlayers.length === 0}>
        {loading ? "Tworzenie…" : "Załóż konto"}
      </Button>
      {availablePlayers.length === 0 && (
        <p className="text-center text-sm text-red-600">Wszyscy piłkarze są już zajęci.</p>
      )}
    </form>
  );
}

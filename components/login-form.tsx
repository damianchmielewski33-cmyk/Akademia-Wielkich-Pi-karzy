"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AuthGoalPreloader,
  AUTH_SUCCESS_PRELOADER_DELAY_MS,
} from "@/components/auth-goal-preloader";
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

export function LoginForm({ aliases, nextPath }: { aliases: string[]; nextPath: string }) {
  const router = useRouter();
  const next = nextPath || "/";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zawodnik, setZawodnik] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGoalPreloader, setShowGoalPreloader] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          zawodnik,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Błąd logowania");
        return;
      }
      setShowGoalPreloader(true);
      toast.success("Zalogowano");
      await new Promise((r) => setTimeout(r, AUTH_SUCCESS_PRELOADER_DELAY_MS));
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showGoalPreloader && (
        <AuthGoalPreloader label="Cel! Zabieramy Cię na boisko…" />
      )}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <Label htmlFor="first_name">Imię</Label>
        <Input
          id="first_name"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Wpisz imię"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="last_name">Nazwisko</Label>
        <Input
          id="last_name"
          required
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Wpisz nazwisko"
          className="mt-1"
        />
      </div>
      <div>
        <Label>Wybierz zawodnika</Label>
        <Select required value={zawodnik} onValueChange={setZawodnik}>
          <SelectTrigger className="mt-1 w-full">
            <SelectValue placeholder="-- wybierz zawodnika --" />
          </SelectTrigger>
          <SelectContent>
            {aliases.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Logowanie…" : "Zaloguj się"}
      </Button>
    </form>
    </>
  );
}

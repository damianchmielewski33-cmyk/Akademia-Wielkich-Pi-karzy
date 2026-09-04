"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Dumbbell, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { registerUser, sendRegisterCode, type RegisterState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  isTrainerFlowEnabled,
  roleFromSearchParam,
} from "@/lib/auth-role";
import { RoleAuthCards } from "@/components/auth/role-auth-cards";
import {
  activityLevels,
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/register";

const inputClass =
  "min-h-11 border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 focus-visible:border-[var(--mp-teal)] focus-visible:ring-[3px] focus-visible:ring-[var(--mp-teal)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

const activityCopy: Record<
  (typeof activityLevels)[number],
  { label: string; hint: string }
> = {
  low: { label: "Niska", hint: "Biurko / lekkie spacery" },
  medium: { label: "Średnia", hint: "3–5 treningów / tydzień" },
  high: { label: "Wysoka", hint: "Codziennie lub intensywnie" },
};

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trainerEnabled = isTrainerFlowEnabled();
  const roleFromUrl = roleFromSearchParam(searchParams.get("role"));
  const role = trainerEnabled ? roleFromUrl : "zawodnik";
  const [rootError, setRootError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (trainerEnabled) return;
    if (searchParams.get("role") === "trener") {
      const next = new URLSearchParams(searchParams.toString());
      next.set("role", "zawodnik");
      router.replace(`/register?${next.toString()}`);
    }
  }, [trainerEnabled, searchParams, router]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      emailCode: "",
      password: "",
      weightKg: "",
      heightCm: "",
      age: "",
      activityLevel: "medium",
      role: "zawodnik",
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const activityLevel = watch("activityLevel");
  const emailValue = watch("email");
  const emailCodeValue = watch("emailCode");
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    const diffMs = cooldownUntil - Date.now();
    return diffMs > 0 ? Math.ceil(diffMs / 1000) : 0;
  }, [cooldownUntil]);

  useEffect(() => {
    if (!cooldownUntil) return;
    if (cooldownSeconds <= 0) return;
    const t = window.setInterval(() => {
      setCooldownUntil((v) => (v && v > Date.now() ? v : null));
    }, 250);
    return () => window.clearInterval(t);
  }, [cooldownUntil, cooldownSeconds]);

  useEffect(() => {
    const raw = (emailCodeValue ?? "").toString();
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits !== raw) {
      setValue("emailCode", digits, { shouldValidate: digits.length === 6 });
    }
    if (digits.length === 6) {
      queueMicrotask(() => passwordRef.current?.focus());
    }
  }, [emailCodeValue, setValue]);

  async function onSubmit(values: RegisterFormValues) {
    setRootError(null);
    setCodeInfo(null);
    const result: RegisterState = await registerUser(values);
    if (!result.ok) {
      if (result.fieldErrors) {
        for (const [key, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            setError(key as keyof RegisterFormValues, {
              message: messages[0],
            });
          }
        }
      }
      setRootError(result.error);
      return;
    }

    let sign: Awaited<ReturnType<typeof signIn>> | null = null;
    try {
      sign = await signIn("credentials", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
        redirect: false,
        callbackUrl: "/start-workout",
      });
    } catch {
      setRootError(
        "Konto zostało utworzone, ale nie udało się zalogować automatycznie. Zaloguj się ręcznie.",
      );
      return;
    }
    if (!sign?.ok || sign.error) {
      setRootError(
        "Konto zostało utworzone, ale nie udało się zalogować automatycznie. Zaloguj się ręcznie.",
      );
      return;
    }
    window.location.assign(`${window.location.origin}/start-workout`);
  }

  const { ref: passwordRhfRef, ...passwordRegister } = register("password");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-[1.05rem] bg-gradient-to-br from-[var(--mp-teal)]/20 via-teal-100/40 to-transparent opacity-90 blur-[1px]"
      />
      <div className="pitch-card relative overflow-hidden p-6 shadow-md sm:p-8">
        <div className="relative">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
              <Dumbbell className="h-6 w-6 text-[var(--mp-teal)]" strokeWidth={1.75} />
            </div>
            <Link
              href="/"
              className="inline-block rounded-sm font-heading text-2xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="GymBrat — strona główna"
            >
              Gym<span className="text-[var(--mp-teal)]">Brat</span>
            </Link>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-[var(--mp-teal)]/80" />
              Zbuduj swój profil sportowca
            </p>
          </div>

          <RoleAuthCards
            role={role}
            onSelectRole={(next) => {
              if (!trainerEnabled && next === "trener") return;
              const nextParams = new URLSearchParams(searchParams.toString());
              nextParams.set("role", next);
              router.replace(`/register?${nextParams.toString()}`);
            }}
            trainerLocked={!trainerEnabled}
            heading="Tworzysz konto jako"
          />

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
            {rootError ? (
              <p
                id="register-root-error"
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
              >
                {rootError}
              </p>
            ) : null}

            <input type="hidden" {...register("role")} />

            <section
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              aria-labelledby="register-heading-basic"
            >
              <p
                id="register-heading-basic"
                className="pitch-label"
              >
                Dane podstawowe
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-zinc-800 dark:text-zinc-200">
                    Imię
                  </Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    aria-invalid={errors.firstName ? true : undefined}
                    aria-describedby={errors.firstName ? "register-error-firstName" : undefined}
                    className={cn(inputClass, errors.firstName && "border-destructive")}
                    {...register("firstName")}
                  />
                  {errors.firstName ? (
                    <p id="register-error-firstName" className="text-xs text-red-700 dark:text-red-300">
                      {errors.firstName.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-zinc-800 dark:text-zinc-200">
                    Nazwisko
                  </Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    aria-invalid={errors.lastName ? true : undefined}
                    aria-describedby={errors.lastName ? "register-error-lastName" : undefined}
                    className={cn(inputClass, errors.lastName && "border-destructive")}
                    {...register("lastName")}
                  />
                  {errors.lastName ? (
                    <p id="register-error-lastName" className="text-xs text-red-700 dark:text-red-300">
                      {errors.lastName.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-800 dark:text-zinc-200">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "register-error-email" : undefined}
                  className={cn(inputClass, errors.email && "border-destructive")}
                  {...register("email")}
                />
                {errors.email ? (
                  <p id="register-error-email" className="text-xs text-red-700 dark:text-red-300">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label htmlFor="emailCode" className="text-zinc-800 dark:text-zinc-200">
                      Kod z e-maila
                    </Label>
                    <Input
                      id="emailCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      aria-invalid={errors.emailCode ? true : undefined}
                      aria-describedby={
                        [codeInfo ? "register-code-info" : "", errors.emailCode ? "register-error-emailCode" : ""]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                      className={cn(inputClass, errors.emailCode && "border-destructive")}
                      {...register("emailCode")}
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={sendingCode || !emailValue?.trim() || cooldownSeconds > 0}
                    aria-busy={sendingCode}
                    className="h-11 min-h-11 shrink-0"
                    onClick={async () => {
                      setRootError(null);
                      setCodeInfo(null);
                      const email = (emailValue ?? "").trim().toLowerCase();
                      if (!email) {
                        setRootError("Wpisz e-mail, aby wysłać kod.");
                        return;
                      }
                      setSendingCode(true);
                      try {
                        const res = await sendRegisterCode({ email });
                        if (!res.ok) {
                          setRootError(res.error);
                          return;
                        }
                        setCodeInfo("Kod wysłany. Sprawdź skrzynkę (oraz SPAM) i wpisz 6 cyfr.");
                        setCooldownUntil(Date.now() + 60_000);
                      } catch {
                        setRootError(
                          "Nie udało się wysłać kodu. Sprawdź SMTP w Vercel (SMTP_HOST, SMTP_USER, SMTP_PASS) i ewentualnie hasło aplikacji Gmail / MFA w Outlook.",
                        );
                      } finally {
                        setSendingCode(false);
                      }
                    }}
                  >
                    {sendingCode
                      ? "Wysyłanie…"
                      : cooldownSeconds > 0
                        ? `Wyślij ponownie (${cooldownSeconds}s)`
                        : "Wyślij kod"}
                  </Button>
                </div>
                {codeInfo ? (
                  <p id="register-code-info" role="status" aria-live="polite" className="text-xs text-zinc-500">
                    {codeInfo}
                  </p>
                ) : null}
                {errors.emailCode ? (
                  <p id="register-error-emailCode" className="text-xs text-red-700 dark:text-red-300">
                    {errors.emailCode.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-800 dark:text-zinc-200">
                  Hasło
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.password ? true : undefined}
                  aria-describedby={errors.password ? "register-error-password" : undefined}
                  ref={(el) => {
                    passwordRef.current = el;
                    passwordRhfRef(el);
                  }}
                  className={cn(inputClass, errors.password && "border-destructive")}
                  {...passwordRegister}
                />
                {errors.password ? (
                  <p id="register-error-password" className="text-xs text-red-700 dark:text-red-300">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>
            </section>

            <section
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              aria-labelledby="register-heading-body"
            >
              <p
                id="register-heading-body"
                className="pitch-label"
              >
                Parametry ciała
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="weightKg" className="text-zinc-800 dark:text-zinc-200">
                    Waga (kg)
                  </Label>
                  <Input
                    id="weightKg"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={30}
                    max={400}
                    aria-invalid={errors.weightKg ? true : undefined}
                    aria-describedby={errors.weightKg ? "register-error-weightKg" : undefined}
                    className={cn(inputClass, errors.weightKg && "border-destructive")}
                    {...register("weightKg")}
                  />
                  {errors.weightKg ? (
                    <p id="register-error-weightKg" className="text-xs text-red-700 dark:text-red-300">
                      {errors.weightKg.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heightCm" className="text-zinc-800 dark:text-zinc-200">
                    Wzrost (cm)
                  </Label>
                  <Input
                    id="heightCm"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    min={100}
                    max={250}
                    aria-invalid={errors.heightCm ? true : undefined}
                    aria-describedby={errors.heightCm ? "register-error-heightCm" : undefined}
                    className={cn(inputClass, errors.heightCm && "border-destructive")}
                    {...register("heightCm")}
                  />
                  {errors.heightCm ? (
                    <p id="register-error-heightCm" className="text-xs text-red-700 dark:text-red-300">
                      {errors.heightCm.message}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-zinc-800 dark:text-zinc-200">
                    Wiek
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    min={13}
                    max={120}
                    aria-invalid={errors.age ? true : undefined}
                    aria-describedby={errors.age ? "register-error-age" : undefined}
                    className={cn(inputClass, errors.age && "border-destructive")}
                    {...register("age")}
                  />
                  {errors.age ? (
                    <p id="register-error-age" className="text-xs text-red-700 dark:text-red-300">
                      {errors.age.message}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section
              className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
              aria-labelledby="register-heading-activity"
            >
              <p
                id="register-heading-activity"
                className="pitch-label"
              >
                Poziom aktywności
              </p>
              <div
                className="grid gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-labelledby="register-heading-activity"
                aria-describedby={
                  errors.activityLevel ? "register-error-activityLevel" : undefined
                }
              >
                {activityLevels.map((level) => {
                  const active = activityLevel === level;
                  const { label, hint } = activityCopy[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setValue("activityLevel", level, { shouldValidate: true })}
                      className={cn(
                        "min-h-[3.25rem] rounded-xl border px-3 py-3 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        active
                          ? "border-[var(--mp-teal)] bg-teal-50 shadow-sm dark:bg-teal-950/40"
                          : "border-zinc-200 bg-white hover:border-teal-200 hover:bg-teal-50/60 dark:border-zinc-700 dark:bg-zinc-950",
                      )}
                    >
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          active ? "text-zinc-950 dark:text-white" : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
                    </button>
                  );
                })}
              </div>
              <input type="hidden" {...register("activityLevel")} />
              {errors.activityLevel ? (
                <p id="register-error-activityLevel" className="text-xs text-red-700 dark:text-red-300">
                  {errors.activityLevel.message}
                </p>
              ) : null}
            </section>

            <Button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="h-11 min-h-11 w-full text-base"
            >
              {isSubmitting ? "Tworzenie profilu…" : "Utwórz konto i trenuj"}
            </Button>
            <p className="text-center text-sm text-zinc-500">
              Masz już konto?{" "}
              <Link
                href="/login?role=zawodnik"
                className="rounded-sm text-[var(--mp-teal)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Zaloguj się
              </Link>
            </p>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

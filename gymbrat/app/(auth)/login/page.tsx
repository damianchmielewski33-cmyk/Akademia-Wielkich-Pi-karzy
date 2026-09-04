import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AwpCrossLink } from "@/components/awp-cross-link";

export default function LoginPage() {
  return (
    <div className="pitch-card p-8 shadow-md">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="awp-focus-ring inline-block rounded-sm font-heading text-2xl font-bold tracking-tight text-zinc-950 dark:text-white"
          aria-label="GymBrat — strona główna"
        >
          Gym<span className="text-[var(--mp-teal)]">Brat</span>
        </Link>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Zaloguj się do swojego centrum treningowego
        </p>
      </div>
      <Suspense fallback={<div className="text-sm text-zinc-500">Ładowanie…</div>}>
        <LoginForm />
      </Suspense>
      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Siostrzana aplikacja
        </p>
        <AwpCrossLink variant="banner" />
      </div>
    </div>
  );
}

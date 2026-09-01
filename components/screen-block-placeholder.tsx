import Link from "next/link";
import { Construction, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mpSectionCardClass } from "@/components/marketplace-section";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  message: string;
};

export function ScreenBlockPlaceholder({ title, message }: Props) {
  return (
    <div className="awp-page awp-page--default flex flex-1 flex-col px-3 py-10 xs:px-4 sm:py-14">
      <PitchPageHero title={title} subtitle="Sekcja tymczasowo niedostępna" align="center" />
      <div className={cn(mpSectionCardClass, "mx-auto mt-8 w-full max-w-lg p-6 text-center sm:p-8")}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--mp-teal)] text-white shadow-sm">
          <Construction className="h-7 w-7" aria-hidden />
        </div>
        <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-300 sm:text-lg">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full font-bold">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden />
              Wróć na start
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full font-bold">
            <Link href="/kontakt">Kontakt z organizacją</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

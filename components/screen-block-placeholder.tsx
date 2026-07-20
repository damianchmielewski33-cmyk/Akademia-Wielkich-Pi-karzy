import Link from "next/link";
import { Construction, Home } from "lucide-react";
import { PitchPageHero } from "@/components/ui/pitch-card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  message: string;
};

export function ScreenBlockPlaceholder({ title, message }: Props) {
  return (
    <div className="container mx-auto flex max-w-2xl flex-1 flex-col px-4 py-10 sm:py-14">
      <PitchPageHero title={title} subtitle="Sekcja tymczasowo niedostępna" align="center" />
      <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl border border-white/30 bg-black/15 p-6 text-center shadow-lg backdrop-blur-sm sm:p-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-400/40">
          <Construction className="h-7 w-7 text-amber-200" aria-hidden />
        </div>
        <p className="text-base leading-relaxed text-emerald-50/95 sm:text-lg">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild variant="stadium">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" aria-hidden />
              Wróć na start
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-white/30 bg-black/10 text-white hover:bg-white/10">
            <Link href="/kontakt">Kontakt z organizacją</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

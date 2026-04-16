import Image from "next/image";
import { SITE_NAME } from "@/lib/site";

/** Herb z wysokiej rozdzielczości — ekran początkowego ładowania (np. wejście z wyszukiwarki). */
export function BrandCrestPreloader() {
  return (
    <div className="flex w-full justify-center px-2">
      <Image
        src="/logo-akademia-crest.png"
        alt={SITE_NAME}
        width={960}
        height={960}
        priority
        className="h-auto max-h-[min(72dvh,36rem)] w-auto max-w-full object-contain object-center [image-rendering:auto]"
        sizes="(max-width: 640px) 92vw, 520px"
      />
    </div>
  );
}

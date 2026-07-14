import type { ImageUploadSpec } from "@/lib/image-upload-specs";
import { cn } from "@/lib/utils";

export function ImageUploadSpecDetails({
  spec,
  className,
  compact,
}: {
  spec: ImageUploadSpec;
  className?: string;
  compact?: boolean;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Gdzie widać", value: spec.whereUsed },
    { label: "Rozmiar na stronie", value: spec.displayOnSite },
    { label: "Wgraj plik", value: spec.recommendedPixels },
    { label: "Proporcje", value: spec.aspectRatio },
    { label: "Formaty", value: spec.formats },
    { label: "Maks. rozmiar", value: spec.maxFileSize },
  ];

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-300/25 bg-emerald-950/25 px-3 py-3 text-sm",
        compact ? "space-y-1.5" : "space-y-2",
        className
      )}
    >
      {!compact ? (
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200/80">Wymagany rozmiar</p>
      ) : null}
      <dl className={cn("grid gap-1.5", compact ? "gap-1" : "sm:grid-cols-2 sm:gap-x-4")}>
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-100/55">{row.label}</dt>
            <dd className="mt-0.5 text-emerald-50/95">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-white/10 pt-2 text-xs leading-relaxed text-emerald-100/75">
        <span className="font-semibold text-emerald-100/90">Wskazówka: </span>
        {spec.fillTip}
      </p>
    </div>
  );
}

export function AdminImageSpecsTable({ specs }: { specs: ImageUploadSpec[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/20 bg-black/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/15 bg-black/15 text-xs uppercase tracking-wide text-emerald-100/70">
            <th className="px-3 py-2.5 font-semibold">Pole</th>
            <th className="px-3 py-2.5 font-semibold">Wgraj (px)</th>
            <th className="px-3 py-2.5 font-semibold">Proporcje</th>
            <th className="px-3 py-2.5 font-semibold">Na stronie</th>
            <th className="px-3 py-2.5 font-semibold">Max</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.label} className="border-b border-white/10 last:border-0">
              <td className="px-3 py-2.5 align-top">
                <p className="font-semibold text-white">{spec.label}</p>
                <p className="mt-0.5 text-xs text-emerald-100/60">{spec.whereUsed}</p>
              </td>
              <td className="px-3 py-2.5 align-top tabular-nums text-emerald-50/95">{spec.recommendedPixels}</td>
              <td className="px-3 py-2.5 align-top text-emerald-50/95">{spec.aspectRatio}</td>
              <td className="px-3 py-2.5 align-top text-emerald-100/80">{spec.displayOnSite}</td>
              <td className="px-3 py-2.5 align-top text-emerald-100/80">{spec.maxFileSize}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

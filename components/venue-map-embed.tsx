type Props = {
  address: string;
  city: string;
};

export function googleMapsQuery(address: string, city: string) {
  return `${address}, ${city}`.trim();
}

export function VenueMapEmbed({ address, city }: Props) {
  const query = encodeURIComponent(googleMapsQuery(address, city));
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <iframe
        title={`Mapa: ${address}, ${city}`}
        src={`https://maps.google.com/maps?q=${query}&hl=pl&z=16&output=embed`}
        className="h-64 w-full border-0 sm:h-80"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="px-5 py-3">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${query}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-semibold text-[var(--mp-teal-dark)] underline underline-offset-2"
        >
          Otwórz w Mapach Google
        </a>
      </div>
    </section>
  );
}

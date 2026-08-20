import type { AppDb } from "@/lib/db";
import { addPitchBlock, addPitchPriceRule, replaceVenuePhotos, slugifyVenueName } from "@/lib/booking";

type DemoPitch = {
  name: string;
  surface: string;
  players: number;
  indoor: number;
  lighting: number;
  base_price_pln: number;
  slot_minutes: number;
  opens_at: string;
  closes_at: string;
  weekend_price_pln?: number;
  peak_price_pln?: number;
  peak_start?: string;
  peak_end?: string;
};

type DemoVenue = {
  name: string;
  city: string;
  address: string;
  description: string;
  phone: string;
  photos: string[];
  pitches: DemoPitch[];
};

const DEMO_VENUES: DemoVenue[] = [
  {
    name: "Orlik Mokotów",
    city: "Warszawa",
    address: "ul. Racławicka 99",
    description: "Sztuczna murawa z oświetleniem, szatnie i parking przy kompleksie. Rezerwacja godzinowa online.",
    phone: "22 000 11 22",
    photos: [
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko główne",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 180,
        slot_minutes: 60,
        opens_at: "08:00",
        closes_at: "22:00",
        weekend_price_pln: 220,
        peak_price_pln: 200,
        peak_start: "17:00",
        peak_end: "21:00",
      },
    ],
  },
  {
    name: "Hala Sportowa Nowa Huta",
    city: "Kraków",
    address: "os. Zgody 7",
    description: "Kryta hala z parkietem, trybunami i szatniami. Dobry wybór na treningi i ligę amatorską.",
    phone: "12 000 33 44",
    photos: [
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Hala A",
        surface: "parkiet",
        players: 10,
        indoor: 1,
        lighting: 1,
        base_price_pln: 250,
        slot_minutes: 60,
        opens_at: "16:00",
        closes_at: "23:00",
        weekend_price_pln: 280,
      },
    ],
  },
  {
    name: "Boisko Ołtaszyn",
    city: "Wrocław",
    address: "ul. Bardzka 2",
    description: "Otwarte boisko ze sztuczną nawierzchnią i oświetleniem. Cennik godzinowy, blokady techniczne w kalendarzu.",
    phone: "71 000 55 66",
    photos: [
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko 5-osobowe",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 160,
        slot_minutes: 60,
        opens_at: "09:00",
        closes_at: "21:00",
        weekend_price_pln: 190,
      },
    ],
  },
  {
    name: "Orlik Ursynów",
    city: "Warszawa",
    address: "ul. Pileckiego 61",
    description: "Oświetlony orlik, szatnie, parking. Cennik godzinowy, rezerwacja od ręki.",
    phone: "22 000 22 11",
    photos: [
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko główne",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 170,
        slot_minutes: 60,
        opens_at: "08:00",
        closes_at: "22:00",
        weekend_price_pln: 200,
        peak_price_pln: 190,
        peak_start: "17:00",
        peak_end: "21:00",
      },
    ],
  },
  {
    name: "Hala Bemowo",
    city: "Warszawa",
    address: "ul. Powstańców Śląskich 67",
    description: "Kryta hala z oświetleniem LED, szatnie i trybuny. Dobry wybór na ligę amatorską.",
    phone: "22 000 33 22",
    photos: [
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Hala 1",
        surface: "parkiet",
        players: 10,
        indoor: 1,
        lighting: 1,
        base_price_pln: 240,
        slot_minutes: 60,
        opens_at: "16:00",
        closes_at: "23:00",
        weekend_price_pln: 270,
      },
    ],
  },
  {
    name: "Orlik Wola",
    city: "Warszawa",
    address: "ul. Redutowa 9",
    description: "Otwarte boisko ze sztuczną murawą i oświetleniem. Parking przy kompleksie.",
    phone: "22 000 44 33",
    photos: [
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko A",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 165,
        slot_minutes: 60,
        opens_at: "08:00",
        closes_at: "22:00",
        weekend_price_pln: 195,
      },
    ],
  },
  {
    name: "Orlik Praga Południe",
    city: "Warszawa",
    address: "ul. Grochowska 272",
    description: "Kompleks z dwoma slotami, oświetlenie, szatnie. Rezerwacja godzinowa.",
    phone: "22 000 55 44",
    photos: [
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko 1",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 175,
        slot_minutes: 60,
        opens_at: "09:00",
        closes_at: "22:00",
        weekend_price_pln: 210,
        peak_price_pln: 195,
        peak_start: "17:00",
        peak_end: "21:00",
      },
    ],
  },
  {
    name: "Hala Targówek",
    city: "Warszawa",
    address: "ul. Św. Wincentego 82",
    description: "Hala kryta, parkiet, oświetlenie, szatnie. Stabilna temperatura przez cały rok.",
    phone: "22 000 66 55",
    photos: [
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Hala główna",
        surface: "parkiet",
        players: 10,
        indoor: 1,
        lighting: 1,
        base_price_pln: 230,
        slot_minutes: 60,
        opens_at: "15:00",
        closes_at: "23:00",
        weekend_price_pln: 260,
      },
    ],
  },
  {
    name: "Orlik Białołęka",
    city: "Warszawa",
    address: "ul. Światowida 61",
    description: "Sztuczna trawa, oświetlenie, parking. Cena od wieczoru wyższa w szczycie.",
    phone: "22 000 77 66",
    photos: [
      "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko oświetlone",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 155,
        slot_minutes: 60,
        opens_at: "08:00",
        closes_at: "22:00",
        weekend_price_pln: 185,
        peak_price_pln: 175,
        peak_start: "17:00",
        peak_end: "21:00",
      },
    ],
  },
  {
    name: "Orlik Mokotów Południe",
    city: "Warszawa",
    address: "ul. Woronicza 82",
    description: "Dwa boiska orlik, oświetlenie, szatnie. Rezerwacja slotu 60 min.",
    phone: "22 000 88 77",
    photos: [
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1600&q=80",
    ],
    pitches: [
      {
        name: "Boisko 2",
        surface: "sztuczna trawa",
        players: 10,
        indoor: 0,
        lighting: 1,
        base_price_pln: 180,
        slot_minutes: 60,
        opens_at: "08:00",
        closes_at: "22:00",
        weekend_price_pln: 215,
      },
    ],
  },
];

export async function seedBookingCatalogIfEmpty(db: AppDb): Promise<void> {
  const existing = await db.prepare("SELECT COUNT(*) AS n FROM venues").get<{ n: number }>();
  if ((existing?.n ?? 0) > 0) return;
  for (const venue of DEMO_VENUES) {
    const slug = slugifyVenueName(venue.name);
    const exists = await db.prepare("SELECT id FROM venues WHERE slug = ?").get<{ id: number }>(slug);
    if (exists) continue;

    const inserted = await db
      .prepare(
        `INSERT INTO venues (name, slug, city, address, description, phone, photo_url, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .run(
        venue.name,
        slug,
        venue.city,
        venue.address,
        venue.description,
        venue.phone,
        venue.photos[0] ?? null
      );
    const venueId = Number(inserted.lastInsertRowid);
    await replaceVenuePhotos(db, venueId, venue.photos);

    for (const pitch of venue.pitches) {
      const pitchInsert = await db
        .prepare(
          `INSERT INTO pitches
            (venue_id, name, surface, players, indoor, lighting, amenities, base_price_pln, slot_minutes, active)
           VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)`
        )
        .run(
          venueId,
          pitch.name,
          pitch.surface,
          pitch.players,
          pitch.indoor,
          pitch.lighting,
          pitch.base_price_pln,
          pitch.slot_minutes
        );
      const pitchId = Number(pitchInsert.lastInsertRowid);
      for (let weekday = 0; weekday <= 6; weekday++) {
        await db
          .prepare(
            `INSERT INTO pitch_opening_hours (pitch_id, weekday, opens_at, closes_at)
             VALUES (?, ?, ?, ?)`
          )
          .run(pitchId, weekday, pitch.opens_at, pitch.closes_at);
      }
      if (pitch.weekend_price_pln) {
        await addPitchPriceRule(db, { pitchId, weekday: 0, pricePln: pitch.weekend_price_pln, label: "Weekend" });
        await addPitchPriceRule(db, { pitchId, weekday: 6, pricePln: pitch.weekend_price_pln, label: "Weekend" });
      }
      if (pitch.peak_price_pln && pitch.peak_start && pitch.peak_end) {
        await addPitchPriceRule(db, {
          pitchId,
          startTime: pitch.peak_start,
          endTime: pitch.peak_end,
          pricePln: pitch.peak_price_pln,
          label: "Szczyt",
        });
      }
      if (venue.city === "Wrocław") {
        await addPitchBlock(db, {
          pitchId,
          date: "2026-12-24",
          startTime: "18:00",
          endTime: "20:00",
          reason: "Konserwacja murawy",
        });
      }
    }
  }
}


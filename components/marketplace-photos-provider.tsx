"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MARKETPLACE_PITCH_PHOTOS } from "@/lib/marketplace-photos";

type Ctx = {
  photos: string[];
  customSlots: (string | null)[];
  applyUpdate: (photos: string[], customSlots: (string | null)[]) => void;
};

const MarketplacePhotosContext = createContext<Ctx>({
  photos: [...MARKETPLACE_PITCH_PHOTOS],
  customSlots: Array.from({ length: MARKETPLACE_PITCH_PHOTOS.length }, () => null),
  applyUpdate: () => {},
});

export function MarketplacePhotosProvider({
  photos: initialPhotos,
  customSlots: initialCustom,
  children,
}: {
  photos: string[];
  customSlots: (string | null)[];
  children: ReactNode;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [customSlots, setCustomSlots] = useState(initialCustom);
  const syncKey = `${initialPhotos.join("\n")}\0${initialCustom.map((c) => c ?? "").join("\n")}`;

  useEffect(() => {
    setPhotos(initialPhotos);
    setCustomSlots(initialCustom);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when server payload changes
  }, [syncKey]);

  const applyUpdate = useCallback((nextPhotos: string[], nextCustom: (string | null)[]) => {
    setPhotos(nextPhotos);
    setCustomSlots(nextCustom);
  }, []);

  const value = useMemo(
    () => ({ photos, customSlots, applyUpdate }),
    [photos, customSlots, applyUpdate]
  );

  return (
    <MarketplacePhotosContext.Provider value={value}>{children}</MarketplacePhotosContext.Provider>
  );
}

export function useMarketplacePhotos() {
  return useContext(MarketplacePhotosContext);
}

export function useMarketplacePitchPhotoAt(index: number): string {
  const { photos } = useMarketplacePhotos();
  const n = photos.length || MARKETPLACE_PITCH_PHOTOS.length;
  const i = ((index % n) + n) % n;
  return photos[i] ?? MARKETPLACE_PITCH_PHOTOS[0];
}

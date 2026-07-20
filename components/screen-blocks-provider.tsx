"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import {
  type BlockableScreenKey,
  getScreenBlockEntry,
  hrefMatchesBlockableScreen,
  isScreenDisabledForUser,
  screenBlockMessage,
  type ScreenBlockEntry,
} from "@/lib/screen-blocks";

type ScreenBlocksContextValue = {
  isAdmin: boolean;
  blocks: Record<BlockableScreenKey, ScreenBlockEntry>;
  isHidden: (key: BlockableScreenKey) => boolean;
  isHiddenHref: (href: string) => boolean;
  getMessage: (key: BlockableScreenKey) => string;
};

const ScreenBlocksContext = createContext<ScreenBlocksContextValue | null>(null);

export function ScreenBlocksProvider({
  blocks,
  isAdmin,
  previewAsPlayer = false,
  children,
}: {
  blocks: Record<BlockableScreenKey, ScreenBlockEntry>;
  isAdmin: boolean;
  previewAsPlayer?: boolean;
  children: ReactNode;
}) {
  const effectiveAdmin = isAdmin && !previewAsPlayer;
  const isHidden = useCallback(
    (key: BlockableScreenKey) => isScreenDisabledForUser(blocks, key, effectiveAdmin),
    [blocks, effectiveAdmin]
  );

  const isHiddenHref = useCallback(
    (href: string) => {
      const key = hrefMatchesBlockableScreen(href);
      return key != null && isHidden(key);
    },
    [isHidden]
  );

  const getMessage = useCallback(
    (key: BlockableScreenKey) => screenBlockMessage(blocks, key),
    [blocks]
  );

  return (
    <ScreenBlocksContext.Provider value={{ isAdmin, blocks, isHidden, isHiddenHref, getMessage }}>
      {children}
    </ScreenBlocksContext.Provider>
  );
}

export function useScreenBlocks(): ScreenBlocksContextValue {
  const ctx = useContext(ScreenBlocksContext);
  if (!ctx) {
    return {
      isAdmin: false,
      blocks: {} as Record<BlockableScreenKey, ScreenBlockEntry>,
      isHidden: () => false,
      isHiddenHref: () => false,
      getMessage: () => "",
    };
  }
  return ctx;
}

export function useScreenBlockEntry(key: BlockableScreenKey): ScreenBlockEntry {
  const { blocks } = useScreenBlocks();
  return getScreenBlockEntry(blocks, key);
}

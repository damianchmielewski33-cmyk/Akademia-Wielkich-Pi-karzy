"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PREVIEW_BLOCKED_QUERY_PARAM } from "@/lib/constants";
import { readScreenBlocksPreviewDraft } from "@/lib/screen-block-preview";
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
  const [previewFromUrl, setPreviewFromUrl] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<Record<BlockableScreenKey, ScreenBlockEntry> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get(PREVIEW_BLOCKED_QUERY_PARAM) === "1";
    setPreviewFromUrl(fromUrl);
    if (fromUrl || previewAsPlayer) {
      setDraftBlocks(readScreenBlocksPreviewDraft());
    }
  }, [previewAsPlayer]);

  const effectiveBlocks = useMemo(() => draftBlocks ?? blocks, [draftBlocks, blocks]);
  const inPlayerPreview = previewAsPlayer || previewFromUrl;
  const effectiveAdmin = isAdmin && !inPlayerPreview;

  const isHidden = useCallback(
    (key: BlockableScreenKey) => isScreenDisabledForUser(effectiveBlocks, key, effectiveAdmin),
    [effectiveBlocks, effectiveAdmin]
  );

  const isHiddenHref = useCallback(
    (href: string) => {
      const key = hrefMatchesBlockableScreen(href);
      return key != null && isHidden(key);
    },
    [isHidden]
  );

  const getMessage = useCallback(
    (key: BlockableScreenKey) => screenBlockMessage(effectiveBlocks, key),
    [effectiveBlocks]
  );

  return (
    <ScreenBlocksContext.Provider
      value={{ isAdmin: effectiveAdmin, blocks: effectiveBlocks, isHidden, isHiddenHref, getMessage }}
    >
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

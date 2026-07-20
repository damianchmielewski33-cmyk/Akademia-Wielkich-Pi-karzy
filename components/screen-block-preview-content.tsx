"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ScreenBlockPlaceholder } from "@/components/screen-block-placeholder";
import { readScreenBlocksPreviewDraft } from "@/lib/screen-block-preview";
import {
  isScreenDisabledForUser,
  screenBlockMessage,
  type BlockableScreenKey,
} from "@/lib/screen-blocks";

type Props = {
  screenKey: BlockableScreenKey;
  screenTitle: string;
  serverBlocked: boolean;
  serverMessage: string;
  children: ReactNode;
};

/** W trybie podglądu uwzględnia szkic z sessionStorage (zapisany z panelu admina przed otwarciem karty). */
export function ScreenBlockPreviewContent({
  screenKey,
  screenTitle,
  serverBlocked,
  serverMessage,
  children,
}: Props) {
  const [blocked, setBlocked] = useState(serverBlocked);
  const [message, setMessage] = useState(serverMessage);

  useEffect(() => {
    const draft = readScreenBlocksPreviewDraft();
    if (!draft) return;
    setBlocked(isScreenDisabledForUser(draft, screenKey, false));
    setMessage(screenBlockMessage(draft, screenKey));
  }, [screenKey]);

  if (blocked) {
    return <ScreenBlockPlaceholder title={screenTitle} message={message} />;
  }

  return <>{children}</>;
}

"use client";

import { useEffect } from "react";

// Zahl am App-Symbol (Home-Bildschirm, iOS ab 16.4). Ohne Unterstützung still.
export function AppBadge({ anzahl }: { anzahl: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (anzahl > 0) nav.setAppBadge?.(anzahl).catch(() => {});
    else nav.clearAppBadge?.().catch(() => {});
  }, [anzahl]);
  return null;
}

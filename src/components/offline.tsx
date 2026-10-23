"use client";

import { useEffect, useSyncExternalStore } from "react";

function abonnieren(neu: () => void) {
  window.addEventListener("online", neu);
  window.addEventListener("offline", neu);
  return () => {
    window.removeEventListener("online", neu);
    window.removeEventListener("offline", neu);
  };
}

// Registriert den Service Worker (Push, Offline-Stand) und zeigt ohne Netz,
// von wann die angezeigten Daten sind. `stand` ist die Renderzeit der Seite;
// offline liefert der Service Worker die zuletzt geladene Fassung samt Zeit.
export function Offline({ stand }: { stand: string }) {
  const online = useSyncExternalStore(abonnieren, () => navigator.onLine, () => true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
  }, []);

  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-30 bg-orange px-4 pb-1.5 pt-[calc(env(safe-area-inset-top)+6px)] text-center text-[13px] font-semibold text-white">
      Offline. Stand von {stand}
    </div>
  );
}

"use client";

import { abmelden } from "@/app/login/actions";

// Abmelden leert vorher den Offline-Zwischenspeicher, damit auf dem Gerät
// keine Seiten mit Daten liegen bleiben
export function AbmeldenKnopf() {
  async function leeren() {
    try {
      const namen = await caches.keys();
      await Promise.all(namen.map((n) => caches.delete(n)));
    } catch {
      // Ohne Cache-API nichts zu tun
    }
  }
  return (
    <form action={abmelden} onSubmit={leeren}>
      <button type="submit" className="druck w-full px-4 py-3 text-left text-[17px] text-rot">
        Abmelden
      </button>
    </form>
  );
}

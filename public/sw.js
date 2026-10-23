// Service Worker von KB OS: Push-Mitteilungen und Offline-Stand.
// Offline: Seitenaufrufe zuerst aus dem Netz, bei Erfolg zwischengespeichert;
// ohne Netz kommt die zuletzt geladene Fassung (mit Stand-Zeit im Kopf).
// Statische Dateien (_next/static) aus dem Speicher. Schnittstellen nie.
// Nachricht (JSON): { titel, text, url, tag }, siehe src/lib/webpush.ts

const SEITEN = "kb-seiten-v1";
const DATEIEN = "kb-dateien-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const behalten = [SEITEN, DATEIEN];
      for (const name of await caches.keys()) {
        if (!behalten.includes(name)) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const anfrage = event.request;
  if (anfrage.method !== "GET") return;
  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/login") || url.pathname.startsWith("/google/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DATEIEN);
        const treffer = await cache.match(anfrage);
        if (treffer) return treffer;
        const antwort = await fetch(anfrage);
        if (antwort.ok) cache.put(anfrage, antwort.clone());
        return antwort;
      })(),
    );
    return;
  }

  if (anfrage.mode === "navigate") {
    const schluessel = url.origin + url.pathname;
    event.respondWith(
      (async () => {
        const cache = await caches.open(SEITEN);
        try {
          const antwort = await fetch(anfrage);
          // Nur echte Seiten speichern, keine Umleitungen (z. B. zum Login)
          if (antwort.ok && !antwort.redirected) cache.put(schluessel, antwort.clone());
          return antwort;
        } catch (e) {
          const treffer = (await cache.match(schluessel)) || (await cache.match(url.origin + "/"));
          if (treffer) return treffer;
          throw e;
        }
      })(),
    );
  }
});

self.addEventListener("push", (event) => {
  let daten = {};
  try {
    daten = event.data ? event.data.json() : {};
  } catch {
    daten = { text: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(daten.titel || "KB OS", {
      body: daten.text || "",
      icon: "/icons/icon-192.png",
      tag: daten.tag,
      data: { url: daten.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Nur Seiten dieser App öffnen
  const ziel = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  const url = ziel.origin === self.location.origin ? ziel.href : self.location.origin + "/";
  event.waitUntil(
    (async () => {
      const fenster = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const f of fenster) {
        if (new URL(f.url).origin !== self.location.origin) continue;
        await f.focus();
        try {
          await f.navigate(url);
        } catch {
          // Fenster nicht vom Service Worker gesteuert: nur fokussieren
        }
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

"use client";

import { useEffect, useState, useTransition } from "react";
import { aboEntfernen, aboSpeichern, testSenden } from "./aktionen";
import { Knopf, Meldung, Zeile } from "@/components/ui";

type Zustand = "laedt" | "nicht_unterstuetzt" | "nicht_installiert" | "blockiert" | "aus" | "an";

// iPhone/iPad: Push nur in der Homescreen-App (ab iOS 16.4)
function istIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function istInstalliert(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function geraetName(): string {
  const ua = navigator.userAgent;
  const system = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua)
    ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Gerät";
  return `${system}${istInstalliert() ? " (App)" : ""}`;
}

function schluesselBytes(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

// Push auf diesem Gerät ein- und ausschalten, Testnachricht senden.
// Bemerkt auch, wenn iOS das Abo stillschweigend verworfen hat
// (Gerät steht in der Liste, hat aber kein Abo mehr): dann "aus" mit Hinweis.
export function PushSchalter({ vapidPublicKey, endpunkte }: { vapidPublicKey: string; endpunkte: string[] }) {
  const [zustand, setZustand] = useState<Zustand>("laedt");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laeuft, starten] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setZustand(istIos() && !istInstalliert() ? "nicht_installiert" : "nicht_unterstuetzt");
        return;
      }
      if (Notification.permission === "denied") return setZustand("blockiert");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const abo = await reg?.pushManager.getSubscription();
      if (abo && !endpunkte.includes(abo.endpoint)) {
        // Abo im Browser, aber nicht mehr in KB OS: neu einschalten nötig
        setMeldung("Mitteilungen wurden zurückgesetzt. Bitte neu einschalten.");
        setZustand("aus");
        return;
      }
      setZustand(abo ? "an" : "aus");
    })().catch(() => setZustand("nicht_unterstuetzt"));
  }, [endpunkte]);

  const einschalten = () =>
    starten(async () => {
      setMeldung(null);
      try {
        // Muss direkt auf den Tipp folgen (Safari)
        const erlaubnis = await Notification.requestPermission();
        if (erlaubnis !== "granted") {
          setZustand(erlaubnis === "denied" ? "blockiert" : "aus");
          return;
        }
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const reg = await navigator.serviceWorker.ready;
        const abo =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: schluesselBytes(vapidPublicKey),
          }));
        const json = abo.toJSON();
        const antwort = await aboSpeichern({
          endpoint: abo.endpoint,
          p256dh: json.keys?.p256dh ?? "",
          auth: json.keys?.auth ?? "",
          geraet: geraetName(),
        });
        setMeldung(antwort.meldung);
        if (antwort.ok) setZustand("an");
        else await abo.unsubscribe();
      } catch (e) {
        setMeldung(e instanceof Error ? e.message : String(e));
      }
    });

  const ausschalten = () =>
    starten(async () => {
      setMeldung(null);
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const abo = await reg?.pushManager.getSubscription();
        if (abo) {
          const antwort = await aboEntfernen(abo.endpoint);
          await abo.unsubscribe();
          setMeldung(antwort.meldung);
        }
        setZustand("aus");
      } catch (e) {
        setMeldung(e instanceof Error ? e.message : String(e));
      }
    });

  const testen = () =>
    starten(async () => {
      setMeldung(null);
      setMeldung((await testSenden()).meldung);
    });

  return (
    <>
      <Zeile className="justify-between">
        <span>Mitteilungen</span>
        {zustand === "aus" && (
          <Knopf onClick={einschalten} disabled={laeuft} className="h-9 text-[15px]">
            Einschalten
          </Knopf>
        )}
        {zustand === "an" && (
          <Knopf art="leise" onClick={ausschalten} disabled={laeuft} className="h-9 text-[15px]">
            Ausschalten
          </Knopf>
        )}
        {zustand === "laedt" && <span className="text-text-2">…</span>}
      </Zeile>
      {zustand === "nicht_installiert" && (
        <Zeile className="text-[15px] text-text-2">
          Auf dem iPhone gehen Mitteilungen nur in der App: in Safari Teilen, dann Zum Home-Bildschirm.
        </Zeile>
      )}
      {zustand === "nicht_unterstuetzt" && (
        <Zeile className="text-[15px] text-text-2">Dieser Browser unterstützt keine Mitteilungen.</Zeile>
      )}
      {zustand === "blockiert" && (
        <Zeile className="text-[15px] text-text-2">
          Mitteilungen sind blockiert. In den iPhone-Einstellungen unter Mitteilungen für KB OS erlauben.
        </Zeile>
      )}
      {zustand === "an" && (
        <Zeile>
          <button onClick={testen} disabled={laeuft} className="druck text-akzent disabled:opacity-50">
            Testmitteilung senden
          </button>
        </Zeile>
      )}
      {meldung && (
        <Zeile>
          <Meldung art="info">{meldung}</Meldung>
        </Zeile>
      )}
    </>
  );
}

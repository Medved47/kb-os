"use client";

import { useEffect, useRef, useState } from "react";
import { mailDokument } from "@/lib/mail-html";

// Inhalt einer Mail. HTML im abgeschotteten iframe ohne Skripte (sandbox ohne
// allow-scripts, daher darf es dieselbe Herkunft haben, um die Höhe zu messen).
export function MailInhalt({ html, text, externeBilder }: { html: string | null; text: string | null; externeBilder: boolean }) {
  const [bilder, setBilder] = useState(false);
  const rahmen = useRef<HTMLIFrameElement>(null);
  const [hoehe, setHoehe] = useState(300);

  useEffect(() => {
    const f = rahmen.current;
    if (!f) return;
    let beobachter: ResizeObserver | null = null;
    const messen = () => {
      const doc = f.contentDocument;
      if (!doc?.documentElement) return;
      setHoehe(Math.max(120, doc.documentElement.scrollHeight));
      beobachter?.disconnect();
      beobachter = new ResizeObserver(() => setHoehe(Math.max(120, doc.documentElement.scrollHeight)));
      beobachter.observe(doc.body ?? doc.documentElement);
    };
    f.addEventListener("load", messen);
    return () => {
      f.removeEventListener("load", messen);
      beobachter?.disconnect();
    };
  }, [bilder]);

  if (!html) {
    return (
      <div className="karte whitespace-pre-wrap break-words p-4 text-[15px]">{text?.trim() || "Kein lesbarer Inhalt."}</div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {externeBilder && !bilder && (
        <button type="button" onClick={() => setBilder(true)} className="druck self-start px-1 text-[15px] text-akzent">
          Bilder laden
        </button>
      )}
      <iframe
        key={bilder ? "mit" : "ohne"}
        ref={rahmen}
        title="Inhalt der Mail"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        srcDoc={mailDokument(html, bilder)}
        style={{ height: hoehe }}
        className="w-full rounded-[14px] bg-white"
      />
    </div>
  );
}

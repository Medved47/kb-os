import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

// Kleine Bausteine im iOS-Stil, ohne Paket

export function Knopf({
  art = "voll",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { art?: "voll" | "leise" | "rot" }) {
  const stil =
    art === "voll"
      ? "bg-akzent text-white"
      : art === "rot"
        ? "bg-flaeche text-rot"
        : "bg-flaeche-2 text-akzent";
  return (
    <button
      className={`druck h-11 rounded-xl px-4 text-[17px] font-semibold disabled:opacity-50 ${stil} ${className}`}
      {...rest}
    />
  );
}

export function Feld({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-xl bg-flaeche-2 px-3 text-[17px] outline-none placeholder:text-text-3 focus:ring-2 focus:ring-akzent ${className}`}
      {...rest}
    />
  );
}

// Abschnitt mit kleiner Überschrift wie in den iOS-Einstellungen
export function Abschnitt({ titel, children }: { titel?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {titel && <h2 className="px-4 text-[13px] uppercase text-text-2">{titel}</h2>}
      <div className="karte overflow-hidden">{children}</div>
    </section>
  );
}

export function Zeile({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-11 items-center gap-3 px-4 py-3 text-[17px] [&+&]:border-t [&+&]:border-trenner ${className}`}>
      {children}
    </div>
  );
}

// Großer Seitentitel wie in iOS
export function Titel({ titel, unter, rechts }: { titel: string; unter?: string; rechts?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
      <div>
        {unter && <p className="text-[13px] font-semibold uppercase text-text-2">{unter}</p>}
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{titel}</h1>
      </div>
      {rechts}
    </header>
  );
}

export function Meldung({ children, art = "fehler" }: { children: ReactNode; art?: "fehler" | "info" }) {
  return (
    <p role={art === "fehler" ? "alert" : "status"} className={`text-[15px] ${art === "fehler" ? "text-rot" : "text-text-2"}`}>
      {children}
    </p>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SymbolAufgaben, SymbolGeld, SymbolHeute, SymbolPostfach } from "./symbole";

const REITER = [
  { href: "/", titel: "Heute", Symbol: SymbolHeute },
  { href: "/postfach", titel: "Postfach", Symbol: SymbolPostfach },
  { href: "/aufgaben", titel: "Aufgaben", Symbol: SymbolAufgaben },
  { href: "/geld", titel: "Geld", Symbol: SymbolGeld },
] as const;

function aktiv(pfad: string, href: string): boolean {
  return href === "/" ? pfad === "/" || pfad.startsWith("/einstellungen") : pfad.startsWith(href);
}

// Untere Leiste wie in iOS-Apps
export function TabLeiste() {
  const pfad = usePathname();
  return (
    <nav
      aria-label="Hauptbereiche"
      className="leiste fixed inset-x-0 bottom-0 z-20 border-t border-trenner pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex h-14 max-w-xl">
        {REITER.map(({ href, titel, Symbol }) => {
          const an = aktiv(pfad, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={an ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${an ? "text-akzent" : "text-text-2"}`}
              >
                <Symbol className="size-6" />
                {titel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

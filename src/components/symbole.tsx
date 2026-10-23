// Symbole als SVG (Strichstärke wie SF Symbols), ohne Paket
type P = { className?: string };
const basis = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function SymbolHeute({ className }: P) {
  return (
    <svg {...basis} className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <circle cx="12" cy="14.5" r="2" />
    </svg>
  );
}

export function SymbolPostfach({ className }: P) {
  return (
    <svg {...basis} className={className}>
      <path d="M3.5 13.5 6 5.5h12l2.5 8V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
      <path d="M3.5 13.5H8.5a3.5 3.5 0 0 0 7 0h5" />
    </svg>
  );
}

export function SymbolAufgaben({ className }: P) {
  return (
    <svg {...basis} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.8-5" />
    </svg>
  );
}

export function SymbolGeld({ className }: P) {
  return (
    <svg {...basis} className={className}>
      <rect x="3" y="6" width="18" height="12.5" rx="2.5" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

export function SymbolZahnrad({ className }: P) {
  return (
    <svg {...basis} className={className}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

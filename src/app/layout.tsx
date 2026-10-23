import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KB OS", template: "%s · KB OS" },
  description: "Dein Tag auf einen Blick",
  robots: { index: false, follow: false },
  // Homescreen-App auf dem iPhone (Manifest: src/app/manifest.ts)
  appleWebApp: { capable: true, title: "KB OS", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  // Inhalt bis an den Rand, damit env(safe-area-inset-bottom) die Home-Leiste liefert
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}

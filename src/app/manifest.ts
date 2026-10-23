import type { MetadataRoute } from "next";

// Web-App-Manifest für die Homescreen-App (iPhone: Teilen > Zum Home-Bildschirm).
// Auf dem iPhone funktioniert Push nur in der installierten App.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KB OS",
    short_name: "KB OS",
    description: "Dein Tag auf einen Blick",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    lang: "de",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

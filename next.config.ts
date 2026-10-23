import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Sicherheits-Header für alle Antworten (wie im Business OS)
const SICHERHEITS_HEADER = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Besuchte Seiten 30 s im Browser behalten (schnelles Wechseln der Reiter)
  experimental: {
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: "/:path*", headers: SICHERHEITS_HEADER }];
  },
};

export default nextConfig;

// Cloudflare-Bindings in `next dev` verfügbar machen
initOpenNextCloudflareForDev();

import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Kein R2-Cache: Die App ist dynamisch und hat nur einen Nutzer.
export default defineCloudflareConfig({});

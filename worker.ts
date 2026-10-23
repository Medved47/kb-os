// Eigener Worker-Einstieg (wrangler.jsonc, "main"), wie im Business OS. Leitet
// Anfragen an den von OpenNext erzeugten Worker weiter und ergänzt den Cron:
// Der ruft intern /api/cron auf (ohne Netzwerk, direkt im Worker).

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Wird erst beim Build von OpenNext erzeugt
import { default as openNext } from "./.open-next/worker.js";

type Umgebung = { API_TOKEN?: string } & Record<string, unknown>;
type Kontext = { waitUntil(p: Promise<unknown>): void; passThroughOnException(): void };
type Handler = { fetch(request: Request, env: Umgebung, ctx: Kontext): Promise<Response> };

const handler = openNext as Handler;

const worker = {
  fetch(request: Request, env: Umgebung, ctx: Kontext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },

  async scheduled(controller: { cron: string }, env: Umgebung, ctx: Kontext): Promise<void> {
    const anfrage = new Request(`https://cron.intern/api/cron?cron=${encodeURIComponent(controller.cron)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${(env.API_TOKEN ?? "").trim()}` },
    });
    const antwort = await handler.fetch(anfrage, env, ctx);
    const text = await antwort.text();
    // Fehler werfen, damit Cloudflare den Lauf als fehlgeschlagen zeigt
    if (!antwort.ok) throw new Error(`Cron ${controller.cron}: ${antwort.status} ${text.slice(0, 500)}`);
    console.log(`Cron ${controller.cron}: ${text.slice(0, 500)}`);
  },
};

export default worker;

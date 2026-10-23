// Löst den Pfad-Alias "@/..." (tsconfig) für den Node-Test-Runner auf
// und ergänzt fehlende Endungen (relative Importe, Pakete wie next/cache).
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
      const basis = new URL("../src/", ${JSON.stringify(import.meta.url)});
      export async function resolve(spec, ctx, next) {
        if (spec.startsWith("@/")) {
          const ziel = new URL(spec.slice(2), basis).href;
          for (const endung of [".ts", ".tsx", "/index.ts"]) {
            try { return await next(ziel + endung, ctx); } catch {}
          }
        }
        try {
          return await next(spec, ctx);
        } catch (e) {
          // Pakete ohne "exports" (z. B. next/cache) brauchen die Endung
          // Relative Importe ohne Endung (./schema) auf .ts auflösen
          if (spec.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(spec)) return next(spec + ".ts", ctx);
          if (!spec.startsWith(".") && !spec.endsWith(".js")) return next(spec + ".js", ctx);
          throw e;
        }
      }
    `),
);

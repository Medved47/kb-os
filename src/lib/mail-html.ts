// HTML einer Mail für ein abgeschottetes iframe (srcdoc, sandbox ohne Skripte).
// Eigene CSP davor: keine Skripte, keine Formulare, keine externen Stile oder
// Schriften; externe Bilder (oft Zähl-Pixel) nur, wenn Kevin sie lädt.
// Links öffnen sich in einem neuen Fenster.
export function mailDokument(html: string, bilder: boolean): string {
  const img = bilder ? "img-src https: data: cid:" : "img-src data: cid:";
  const csp = `default-src 'none'; ${img}; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'`;
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<meta name="referrer" content="no-referrer">` +
    `<base target="_blank">` +
    `<style>html,body{margin:0;background:#fff;color:#000}body{padding:12px;font:15px -apple-system,system-ui,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>` +
    `</head><body>${html}</body></html>`
  );
}

// Gibt es externe Bilder, die blockiert werden?
export function hatExterneBilder(html: string): boolean {
  return /<img[^>]+src=["']?https?:/i.test(html) || /url\(\s*["']?https?:/i.test(html);
}

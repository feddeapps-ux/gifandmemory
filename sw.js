/* GIF and Memory · service worker
   · La app (archivos de GitHub) se guarda en el teléfono y se actualiza sola en segundo plano.
   · Nunca toca las llamadas a tu servidor ni a Google: esas siempre van directo a internet. */
const VERSION = "gm-pwa-v3";
const ARCHIVOS = ["go.html","config.js","pwa-shim.js","manifest.webmanifest","icon-192.png","icon-512.png","maskable-512.png","favicon.png","apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;                 // servidor, Google, imágenes de Drive: directo
  e.respondWith(
    caches.open(VERSION).then(async (c) => {
      const guardado = await c.match(r, { ignoreSearch: true });
      const red = fetch(r).then((res) => { if (res && res.ok) c.put(r.mode === "navigate" ? new Request(u.origin + u.pathname) : r, res.clone()); return res; }).catch(() => null);
      if (guardado) { e.waitUntil(red); return guardado; }  // rápido: sirve lo guardado y actualiza detrás
      const res = await red;
      return res || new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    })
  );
});

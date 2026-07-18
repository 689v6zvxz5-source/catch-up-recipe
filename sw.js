const CACHE = "catchup-recipes-v5";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./vendor/supabase.min.js",
  "./src/sync-core.js",
  "./src/supabase-service.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  // อย่ายุ่งกับ API ภายนอก (Supabase ฯลฯ) — ห้าม cache เด็ดขาด ไม่งั้นข้อมูล sync ค้าง
  if (new URL(req.url).origin !== location.origin) return;
  // Network-first for the page so updates land; cache fallback for offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  // Cache-first for everything else (fonts, icons).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => hit))
  );
});

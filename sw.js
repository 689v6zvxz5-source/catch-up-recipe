const CACHE = "catchup-recipes-v6";
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
  // Network-first for EVERYTHING same-origin (page + app JS). Cache-first for app
  // code once caused devices to run stale builds forever — that must never recur.
  // The cache is a fallback for offline only.
  const cacheKey = req.mode === "navigate" ? "./index.html" : req;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(cacheKey, copy));
      }
      return res;
    }).catch(() => caches.match(cacheKey))
  );
});

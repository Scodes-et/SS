/* Short Code Assistant — service worker
   - الصفحة (index.html) بتتحمل من النت الأول (network-first) عشان التحديثات توصل فورًا، والكاش بس للشغل أوفلاين
   - النسخة الجديدة بتشتغل على طول (skipWaiting + clients.claim) من غير ما حد يقفل التطبيق
   غيّر رقم VERSION مع كل رفعة (مش ضروري، بس مفيد لتنضيف الكاش القديم) */
const VERSION = "v12";
const CACHE = "sc-" + VERSION;
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // Firebase / Google fonts / أي طلب خارجي: مفيش تدخل
  if (url.pathname.endsWith("/sw.js")) return;          // ملف الـ SW نفسه دايمًا من النت
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined))
      )
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow("./");
    })
  );
});

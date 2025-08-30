const CACHE = 'milveh-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  // CDN libs (قد تفشل إضافتها بسبب CORS لدى بعض الشبكات لكنها آمنة للمحاولة)
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => (k!==CACHE)? caches.delete(k):null)))
  );
  self.clients.claim();
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (new URL(req.url).origin === location.origin) {
        const clone = res.clone();
        const c = await caches.open(CACHE);
        c.put(req, clone);
      }
      return res;
    } catch (err) {
      return caches.match('./index.html');
    }
  })());
});

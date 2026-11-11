// Service worker: dosyaları önbelleğe alır, internet yokken de açılır.
// Kodu değiştirince SURUM numarasını artır ki kasiyerlerde yenisi yüklensin.
const SURUM = 'odeme-v14';
const DOSYALAR = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png',
  'lucky.js', 'menu.js', 'klavye.js', 'sistemli/index.html', 'sistemli/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(DOSYALAR)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Eski sürüm önbelleklerini sil
  e.waitUntil(
    caches.keys().then((adlar) =>
      Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
  );
  self.clients.claim();
});

// Önce internetten dene (güncel sürüm gelsin), olmazsa önbellekten ver
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((yanit) => {
        const kopya = yanit.clone();
        caches.open(SURUM).then((c) => c.put(e.request, kopya));
        return yanit;
      })
      .catch(() => caches.match(e.request))
  );
});

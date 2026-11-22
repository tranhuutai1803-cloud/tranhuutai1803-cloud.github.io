/* Daruma N3 v6.11 - service worker: keeps a copy of the app so the installed app opens fast, even without network.
   Learning data never passes through here: the app sends it straight to the group's server. */
const V = 'daruma-v6.11', FONTS = 'daruma-fonts';
const BASE = new URL('./', self.location).pathname;
const CORE = ["index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const isPage = u => u.origin === self.location.origin && (u.pathname === BASE || u.pathname === BASE + 'index.html');
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(p => new Request(p, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('daruma-v') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;   // sign-in and progress (POST to the group's server) always go to the network
  const u = new URL(req.url);
  if (req.mode === 'navigate' || isPage(u)) {
    // the page: newest from the network; the saved copy when offline or when the network has not answered in 4 s
    let saved = null;
    const net = fetch(req).then(res => { if (res.ok && isPage(u)) { const cp = res.clone(); saved = caches.open(V).then(c => c.put('index.html', cp)); } return res; });
    e.waitUntil(net.then(() => saved, () => null).catch(() => null));
    e.respondWith(caches.open(V).then(c => c.match('index.html')).then(hit => !hit ? net : new Promise(ok => {
      let done = false; const fin = r => { if (!done) { done = true; ok(r); } };
      net.then(fin, () => fin(hit)); setTimeout(() => fin(hit), 4000);
    })));
    return;
  }
  if (u.origin === self.location.origin) {
    e.respondWith(caches.open(V).then(c => c.match(req, {ignoreSearch: true})).then(hit => hit || fetch(req)));
    return;
  }
  if (u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (u.hostname === 'fonts.googleapis.com') {
    e.respondWith(fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(FONTS).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.open(FONTS).then(c => c.match(req)).then(hit => hit || Response.error())));
  }
});

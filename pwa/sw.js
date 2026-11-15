const CACHE = 'angeldice-20260615-104151';
const PRECACHE = [
    './',
    './index.html',
    './manifest.json',
    './favicon.svg',
    './shared/css/app.css',
    './shared/js/game.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png'
];

self.addEventListener('install', e =>
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    )
);

self.addEventListener('activate', e =>
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    )
);

// Solo se atienden las peticiones GET de este mismo origen; el resto (anuncios,
// analítica) va a la red sin pasar por aquí. Una navegación puede traer query
// (?fbclid=..., ?utm_...): se ignora al buscar en la caché, para que el juego cargue sin
// red también desde un enlace compartido. Los assets se buscan con su URL exacta.
self.addEventListener('fetch', e => {
    const peticion = e.request;
    if (peticion.method !== 'GET') return;
    if (new URL(peticion.url).origin !== self.location.origin) return;
    const opciones = peticion.mode === 'navigate' ? { ignoreSearch: true } : undefined;
    e.respondWith(
        caches.match(peticion, opciones).then(cached => cached || fetch(peticion))
    );
});

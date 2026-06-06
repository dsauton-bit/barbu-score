const CACHE_NAME = 'barbu-score-1.1.9';

const APP_SHELL = [
    '/',
    '/index.html',
    '/style.css',
    '/js/main.js',
    '/js/constants.js',
    '/js/utils.js',
    '/js/storage.js',
    '/js/settings.js',
    '/js/players.js',
    '/js/setup.js',
    '/js/game-engine.js',
    '/js/render-game.js',
    '/js/render-score-input.js',
    '/js/render-history.js',
    '/js/render-about.js',
    '/js/version.js',
    '/js/modals.js',
    '/js/router.js',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Réseau en priorité pour les polices Google
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache en priorité pour les fichiers locaux
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request))
    );
});

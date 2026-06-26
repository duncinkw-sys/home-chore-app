var CACHE_NAME = "chore-app-v1";
var ASSETS = [
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (n) { return n !== CACHE_NAME; })
                    .map(function (n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", function (e) {
    e.respondWith(
        caches.match(e.request).then(function (cached) {
            return cached || fetch(e.request).then(function (response) {
                return caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        }).catch(function () {
            return caches.match("/index.html");
        })
    );
});

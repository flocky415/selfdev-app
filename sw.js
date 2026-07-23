const CACHE = "selfdev-v2"; // зміни v1 на v2

const FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./quotes.js",
    "./manifest.json"
];

self.addEventListener("install", e => {

    e.waitUntil(

        caches.open(CACHE)

        .then(cache => cache.addAll(FILES))

    );

});

self.addEventListener("fetch", e => {

    e.respondWith(

        caches.match(e.request)

        .then(r => r || fetch(e.request))

    );

});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE)
                    .map(key => caches.delete(key))
            )
        )
    );
});
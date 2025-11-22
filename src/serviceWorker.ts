const self2 = self as any as ServiceWorkerGlobalScope; // me when typescript

const cacheName = 'page-' + __VERSION__;

self2.addEventListener('install', (e) => {
    e.waitUntil(new Promise<void>(async (resolve) => {
        const cache = await caches.open(cacheName);
        await cache.addAll([
            '/',
            '/index.html'
            // until I figure out how to get the build output filenames I can't get these ahead of time
        ]);
        self2.skipWaiting(); // idk what this ACTUALLY does and if it'll break things but it's probably fine
        resolve();
    }));
});
self2.addEventListener("activate", (e) => {
    console.debug('ACTIVATE', cacheName);
    e.waitUntil(Promise.all([
        // remove all the old code
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k != cacheName).map((k) => caches.delete(k)))),
        self2.clients.claim()
    ]));
});

async function getCached(req: Request): Promise<Response> {
    const cache = await caches.open(cacheName);
    return fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
    }).catch(async () => {
        // fetch failed, attempt to respond with something
        return await cache.match(req) ?? Response.error();
    });
}
self2.addEventListener("fetch", (e) => {
    if (e.request.method != 'GET') return;
    if (e.request.url.startsWith(self.location.origin)) {
        e.respondWith(getCached(e.request));
    } else {
        try {
            e.respondWith(fetch(e.request));
        } catch (err) {
            console.error(err);
            e.respondWith(Response.error());
        }
    }
});
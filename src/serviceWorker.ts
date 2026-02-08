const self2 = self as any as ServiceWorkerGlobalScope; // me when typescript

const version = __VERSION__;
const cacheName = 'page-' + version;

self2.addEventListener('install', (e) => {
    e.waitUntil(new Promise<void>(async (resolve) => {
        const cache = await caches.open(cacheName);
        await cache.addAll([
            '/',
            '/index.html',
            '/favicon.png',
            '/fonts.css',
            '/SourceCodePro.ttf',
            '/logo.png',
            '/logo-border.png'
            // until I figure out how to get the build output filenames I can't get these ahead of time
        ]);
        self2.skipWaiting(); // idk what this ACTUALLY does and if it'll break things but it's probably fine
        resolve();
    }));
});
self2.addEventListener('activate', (e) => {
    console.debug('ACTIVATE', cacheName);
    e.waitUntil(Promise.all([
        // remove all the old stuff
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k != cacheName).map((k) => caches.delete(k)))),
        self2.clients.claim()
    ]));
    self2.clients.matchAll({ type: 'window' }).then((clients) => {
        // for now, there's only one message type
        // this will probably change if playlists go in the expected direction
        for (const client of clients) client.postMessage(version);
    });
});

let offlineMode = false;
async function getCached(req: Request): Promise<Response> {
    const cache = await caches.open(cacheName);
    if (offlineMode) {
        // use cache immediately and check if online by trying to update cache
        fetch(req).then((res) => {
            if (res.ok) {
                cache.put(req, res.clone());
                offlineMode = false;
                console.debug('Switched to online cache mode');
            }
        }).catch(); // oh well still offline
        return await cache.match(req) ?? Response.error();
    }
    // fetch first and then cache
    return fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
    }).catch(async () => {
        // fetch failed, attempt to respond with something
        offlineMode = true;
        console.debug('Switched to offline cache mode');
        return await cache.match(req) ?? Response.error();
    });
}
self2.addEventListener('fetch', (e) => {
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
/* Offline field notebook and versioned static assets. Personal API responses stay on the network. */
const VERSION = "orman-pwa-db3c346d721f";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE = "/offline.html";
const OFFLINE_ASSETS = ["/offline-app.js", "/offline-app.css", "/favicon.svg", "/brand/orman-emblem.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll([OFFLINE, ...OFFLINE_ASSETS])));
});

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => {
      const previous=keys.filter(key=>key.startsWith("orman-pwa-")&&key.endsWith("-assets")&&key!==ASSETS).slice(-1);
      return Promise.all(keys.filter(key=>key.startsWith("orman-pwa-")&&![SHELL,ASSETS,...previous].includes(key)).map(key=>caches.delete(key)));
    }),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  if (OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(SHELL).then(async cache => (await cache.match(url.pathname)) || fetch(request)));
    return;
  }
  if (!url.pathname.startsWith("/assets/") && !url.pathname.startsWith("/_vinext/fonts/") && !["/favicon.svg", "/brand/orman-emblem.png"].includes(url.pathname)) return;
  event.respondWith(caches.open(ASSETS).then(async cache => {
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request).catch(async()=>{
      if(url.pathname.startsWith("/assets/"))return (await caches.match(request))||Response.error();
      return Response.error();
    });
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      const keys=await cache.keys();
      if(keys.length>80)await cache.delete(keys[0]);
    }
    return response;
  }));
});

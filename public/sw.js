// Saves the app on the device the first time it opens online, so it opens again with no
// internet. Pages try the network first so updates still arrive. Build files have hashed
// names, so a saved copy never goes stale.

const CACHE = "pumzi-v1";
const PAGES = ["/", "/handoff"];
// On a slow connection, the saved page wins after this long.
const NETWORK_WAIT_MS = 3000;

// Saves both pages and every build file listed by /sw-assets, skipping what's already saved.
async function saveApp() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PAGES);
  const list = await fetch("/sw-assets", { cache: "no-store" });
  const files = list.ok ? await list.json() : [];
  await Promise.all(
    files.map(async (file) => {
      if (!(await cache.match(file))) await cache.add(file).catch(() => {});
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(saveApp().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Every page load asks for a refresh, so the files from a new deploy get saved too.
self.addEventListener("message", (event) => {
  if (event.data === "refresh") event.waitUntil(saveApp().catch(() => {}));
});

async function openPage(request) {
  const cache = await caches.open(CACHE);
  const key = new URL(request.url).pathname;
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(key, response.clone());
    return response;
  });
  const saved = await cache.match(key);
  if (!saved) return network;
  const slow = new Promise((resolve) => setTimeout(() => resolve(saved), NETWORK_WAIT_MS));
  return Promise.race([network.catch(() => saved), slow]);
}

async function openBuildFile(request) {
  // Deploys can add a query string to these URLs; the hashed path is what matters.
  const saved = await caches.match(request, { ignoreSearch: true });
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Only this site's own pages and build files. The local AI backend is another origin and
  // is never cached; anything else goes to the network as usual.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") event.respondWith(openPage(request));
  else if (url.pathname.startsWith("/_next/static/")) event.respondWith(openBuildFile(request));
});

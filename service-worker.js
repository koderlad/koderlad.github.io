const CACHE_NAME = "lexilens-v1";

// A list of all the essential files your app needs to run offline.
// This is the "App Shell".
const URLS_TO_CACHE = [
  "/",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  // Local libraries
  "lib/tesseract.min.js",
  "lib/worker.min.js",
  "lib/eng.traineddata.gz",
  // App Icons
  "icons/icon-192x192.png",
  "icons/icon-512x512.png",
];

// --- INSTALL Event ---
// This runs when the service worker is first installed.
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Caching App Shell");
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// --- ACTIVATE Event ---
// This runs after the install event and is used to clean up old caches.
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Service Worker: Clearing old cache", cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// --- FETCH Event ---
// This runs for every network request made by your app.
// It checks the cache first, and if the file isn't there, it fetches from the network.
self.addEventListener("fetch", (event) => {
  console.log("Service Worker: Fetching", event.request.url);
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If the file is in the cache, return it.
      if (response) {
        return response;
      }
      // Otherwise, fetch it from the network.
      return fetch(event.request);
    })
  );
});

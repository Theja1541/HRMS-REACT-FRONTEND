import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const navigationHandler = new NetworkFirst({
  cacheName: 'hrms-pages',
  networkTimeoutSeconds: 5,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
});

registerRoute(
  new NavigationRoute(async (context) => {
    try {
      const response = await navigationHandler.handle(context);
      if (response) return response;
    } catch {
      // Fall through to cached shell / offline page.
    }

    const index = await caches.match('/index.html');
    if (index) return index;

    const offline = await caches.match('/offline.html');
    if (offline) return offline;

    return Response.error();
  }, {
    denylist: [/^\/api/, /^\/uploads/],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'hrms-google-fonts-stylesheets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'hrms-google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

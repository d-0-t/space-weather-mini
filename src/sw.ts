/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  NavigationRoute,
  registerRoute,
} from "workbox-routing";
import {
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";

import {
  SW_NAVIGATE_FALLBACK,
  SW_RUNTIME_ROUTES,
} from "./push/sw-config";
import {
  notificationOptionsFromPayload,
  parsePushPayloadJson,
  type PushPayload,
} from "./push/push-payload";

declare const self: ServiceWorkerGlobalScope & {
  /** Vite's injected precache manifest (injectManifest strategy). */
  __WB_MANIFEST: { revision: string | null; url: string }[];
};

/**
 * The owned service worker (ticket 02): the same offline contract the
 * generated worker carried – precache the shell, answer SPA navigations
 * with it, runtime-cache NOAA data, OVATION JPGs and flags for seven days –
 * plus the two background-alerts handlers the generated worker could never
 * have: push (always a visible notification inside the wait-until chain;
 * silent pushes risk platform revocation) and notification-tap (close, then
 * focus an open window or open the poke's URL).
 */

const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL(SW_NAVIGATE_FALLBACK)),
);

for (const route of SW_RUNTIME_ROUTES) {
  const plugin = new ExpirationPlugin({
    maxEntries: route.expiration.maxEntries,
    maxAgeSeconds: route.expiration.maxAgeSeconds,
  });
  if (route.handler === "StaleWhileRevalidate") {
    registerRoute(
      new RegExp(route.patternSource),
      new StaleWhileRevalidate({ cacheName: route.cacheName, plugins: [plugin] }),
    );
  } else {
    registerRoute(
      new RegExp(route.patternSource),
      new CacheFirst({ cacheName: route.cacheName, plugins: [plugin] }),
    );
  }
}

clientsClaim();
self.skipWaiting();

/** The visible fallback notification when the payload cannot be trusted. */
const GENERIC_POKE: PushPayload = {
  title: "Space weather",
  body: "",
  key: "push:generic",
  url: "/",
  ttlSeconds: 0,
};

self.addEventListener("push", (event) => {
  const parsed = parsePushPayloadJson(event.data?.text());
  const { title, options } = notificationOptionsFromPayload(
    parsed ?? GENERIC_POKE,
  );
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const hit = windows.find((win) => "focus" in win);
      if (hit) {
        await hit.focus();
        // Land the poke somewhere: when the poke's URL differs from the
        // focused window's, navigate that window to it (the alerts view).
        if (new URL(url, hit.url).toString() !== hit.url) {
          await hit.navigate(url);
        }
        return;
      }
      return self.clients.openWindow(url);
    })(),
  );
});

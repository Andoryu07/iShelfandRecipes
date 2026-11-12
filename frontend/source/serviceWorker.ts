/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { texts } from "./translations/cs";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

if (import.meta.env.PROD) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api\//] }));
}

interface ExpirationPayload {
  type: "expiration";
  count: number;
  items: { name: string; daysLeft: number }[];
}

self.addEventListener("push", (event) => {
  const payload = event.data?.json() as ExpirationPayload | undefined;
  if (payload?.type !== "expiration") {
    return;
  }
  const lines = payload.items.map((item) => `${item.name} (${texts.notifications.daysLeft(item.daysLeft)})`);
  const hiddenCount = payload.count - payload.items.length;
  const body =
    hiddenCount > 0 ? `${lines.join(", ")} ${texts.notifications.andMore(hiddenCount)}` : lines.join(", ");
  event.waitUntil(
    self.registration.showNotification(texts.notifications.expirationTitle(payload.count), {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "expiration",
      data: { url: "/stock" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows[0];
      if (existing) {
        return existing.navigate(url).then((client) => client?.focus());
      }
      return self.clients.openWindow(url);
    }),
  );
});

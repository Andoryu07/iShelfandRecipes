/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { storeSharedReceipt, shareTargetPath } from "./receipts/sharedReceipt";
import { texts } from "./translations/cs";

declare const self: ServiceWorkerGlobalScope;

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === shareTargetPath) {
    event.respondWith(receiveSharedReceipt(event.request));
  }
});

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
  const payload = event.data?.json() as ExpirationPayload | { type: "test" } | undefined;
  if (payload?.type === "test") {
    event.waitUntil(
      self.registration.showNotification(texts.notifications.testTitle, {
        body: texts.notifications.testBody,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "test",
        data: { url: "/profile/notifications" },
      }),
    );
    return;
  }
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

async function receiveSharedReceipt(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.getAll("receipt").find((value): value is File => value instanceof File);
    if (file && file.size > 0) {
      await storeSharedReceipt(file);
      return Response.redirect("/receipts?shared=1", 303);
    }
  } catch {
    // Reading the shared content failed; the receipts screen explains it.
  }
  return Response.redirect("/receipts?shared=unsupported", 303);
}

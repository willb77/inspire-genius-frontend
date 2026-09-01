/* eslint-disable no-undef */
/**
 * Push delivery for the Inspire Genius service worker.
 *
 * This file is pulled into the Workbox-generated worker via
 * `workbox.importScripts` in vite.config.ts. It is a SEPARATE file rather
 * than a custom `injectManifest` worker on purpose: switching modes would
 * mean hand-owning the precache manifest, and the precache is exactly what
 * caused the 2026-08-17 classroom outage. Adding a listener via
 * importScripts leaves the generated caching strategy untouched.
 *
 * Without this file the app could subscribe to push and receive nothing:
 * a Workbox-generated worker has no `push` listener at all, so a delivered
 * message is dropped by the browser and — on Chrome — a subscription that
 * never shows a notification eventually gets revoked for violating the
 * userVisibleOnly contract.
 */

self.addEventListener("push", (event) => {
  // A push may legitimately arrive with no body. `userVisibleOnly: true` was
  // promised at subscribe time, so SOMETHING must be shown or the browser
  // penalises the subscription — hence the fallback copy rather than an
  // early return.
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Inspire Genius";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    // Collapses repeats of the same logical notification instead of stacking
    // duplicates when several pushes race.
    tag: payload.tag || "ig-notification",
    renotify: Boolean(payload.tag),
    requireInteraction: Boolean(payload.requireInteraction),
    data: {
      url: payload.url || "/",
      ...(payload.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Prefer focusing a tab that is already on this origin over opening a
      // second one — users end up with a pile of duplicate tabs otherwise.
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && target !== "/") {
            try {
              await client.navigate(target);
            } catch {
              /* cross-origin or unsupported — focus alone is fine */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })(),
  );
});

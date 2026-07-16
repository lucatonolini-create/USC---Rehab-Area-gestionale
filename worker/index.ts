declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "USC Rehab", {
      body: data.body ?? "",
      icon: "/logo.png",
      badge: "/logo.png",
      tag: data.tag ?? "rehab-update",
      data: { url: data.url ?? "/atleti" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    // @ts-ignore
    clients.openWindow(event.notification.data?.url ?? "/atleti")
  );
});

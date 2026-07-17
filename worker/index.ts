declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title: string = data.title ?? "USC Rehab";
  const body: string = data.body ?? "";
  const url: string = data.url ?? "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => c.url.includes(self.location.origin) && "focus" in c
        );
        if (existing) return (existing as WindowClient).focus();
        return self.clients.openWindow(
          (event.notification.data as { url?: string })?.url ?? "/"
        );
      })
  );
});

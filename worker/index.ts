declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Nuovo infortunio", {
      body: data.body ?? "",
      icon: "/logo.png",
      badge: "/logo.png",
      data: { url: data.url ?? "/segnalazioni" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url ?? "/") as string;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if ("focus" in w) return w.focus();
        }
        return self.clients.openWindow(url);
      })
  );
});

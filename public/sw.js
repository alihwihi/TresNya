self.addEventListener("push", (event) => {
  let message = {};
  try {
    message = event.data?.json() || {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(
      message.title || "Kabar baru di TresNya",
      {
        body: message.body || "Pasanganmu memperbarui status.",
        tag: message.id || "partner-status",
        icon: "/icon-192.png",
        data: { url: "/?screen=location" },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate("/?screen=location");
          return client.focus();
        }
      }
      return self.clients.openWindow("/?screen=location");
    })(),
  );
});

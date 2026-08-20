// Service Worker for background notifications and vibration
let backgroundTimerId = null;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "SCHEDULE_TIMER") {
    if (backgroundTimerId) {
      clearTimeout(backgroundTimerId);
      backgroundTimerId = null;
    }
    const soundEnabled = data.soundEnabled !== false;

    const options = {
      body: data.body || "",
      icon: "/favicon.ico",
      tag: data.tag || "sbase-workout-timer",
      renotify: true,
      requireInteraction: true,
      data: { timestamp: Date.now() },
      ...(soundEnabled
        ? { vibrate: [300, 100, 300, 100, 400], silent: false }
        : { vibrate: [], silent: true }),
    };

    if ('showTrigger' in Notification.prototype && data.targetTimestamp) {
      // @ts-expect-error - showTrigger is experimental
      options.showTrigger = new TimestampTrigger(data.targetTimestamp);
      self.registration.showNotification(data.title || "Timer voorbij! ⏱️", options);
    } else {
      const delay = Math.max(0, (data.targetTimestamp || (Date.now() + (data.delay || 0))) - Date.now());
      backgroundTimerId = setTimeout(() => {
        self.registration.showNotification(data.title || "Timer voorbij! ⏱️", options);
        backgroundTimerId = null;
      }, delay);
    }
  } else if (data.type === "CANCEL_TIMER") {
    if (backgroundTimerId) {
      clearTimeout(backgroundTimerId);
      backgroundTimerId = null;
    }
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    }).catch(() => {});
  } else if (data.type === "CLEAR_NOTIFICATIONS") {
    if (backgroundTimerId) {
      clearTimeout(backgroundTimerId);
      backgroundTimerId = null;
    }
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    }).catch(() => {});
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

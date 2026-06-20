self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'New Notice', body: 'You have a new notice.' };
  const options = {
    body: data.body,
    icon: 'icon-192.png',
    badge: 'icon-72.png',
    data: data.url || '/',
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

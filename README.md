# Abundant Life Academy Digital Notice Board

A simple browser-based digital notice board for Abundant Life Academy.

## Features

- Add, edit, and delete notices
- Search notices by title, body, or date
- Persistent storage using browser localStorage
- Responsive layout for desktop and mobile

## Usage

1. Open `index.html` in your browser.
2. Add a new notice using the form.
3. Search and manage notices from the notice board.

## Files

- `index.html` — main page and structure
- `styles.css` — visual styling
- `script.js` — application logic and storage

## Notifications

- The site includes a Service Worker and a simple notification UI. Browsers require HTTPS (or localhost) for Service Worker registration and push subscriptions.
- For real push notifications from a server you will need a push service (VAPID keys) and a backend to send push messages. The current implementation shows local/test notifications from the browser.

## Live Feed

- The Live Feed panel shows recent notices in a scrollable feed. Enable "Live updates" to receive new notices as they are posted.
- The app uses `localStorage` events to synchronize new notices across tabs/windows on the same origin. No server is required for basic cross-tab updates.

## Reminders

- You can set reminders for upcoming events from the Events panel. Click "Set Reminder" and enter the number of minutes before the event to be notified.
- Reminders are stored in `localStorage` and will trigger a notification and a feed entry when due, as long as the site is open in a tab. They will also synchronize across open tabs.
- Limitations: reminders rely on the page being open (or an active service worker with server push). They won't fire if the browser is fully closed; for persistent server-driven reminders, a backend push service is required.

const noticeForm = document.getElementById('noticeForm');
const noticeTitle = document.getElementById('noticeTitle');
const noticeBody = document.getElementById('noticeBody');
const noticeDate = document.getElementById('noticeDate');
const noticeImage = document.getElementById('noticeImage');
const noticeList = document.getElementById('noticeList');
const emptyMessage = document.getElementById('emptyMessage');
const noticeCount = document.getElementById('noticeCount');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const noticeType = document.getElementById('noticeType');
const accessForm = document.getElementById('accessForm');
const accessInput = document.getElementById('accessInput');
const accessMessage = document.getElementById('accessMessage');

const storageKey = 'abundantLifeNoticeBoard';
const authKey = 'abundantLifeBoardAuth';
const accessCode = 'ABUNDANTLIFE2026';
let notices = [];
let editingId = null;
let isAuthorized = false;

function loadNotices() {
  const stored = localStorage.getItem(storageKey);
  notices = stored ? JSON.parse(stored) : [];
}

function saveNotices() {
  localStorage.setItem(storageKey, JSON.stringify(notices));
}

function loadAuthorization() {
  const storedAuth = sessionStorage.getItem(authKey);
  setAuthorization(storedAuth === 'true');
}

function saveAuthorization() {
  if (isAuthorized) {
    sessionStorage.setItem(authKey, 'true');
  } else {
    sessionStorage.removeItem(authKey);
  }
}

function toggleNoticeForm(allowed) {
  const fields = noticeForm.querySelectorAll('input, textarea, button');
  fields.forEach((field) => {
    if (field.closest('form') === noticeForm) {
      field.disabled = !allowed;
    }
  });

  noticeForm.classList.toggle('disabled', !allowed);
}

function setAuthorization(value) {
  isAuthorized = value;
  toggleNoticeForm(value);
  if (value) {
    accessMessage.textContent = 'School staff are authenticated. The notice form is active for posting and editing.';
    accessForm.querySelector('button').textContent = 'Lock Form';
    accessInput.style.display = 'none';
  } else {
    accessMessage.textContent = 'The notice form is visible to parents, but adding or editing notices is restricted to school staff.';
    accessForm.querySelector('button').textContent = 'Unlock Form';
    accessInput.style.display = 'block';
    accessInput.value = '';
  }
  saveAuthorization();
  renderNotices(searchInput.value);
}

function handleAccessSubmit(event) {
  event.preventDefault();
  const value = accessInput.value.trim();
  if (isAuthorized) {
    setAuthorization(false);
    return;
  }
  if (value.toUpperCase() === accessCode) {
    setAuthorization(true);
    accessMessage.textContent = 'Access granted. You may now post or edit school notices.';
  } else {
    accessMessage.textContent = 'Invalid code. Only the school can unlock the posting form.';
    accessInput.focus();
  }
}

function fallbackShare(message) {
  const encoded = encodeURIComponent(`${message}\n\nAbundant Life Academy Notice Board`);
  const whatsappUrl = `https://wa.me/?text=${encoded}`;
  window.open(whatsappUrl, '_blank');
}

function handleShare(notice) {
  const message = `${notice.title}\n${formatDate(notice.date)}\n\n${notice.body}`;
  if (navigator.share) {
    navigator.share({
      title: notice.title,
      text: `${message}\n\nAbundant Life Academy Notice Board`,
      url: window.location.href,
    }).catch(() => fallbackShare(message));
  } else {
    fallbackShare(message);
  }
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createNoticeCard(notice) {
  const card = document.createElement('article');
  card.className = 'notice-card';
  let imageHTML = '';
  if (notice.image) {
    imageHTML = `<img src="${notice.image}" alt="Notice image" class="notice-image" />`;
  }
  const type = notice.type || 'general';
  const badgeLabel = type === 'urgent' ? 'URGENT' : type === 'event' ? 'EVENT' : 'ANNOUNCEMENT';
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;"><span class="notice-badge notice-badge--${type}">${badgeLabel}</span><h3 style="margin:0">${notice.title}</h3></div>
    ${imageHTML}
    <p>${notice.body}</p>
    <div class="notice-meta">
      <span>${formatDate(notice.date)}</span>
      <span>Posted: ${new Date(notice.createdAt).toLocaleString()}</span>
    </div>
    <div class="notice-actions">
      ${isAuthorized ? '<button type="button" class="edit">Edit</button><button type="button" class="delete">Delete</button>' : ''}
      <button type="button" class="share">Share</button>
    </div>
  `;

  if (isAuthorized) {
    card.querySelector('.edit').addEventListener('click', () => startEditing(notice.id));
    card.querySelector('.delete').addEventListener('click', () => deleteNotice(notice.id));
  }
  card.querySelector('.share').addEventListener('click', () => handleShare(notice));

  return card;
}

function renderNotices(filter = '') {
  const normalizedFilter = filter.trim().toLowerCase();
  const typeFilter = filterType ? filterType.value : 'all';
  const filtered = notices.filter((notice) => {
    const title = notice.title.toLowerCase();
    const body = notice.body.toLowerCase();
    const matchesText = title.includes(normalizedFilter) || body.includes(normalizedFilter) || notice.date.includes(normalizedFilter);
    const matchesType = typeFilter === 'all' ? true : (notice.type || 'general') === typeFilter;
    return matchesText && matchesType;
  });

  noticeList.innerHTML = '';
  if (filtered.length === 0) {
    emptyMessage.style.display = 'block';
  } else {
    emptyMessage.style.display = 'none';
    filtered.forEach((notice) => noticeList.appendChild(createNoticeCard(notice)));
  }

  noticeCount.textContent = `${filtered.length} notice${filtered.length === 1 ? '' : 's'}`;
}

function addNotice(event) {
  event.preventDefault();

  const title = noticeTitle.value.trim();
  const body = noticeBody.value.trim();
  const date = noticeDate.value;
  const type = noticeType ? noticeType.value : 'general';
  const imageFile = noticeImage.files[0];

  if (!title || !body || !date) {
    return;
  }

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      createAndSaveNotice(title, body, date, imageData, type);
    };
    reader.readAsDataURL(imageFile);
  } else {
    createAndSaveNotice(title, body, date, null, type);
  }
}

function createAndSaveNotice(title, body, date, imageData, type = 'general') {
  if (editingId) {
    notices = notices.map((notice) =>
      notice.id === editingId
        ? { ...notice, title, body, date, image: imageData || notice.image, type: type || notice.type || 'general', updatedAt: new Date().toISOString() }
        : notice,
    );
    editingId = null;
    noticeForm.querySelector('.button--primary').textContent = 'Add Notice';
  } else {
    notices.unshift({
      id: crypto.randomUUID(),
      title,
      body,
      date,
      image: imageData,
      type: type || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  }

  saveNotices();
  renderNotices(searchInput.value);
  noticeForm.reset();
  noticeImage.value = '';
}

function startEditing(id) {
  const notice = notices.find((item) => item.id === id);
  if (!notice) return;

  editingId = id;
  noticeTitle.value = notice.title;
  noticeBody.value = notice.body;
  noticeDate.value = notice.date;
  if (noticeType) noticeType.value = notice.type || 'general';
  noticeForm.querySelector('.button--primary').textContent = 'Update Notice';
  noticeTitle.focus();
}

function deleteNotice(id) {
  const confirmed = window.confirm('Delete this notice?');
  if (!confirmed) return;

  notices = notices.filter((notice) => notice.id !== id);
  saveNotices();
  renderNotices(searchInput.value);
}

noticeForm.addEventListener('submit', addNotice);
searchInput.addEventListener('input', () => renderNotices(searchInput.value));
accessForm.addEventListener('submit', handleAccessSubmit);

loadAuthorization();
loadNotices();
renderNotices();

// Notification / Service Worker support
const enableNotificationsBtn = document.getElementById('enableNotifications');
const testNotificationBtn = document.getElementById('testNotification');
let swRegistration = null;

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('service-worker.js');
    console.log('Service Worker registered:', swRegistration);
    return swRegistration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

function updateNotificationButtons() {
  const granted = Notification.permission === 'granted';
  if (enableNotificationsBtn) enableNotificationsBtn.textContent = granted ? 'Notifications Enabled' : 'Enable Notifications';
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Notifications are not supported in this browser.');
    return;
  }
  const permission = await Notification.requestPermission();
  updateNotificationButtons();
  if (permission === 'granted' && swRegistration) {
    try {
      swRegistration.showNotification('Notifications enabled', { body: 'You will receive school notices here.' });
    } catch (e) {
      console.warn('showNotification failed:', e);
    }
  }
}

function showTestNotification() {
  const title = 'Test Notice';
  const options = { body: 'This is a test notification from the Saiddohnai Academy board.', data: window.location.href };
  if (swRegistration && swRegistration.showNotification) {
    swRegistration.showNotification(title, options);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  } else {
    alert('Please enable notifications first.');
  }
}

if (enableNotificationsBtn) enableNotificationsBtn.addEventListener('click', requestNotificationPermission);
if (testNotificationBtn) testNotificationBtn.addEventListener('click', showTestNotification);

// Attempt to register service worker on load
registerServiceWorker().then(() => updateNotificationButtons());

// Live Feed support
const liveFeedEl = document.getElementById('liveFeed');
const liveFeedToggle = document.getElementById('liveFeedToggle');
const feedEmpty = document.getElementById('feedEmpty');
const clearFeedBtn = document.getElementById('clearFeed');
let liveFeedEnabled = false;

function renderFeed() {
  if (!liveFeedEl) return;
  liveFeedEl.innerHTML = '';
  if (!notices || notices.length === 0) {
    feedEmpty.style.display = 'block';
    return;
  }
  feedEmpty.style.display = 'none';
  // show most recent first
  const items = notices.slice(0, 50);
  items.forEach((notice) => {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `<div><strong>${notice.title}</strong></div><div>${notice.body}</div><div class="time">${new Date(notice.createdAt).toLocaleString()}</div>`;
    liveFeedEl.appendChild(item);
  });
}

function pushToFeed(notice) {
  if (!liveFeedEl) return;
  feedEmpty.style.display = 'none';
  const item = document.createElement('div');
  item.className = 'feed-item';
  item.innerHTML = `<div><strong>${notice.title}</strong></div><div>${notice.body}</div><div class="time">${new Date(notice.createdAt).toLocaleString()}</div>`;
  liveFeedEl.prepend(item);
  // keep length reasonable
  const children = Array.from(liveFeedEl.children);
  if (children.length > 100) children.slice(100).forEach((c) => c.remove());
}

function onNewNotice(notice) {
  if (liveFeedEnabled) pushToFeed(notice);
  // optionally send a notification for remote listeners
  if (Notification.permission === 'granted' && liveFeedEnabled) {
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(notice.title, { body: notice.body, data: window.location.href });
    } else {
      new Notification(notice.title, { body: notice.body, data: window.location.href });
    }
  }
}

// integrate with createAndSaveNotice: call onNewNotice for newly created notice
const _createAndSaveNotice = createAndSaveNotice;
createAndSaveNotice = function (title, body, date, imageData, type) {
  const isEdit = !!editingId;
  _createAndSaveNotice(title, body, date, imageData, type);
  if (!isEdit) {
    const latest = notices[0];
    onNewNotice(latest);
    // broadcast change for other tabs
    try {
      localStorage.setItem(storageKey + ':lastUpdate', JSON.stringify({ id: latest.id, ts: new Date().toISOString() }));
    } catch (e) {
      // ignore
    }
  }
};

// Clear feed button
if (clearFeedBtn) clearFeedBtn.addEventListener('click', () => {
  if (liveFeedEl) liveFeedEl.innerHTML = '';
  feedEmpty.style.display = 'block';
});

if (liveFeedToggle) {
  liveFeedToggle.addEventListener('change', (e) => {
    liveFeedEnabled = e.target.checked;
    if (liveFeedEnabled) renderFeed();
  });
}

// Listen for storage events (cross-tab sync)
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key === storageKey) {
    try {
      loadNotices();
      renderNotices(searchInput.value);
      if (liveFeedEnabled) renderFeed();
    } catch (err) {
      console.warn('Failed to sync notices from storage event', err);
    }
  }
  if (e.key === storageKey + ':lastUpdate') {
    try {
      const meta = JSON.parse(e.newValue);
      // find the new notice and push to feed
      loadNotices();
      const notice = notices.find((n) => n.id === meta.id);
      if (notice) onNewNotice(notice);
    } catch (err) {
      // ignore parse errors
    }
  }
});

// initial render of feed
renderFeed();

// expose renderFeed for debugging
window._renderFeed = renderFeed;

// Reminders support
const remindersKey = 'abundantLifeReminders';
const remindersListEl = document.getElementById('remindersList');
const remindersEmptyEl = document.getElementById('remindersEmpty');
let reminders = [];

function loadReminders() {
  try {
    const stored = localStorage.getItem(remindersKey);
    reminders = stored ? JSON.parse(stored) : [];
  } catch (e) {
    reminders = [];
  }
}

function saveReminders() {
  try {
    localStorage.setItem(remindersKey, JSON.stringify(reminders));
  } catch (e) {
    console.warn('Failed to save reminders', e);
  }
}

function renderReminders() {
  if (!remindersListEl) return;
  remindersListEl.innerHTML = '';
  if (!reminders || reminders.length === 0) {
    remindersEmptyEl.style.display = 'block';
    return;
  }
  remindersEmptyEl.style.display = 'none';
  const sorted = reminders.slice().sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
  sorted.forEach((r) => {
    const div = document.createElement('div');
    div.className = 'reminder-item';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div><strong>${r.title}</strong></div><div>${new Date(r.remindAt).toLocaleString()}</div>`;
    const actions = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.className = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => {
      reminders = reminders.filter((x) => x.id !== r.id);
      saveReminders();
      renderReminders();
      try { localStorage.setItem(remindersKey + ':lastUpdate', JSON.stringify({ id: r.id, action: 'removed', ts: new Date().toISOString() })); } catch (e) {}
    });
    actions.appendChild(cancel);
    div.appendChild(meta);
    div.appendChild(actions);
    remindersListEl.appendChild(div);
  });
}

function addReminderForEvent(title, eventDateISO, minutesBefore) {
  const eventDate = new Date(eventDateISO);
  if (Number.isNaN(eventDate.getTime())) {
    alert('Invalid event date');
    return;
  }
  const remindAt = new Date(eventDate.getTime() - minutesBefore * 60000);
  const now = new Date();
  if (remindAt <= now) {
    alert('Selected reminder time is in the past. Choose a shorter offset.');
    return;
  }
  const reminder = {
    id: crypto.randomUUID(),
    title,
    eventDate: eventDateISO,
    remindAt: remindAt.toISOString(),
    createdAt: new Date().toISOString(),
    sent: false,
  };
  reminders.push(reminder);
  saveReminders();
  renderReminders();
  try { localStorage.setItem(remindersKey + ':lastUpdate', JSON.stringify({ id: reminder.id, action: 'added', ts: new Date().toISOString() })); } catch (e) {}
}

function sendReminderNotification(reminder) {
  const title = `Reminder: ${reminder.title}`;
  const body = `Event on ${new Date(reminder.eventDate).toLocaleDateString()}`;
  if (Notification.permission === 'granted') {
    if (swRegistration && swRegistration.showNotification) {
      swRegistration.showNotification(title, { body, data: window.location.href });
    } else {
      new Notification(title, { body, data: window.location.href });
    }
  }
  // also push to feed for visibility
  const feedItem = { title: `Reminder: ${reminder.title}`, body, createdAt: new Date().toISOString() };
  pushToFeed(feedItem);
}

function checkReminders() {
  loadReminders();
  const now = new Date();
  let changed = false;
  reminders.forEach((r) => {
    if (!r.sent && new Date(r.remindAt) <= now) {
      r.sent = true;
      sendReminderNotification(r);
      changed = true;
    }
  });
  if (changed) saveReminders();
  renderReminders();
}

// wire set-reminder buttons
function initSetReminderButtons() {
  document.querySelectorAll('.set-reminder').forEach((btn) => {
    btn.addEventListener('click', () => {
      const title = btn.dataset.title || btn.getAttribute('data-title');
      const date = btn.dataset.date || btn.getAttribute('data-date');
      const input = prompt('Enter minutes before event for reminder (e.g. 1440 for 1 day, 60 for 1 hour, 15 for 15 minutes):', '60');
      if (!input) return;
      const minutes = parseInt(input, 10);
      if (Number.isNaN(minutes) || minutes <= 0) {
        alert('Invalid minutes value');
        return;
      }
      addReminderForEvent(title, date, minutes);
    });
  });
}

// storage sync for reminders
window.addEventListener('storage', (e) => {
  if (!e.key) return;
  if (e.key === remindersKey) {
    loadReminders();
    renderReminders();
  }
  if (e.key === remindersKey + ':lastUpdate') {
    // reload and render; checkReminders will handle due items
    loadReminders();
    renderReminders();
  }
});

// initialize reminders on load
loadReminders();
renderReminders();
initSetReminderButtons();
// check reminders every 30 seconds
setInterval(checkReminders, 30 * 1000);
// initial check
checkReminders();

// mark reminders task completed in todo
try { localStorage.setItem('abundantLife:todos', JSON.stringify({ reminders: true })); } catch (e) {}

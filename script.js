const noticeForm = document.getElementById('noticeForm');
const noticeTitle = document.getElementById('noticeTitle');
const noticeBody = document.getElementById('noticeBody');
const noticeDate = document.getElementById('noticeDate');
const noticeImage = document.getElementById('noticeImage');
const noticeList = document.getElementById('noticeList');
const emptyMessage = document.getElementById('emptyMessage');
const noticeCount = document.getElementById('noticeCount');
const searchInput = document.getElementById('searchInput');
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
  card.innerHTML = `
    <h3>${notice.title}</h3>
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
  const filtered = notices.filter((notice) => {
    const title = notice.title.toLowerCase();
    const body = notice.body.toLowerCase();
    return title.includes(normalizedFilter) || body.includes(normalizedFilter) || notice.date.includes(normalizedFilter);
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
  const imageFile = noticeImage.files[0];

  if (!title || !body || !date) {
    return;
  }

  if (imageFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      createAndSaveNotice(title, body, date, imageData);
    };
    reader.readAsDataURL(imageFile);
  } else {
    createAndSaveNotice(title, body, date, null);
  }
}

function createAndSaveNotice(title, body, date, imageData) {
  if (editingId) {
    notices = notices.map((notice) =>
      notice.id === editingId
        ? { ...notice, title, body, date, image: imageData || notice.image, updatedAt: new Date().toISOString() }
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

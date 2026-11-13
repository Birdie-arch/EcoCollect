/**
 * EcoCollect — Global UI Utilities & Shared Component Logic
 * Toast notifications, modal handlers, notifications popover, status badges.
 */

// Toast notification helper
function showToast(title, message, type = 'success', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-check-circle',
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle',
    error: 'fa-times-circle'
  };

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${iconMap[type] || 'fa-bell'}"></i>
    </div>
    <div class="toast-content">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Modal helper functions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on click outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Format status badge HTML
function renderStatusBadge(status) {
  const statusLabels = {
    'REQUESTED': 'Requested',
    'ASSIGNED': 'Collector Assigned',
    'ACCEPTED': 'Accepted',
    'ON_THE_WAY': 'On The Way',
    'ARRIVED': 'Arrived at Doorstep',
    'COLLECTED': 'Weighed & Collected',
    'COMPLETED': 'Completed & Verified',
    'CANCELLED': 'Cancelled',
    'AVAILABLE': 'Available',
    'BUSY': 'On Duty / Busy',
    'OFFLINE': 'Offline'
  };

  const cssClass = (status || '').toLowerCase().replace(/\s+/g, '_');
  const label = statusLabels[status] || status;
  return `<span class="badge badge-${cssClass}">${label}</span>`;
}

// Notifications dropdown controller
function toggleNotifications(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('notif-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
    loadNotificationsList();
  }
}

// Close notifications dropdown when clicking outside
window.addEventListener('click', (e) => {
  const dropdown = document.getElementById('notif-dropdown');
  const btn = document.getElementById('notif-bell-btn');
  if (dropdown && !dropdown.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

function loadNotificationsList() {
  const user = getCurrentUser();
  if (!user) return;

  const notifs = getData(STORAGE_KEYS.NOTIFICATIONS, []);
  // Filter notifications for this user or their role or ALL
  const userNotifs = notifs.filter(n => n.userId === user.id || n.role === user.role || n.role === 'ALL');

  const unreadCount = userNotifs.filter(n => !n.read).length;
  const badgeEl = document.getElementById('notif-count-badge');
  if (badgeEl) {
    badgeEl.textContent = unreadCount;
    badgeEl.style.display = unreadCount > 0 ? 'flex' : 'none';
  }

  const listEl = document.getElementById('notif-items-list');
  if (!listEl) return;

  if (userNotifs.length === 0) {
    listEl.innerHTML = `<li style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No notifications yet.</li>`;
    return;
  }

  listEl.innerHTML = userNotifs.slice(0, 10).map(n => `
    <li class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.link || '#'}')">
      <div class="notif-item-icon">
        <i class="fas ${n.type === 'success' ? 'fa-check' : 'fa-bell'}"></i>
      </div>
      <div class="notif-item-text">
        <h6>${n.title}</h6>
        <p>${n.message}</p>
        <span class="notif-item-time">${formatTimeAgo(n.createdAt)}</span>
      </div>
    </li>
  `).join('');
}

function handleNotifClick(notifId, link) {
  const notifs = getData(STORAGE_KEYS.NOTIFICATIONS, []);
  const idx = notifs.findIndex(n => n.id === notifId);
  if (idx !== -1) {
    notifs[idx].read = true;
    saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
  }
  loadNotificationsList();
  if (link && link !== '#') {
    window.location.href = link;
  }
}

function markAllNotifsRead() {
  const user = getCurrentUser();
  if (!user) return;
  const notifs = getData(STORAGE_KEYS.NOTIFICATIONS, []);
  notifs.forEach(n => {
    if (n.userId === user.id || n.role === user.role || n.role === 'ALL') {
      n.read = true;
    }
  });
  saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
  loadNotificationsList();
  showToast('Notifications', 'All notifications marked as read', 'info');
}

// Relative time formatter
function formatTimeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Mobile sidebar drawer toggle
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (sidebar) sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('show');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadNotificationsList();

  // Bind backdrop click to close sidebar
  const backdrop = document.querySelector('.sidebar-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', toggleSidebar);
  }
});


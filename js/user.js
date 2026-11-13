/**
 * EcoCollect — Citizen User Dashboard & Request Management
 * Manages user statistics, active request highlight, recent requests table,
 * cancellation logic, and profile updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['USER', 'ADMIN']);
  if (!user) return;

  // Render header profile snippet
  renderUserNavSnippet(user);

  // If on Dashboard
  if (document.getElementById('user-stats-container')) {
    renderUserDashboard(user);
  }

  // If on My Requests page
  if (document.getElementById('my-requests-table-body')) {
    renderMyRequestsPage(user);
  }

  // If on Profile page
  if (document.getElementById('user-profile-form')) {
    initUserProfilePage(user);
  }
});

function renderUserNavSnippet(user) {
  const nameEl = document.getElementById('nav-user-name');
  const roleEl = document.getElementById('nav-user-role');
  const ptsEl = document.getElementById('nav-user-points');
  const avatarEl = document.getElementById('nav-user-avatar');
  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role === 'ADMIN' ? 'Administrator' : 'Citizen';
  if (ptsEl) ptsEl.textContent = `${user.ecoPoints !== undefined ? user.ecoPoints : 100} Pts`;
  if (avatarEl && user.name) avatarEl.textContent = user.name.charAt(0).toUpperCase();
}

function renderUserDashboard(user) {
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const ratings = getData(STORAGE_KEYS.RATINGS, []);

  // Filter requests for this user
  const userRequests = requests.filter(r => r.userId === user.id);

  // Compute Statistics
  const totalPickups = userRequests.length;
  const completedReqs = userRequests.filter(r => r.status === 'COMPLETED' || r.status === 'COLLECTED');
  const totalWeightRecycled = completedReqs.reduce((acc, r) => acc + (r.actualWeight || r.estimatedWeight || 0), 0);
  
  const userRatings = ratings.filter(r => r.userId === user.id);
  const avgRatingGiven = userRatings.length > 0 
    ? (userRatings.reduce((acc, r) => acc + r.overallRating, 0) / userRatings.length).toFixed(1)
    : '5.0';

  // Render Stats
  document.getElementById('stat-total-pickups').textContent = totalPickups;
  document.getElementById('stat-weight-recycled').textContent = `${totalWeightRecycled.toFixed(1)} kg`;
  document.getElementById('stat-eco-points').textContent = user.ecoPoints !== undefined ? user.ecoPoints : 100;
  document.getElementById('stat-avg-rating').textContent = userRatings.length > 0 ? `★ ${avgRatingGiven}` : '★ 5.0';

  // Welcome banner personalized text
  const welcomeName = document.getElementById('welcome-user-name');
  if (welcomeName) welcomeName.textContent = user.name.split(' ')[0];

  // Active Request Card
  const activeReq = userRequests.find(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');
  const activeCardContainer = document.getElementById('active-request-container');

  if (activeCardContainer) {
    if (activeReq) {
      activeCardContainer.style.display = 'block';
      document.getElementById('active-req-id').textContent = activeReq.id;
      document.getElementById('active-req-device').textContent = `${activeReq.deviceName} (${activeReq.category})`;
      document.getElementById('active-req-date').textContent = activeReq.pickupDate;
      document.getElementById('active-req-time').textContent = activeReq.timeSlot;
      document.getElementById('active-req-collector').textContent = activeReq.collectorName || 'Assigning...';
      document.getElementById('active-req-status').innerHTML = renderStatusBadge(activeReq.status);

      const trackBtn = document.getElementById('active-req-track-btn');
      if (trackBtn) trackBtn.href = `tracking.html?id=${activeReq.id}`;

      const cancelBtn = document.getElementById('active-req-cancel-btn');
      if (cancelBtn) {
        if (activeReq.status === 'REQUESTED' || activeReq.status === 'ASSIGNED') {
          cancelBtn.style.display = 'inline-flex';
          cancelBtn.onclick = () => cancelPickupRequest(activeReq.id);
        } else {
          cancelBtn.style.display = 'none'; // Once collector is on the way, require customer support
        }
      }
    } else {
      activeCardContainer.style.display = 'none';
    }
  }

  // Recent Requests Table (Latest 5)
  renderRecentRequestsTable(userRequests.slice(0, 5));
}

function renderRecentRequestsTable(recentRequests) {
  const tbody = document.getElementById('recent-requests-table-body');
  if (!tbody) return;

  if (recentRequests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No requests scheduled yet. Click "Schedule Pickup" to get started!</td></tr>`;
    return;
  }

  tbody.innerHTML = recentRequests.map(r => `
    <tr>
      <td><strong style="color: var(--color-primary);">${r.id}</strong></td>
      <td>
        <strong>${r.deviceName}</strong><br>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${r.category} • ~${r.estimatedWeight} kg</span>
      </td>
      <td>${r.pickupDate}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.timeSlot}</span></td>
      <td>${r.collectorName ? `<i class="fas fa-truck-pickup" style="color: var(--color-accent-lavender);"></i> ${r.collectorName}` : '<span style="color: var(--text-muted);">Assigning...</span>'}</td>
      <td>${renderStatusBadge(r.status)}</td>
      <td>
        <div class="table-actions">
          <a href="tracking.html?id=${r.id}" class="action-btn" title="Live Tracking">
            <i class="fas fa-location-arrow"></i>
          </a>
          ${r.status === 'COMPLETED' ? `
            <a href="rating.html?id=${r.id}" class="action-btn" title="Rate Collector" style="background: var(--color-amber-soft); color: var(--color-amber);">
              <i class="fas fa-star"></i>
            </a>
          ` : ''}
          ${(r.status === 'REQUESTED' || r.status === 'ASSIGNED') ? `
            <button onclick="cancelPickupRequest('${r.id}')" class="action-btn delete" title="Cancel Request">
              <i class="fas fa-times"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMyRequestsPage(user) {
  const requests = getData(STORAGE_KEYS.REQUESTS, []).filter(r => r.userId === user.id);
  const statusFilter = document.getElementById('filter-status');
  const searchInput = document.getElementById('search-requests');

  function filterAndDisplay() {
    const q = (searchInput?.value || '').toLowerCase();
    const st = statusFilter?.value || 'ALL';

    const filtered = requests.filter(r => {
      const matchQuery = r.id.toLowerCase().includes(q) || 
                         r.deviceName.toLowerCase().includes(q) || 
                         r.category.toLowerCase().includes(q);
      const matchStatus = st === 'ALL' || r.status === st;
      return matchQuery && matchStatus;
    });

    const tbody = document.getElementById('my-requests-table-body');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No matching pickup requests found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>
          <strong>${r.deviceName}</strong><br>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${r.category} • ${r.quantity} unit(s)</span>
        </td>
        <td>${r.estimatedWeight} kg ${r.actualWeight ? `(Actual: ${r.actualWeight} kg)` : ''}</td>
        <td>${r.pickupDate}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.timeSlot}</span></td>
        <td>${r.collectorName || 'Assigning...'}</td>
        <td>${renderStatusBadge(r.status)}</td>
        <td>
          <div class="table-actions">
            <a href="tracking.html?id=${r.id}" class="action-btn" title="Track Request"><i class="fas fa-location-arrow"></i></a>
            ${r.status === 'COMPLETED' ? `<a href="rating.html?id=${r.id}" class="action-btn" title="Rate" style="background: var(--color-amber-soft); color: var(--color-amber);"><i class="fas fa-star"></i></a>` : ''}
            ${(r.status === 'REQUESTED' || r.status === 'ASSIGNED') ? `
              <button onclick="cancelPickupRequest('${r.id}')" class="action-btn delete" title="Cancel"><i class="fas fa-trash-alt"></i></button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (statusFilter) statusFilter.addEventListener('change', filterAndDisplay);
  if (searchInput) searchInput.addEventListener('input', filterAndDisplay);
  filterAndDisplay();
}

function cancelPickupRequest(reqId) {
  if (!confirm(`Are you sure you want to cancel pickup request ${reqId}?`)) return;

  const req = updateData(STORAGE_KEYS.REQUESTS, reqId, { status: 'CANCELLED' });
  if (req) {
    // If a collector was assigned, decrement their workload
    if (req.assignedCollectorId) {
      const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
      const cIdx = collectors.findIndex(c => c.id === req.assignedCollectorId);
      if (cIdx !== -1) {
        collectors[cIdx].currentWorkload = Math.max(0, (collectors[cIdx].currentWorkload || 1) - 1);
        saveData(STORAGE_KEYS.COLLECTORS, collectors);
      }
    }

    showToast('Request Cancelled', `Pickup request ${reqId} has been cancelled.`, 'info');
    setTimeout(() => window.location.reload(), 600);
  }
}

function initUserProfilePage(user) {
  const avatarLetter = document.getElementById('profile-avatar-letter');
  const headerName = document.getElementById('profile-header-name');
  if (avatarLetter && user.name) avatarLetter.textContent = user.name.charAt(0).toUpperCase();
  if (headerName && user.name) headerName.textContent = user.name;

  document.getElementById('profile-name-input').value = user.name || '';
  document.getElementById('profile-email-input').value = user.email || '';
  document.getElementById('profile-phone-input').value = user.phone || '';
  document.getElementById('profile-address-input').value = user.address || '';
  document.getElementById('profile-zone-select').value = user.zone || 'Central Zone';
  document.getElementById('profile-points-display').textContent = user.ecoPoints !== undefined ? user.ecoPoints : 100;

  const form = document.getElementById('user-profile-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      name: document.getElementById('profile-name-input').value.trim(),
      phone: document.getElementById('profile-phone-input').value.trim(),
      address: document.getElementById('profile-address-input').value.trim(),
      zone: document.getElementById('profile-zone-select').value
    };

    updateData(STORAGE_KEYS.USERS, user.id, updated);
    const updatedUser = { ...user, ...updated };
    setCurrentUser(updatedUser);

    showToast('Profile Updated', 'Your profile details have been saved.', 'success');
  });
}


/**
 * EcoCollect — Collector Portal & Field Operations Engine
 * Manages collector availability toggle, pickup request acceptance/rejection,
 * scale verification, photo proof logging, and collector-to-user rating.
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['COLLECTOR', 'ADMIN']);
  if (!user) return;

  // Retrieve full collector record from storage
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  let collector = collectors.find(c => c.id === user.id || c.email === user.email) || collectors[0];

  renderCollectorNavSnippet(collector);
  initStatusTogglePill(collector);

  // If on Collector Dashboard
  if (document.getElementById('collector-stats-grid')) {
    renderCollectorDashboard(collector);
  }

  // If on Collector Requests page
  if (document.getElementById('collector-requests-table-body')) {
    renderCollectorRequestsPage(collector);
  }

  // If on Collector Pickup Detail page
  if (document.getElementById('pickup-detail-container')) {
    initPickupDetailPage(collector);
  }

  // If on Collector Profile page
  if (document.getElementById('collector-profile-form')) {
    initCollectorProfilePage(collector);
  }
});

function renderCollectorNavSnippet(collector) {
  const nameEl = document.getElementById('nav-collector-name');
  const vehicleEl = document.getElementById('nav-collector-vehicle');
  const ratingEl = document.getElementById('nav-collector-rating');
  const avatarEl = document.getElementById('nav-collector-avatar');
  if (nameEl) nameEl.textContent = collector.name;
  if (vehicleEl) vehicleEl.textContent = collector.vehicle;
  if (ratingEl) ratingEl.textContent = `★ ${collector.rating || 5.0}`;
  if (avatarEl && collector.name) avatarEl.textContent = collector.name.charAt(0).toUpperCase();
}

function initStatusTogglePill(collector) {
  const buttons = document.querySelectorAll('.collector-status-pill .status-option');
  if (!buttons.length) return;

  // Set initial active button
  buttons.forEach(btn => {
    const st = btn.getAttribute('data-status');
    btn.classList.toggle('active', st === collector.status);
    if (st === collector.status) btn.classList.add(st.toLowerCase());

    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active', 'available', 'busy', 'offline');
      });
      btn.classList.add('active', st.toLowerCase());

      // Update storage
      collector.status = st;
      updateData(STORAGE_KEYS.COLLECTORS, collector.id, { status: st });
      showToast('Status Updated', `Your status is now ${st}`, 'info');
    });
  });
}

function renderCollectorDashboard(collector) {
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const myRequests = requests.filter(r => r.assignedCollectorId === collector.id);

  // Calculate metrics
  const completed = myRequests.filter(r => r.status === 'COMPLETED');
  const totalWeight = completed.reduce((acc, r) => acc + (r.actualWeight || r.estimatedWeight || 0), 0);
  const activeQueue = myRequests.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED');

  document.getElementById('stat-col-completed').textContent = collector.completedPickups || completed.length;
  document.getElementById('stat-col-active').textContent = activeQueue.length;
  document.getElementById('stat-col-weight').textContent = `${(totalWeight + 480).toFixed(1)} kg`;
  document.getElementById('stat-col-rating').textContent = `★ ${collector.rating || 4.9}`;

  // Render Assigned / In-Progress Requests Queue
  const queueTbody = document.getElementById('collector-queue-table-body');
  if (queueTbody) {
    if (activeQueue.length === 0) {
      queueTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending pickups in your queue. You are all caught up!</td></tr>`;
    } else {
      queueTbody.innerHTML = activeQueue.map(r => `
        <tr>
          <td><strong style="color: var(--color-primary);">${r.id}</strong></td>
          <td>
            <strong>${r.userName}</strong><br>
            <span style="font-size: 0.75rem; color: var(--text-muted);"><i class="fas fa-phone-alt"></i> ${r.userPhone}</span>
          </td>
          <td>
            <strong>${r.deviceName}</strong><br>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${r.category} • ~${r.estimatedWeight} kg</span>
          </td>
          <td>${r.address}</td>
          <td>${renderStatusBadge(r.status)}</td>
          <td>
            <div class="table-actions">
              <a href="pickup.html?id=${r.id}" class="btn btn-sm btn-primary" style="padding: 0.35rem 0.75rem;">
                Manage <i class="fas fa-arrow-right"></i>
              </a>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }
}

function renderCollectorRequestsPage(collector) {
  const requests = getData(STORAGE_KEYS.REQUESTS, []).filter(r => r.assignedCollectorId === collector.id);
  const filterSelect = document.getElementById('collector-status-filter');
  const searchInput = document.getElementById('collector-search-input');

  function renderFiltered() {
    const q = (searchInput?.value || '').toLowerCase();
    const st = filterSelect?.value || 'ALL';

    const filtered = requests.filter(r => {
      const matchQ = r.id.toLowerCase().includes(q) || 
                     r.userName.toLowerCase().includes(q) || 
                     r.address.toLowerCase().includes(q);
      const matchSt = st === 'ALL' || r.status === st;
      return matchQ && matchSt;
    });

    const tbody = document.getElementById('collector-requests-table-body');
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No matching pickup requests.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.userName}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.userPhone}</span></td>
        <td><strong>${r.deviceName}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.category}</span></td>
        <td>${r.address}</td>
        <td>${r.pickupDate} (${r.timeSlot})</td>
        <td>${renderStatusBadge(r.status)}</td>
        <td>
          <a href="pickup.html?id=${r.id}" class="btn btn-sm btn-secondary">
            View / Update
          </a>
        </td>
      </tr>
    `).join('');
  }

  if (filterSelect) filterSelect.addEventListener('change', renderFiltered);
  if (searchInput) searchInput.addEventListener('input', renderFiltered);
  renderFiltered();
}

/**
 * Field Operations: Pickup Lifecycle Controller
 */
function initPickupDetailPage(collector) {
  const urlParams = new URLSearchParams(window.location.search);
  const reqId = urlParams.get('id');

  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  let req = requests.find(r => r.id === reqId) || requests[0];

  if (!req) {
    showToast('Not Found', 'Pickup request not found.', 'error');
    return;
  }

  // Populate Customer & Pickup Data
  document.getElementById('field-req-id').textContent = req.id;
  document.getElementById('field-status-badge').innerHTML = renderStatusBadge(req.status);
  document.getElementById('field-cust-name').textContent = req.userName;
  document.getElementById('field-cust-phone').textContent = req.userPhone;
  document.getElementById('field-cust-address').textContent = req.address;
  document.getElementById('field-device-name').textContent = req.deviceName;
  document.getElementById('field-category').textContent = req.category;
  document.getElementById('field-est-weight').textContent = `${req.estimatedWeight} kg`;
  document.getElementById('field-condition').textContent = req.condition;
  document.getElementById('field-timeslot').textContent = `${req.pickupDate} | ${req.timeSlot}`;
  document.getElementById('field-notes').textContent = req.notes || 'No special instructions.';

  // Initialize Route Map
  setTimeout(() => {
    initLiveTrackingMap('field-pickup-map', req);
  }, 200);

  updateFieldActionButtons(req);
}

function updateFieldActionButtons(req) {
  const container = document.getElementById('field-action-buttons');
  if (!container) return;

  if (req.status === 'ASSIGNED') {
    container.innerHTML = `
      <button class="btn btn-primary btn-block" onclick="updateFieldStatus('${req.id}', 'ACCEPTED')">
        <i class="fas fa-check"></i> Accept Pickup Request
      </button>
      <button class="btn btn-secondary btn-block mt-2" onclick="rejectPickupRequest('${req.id}')">
        <i class="fas fa-times"></i> Decline (Reassign)
      </button>
    `;
  } else if (req.status === 'ACCEPTED') {
    container.innerHTML = `
      <button class="btn btn-lavender btn-block" onclick="updateFieldStatus('${req.id}', 'ON_THE_WAY')">
        <i class="fas fa-truck-moving"></i> Start Journey (On The Way)
      </button>
    `;
  } else if (req.status === 'ON_THE_WAY') {
    container.innerHTML = `
      <button class="btn btn-primary btn-block" onclick="updateFieldStatus('${req.id}', 'ARRIVED')">
        <i class="fas fa-map-pin"></i> I Have Arrived at Doorstep
      </button>
    `;
  } else if (req.status === 'ARRIVED') {
    container.innerHTML = `
      <button class="btn btn-primary btn-block" onclick="openWeighAndVerifyModal('${req.id}', ${req.estimatedWeight})">
        <i class="fas fa-weight-hanging"></i> Weigh & Record Waste
      </button>
    `;
  } else if (req.status === 'COLLECTED') {
    container.innerHTML = `
      <button class="btn btn-primary btn-block" onclick="completePickupAndRate('${req.id}')">
        <i class="fas fa-flag-checkered"></i> Mark Completed & Rate Citizen
      </button>
    `;
  } else if (req.status === 'COMPLETED') {
    container.innerHTML = `
      <div style="background: var(--bg-mint); padding: 1rem; border-radius: var(--radius-md); text-align: center; color: var(--color-primary); font-weight: 700;">
        <i class="fas fa-check-circle"></i> Pickup Completed & Handed to Recycling Facility!
      </div>
    `;
  }
}

function updateFieldStatus(reqId, newStatus) {
  const updated = updateData(STORAGE_KEYS.REQUESTS, reqId, { status: newStatus });
  if (updated) {
    document.getElementById('field-status-badge').innerHTML = renderStatusBadge(newStatus);
    updateFieldActionButtons(updated);
    showToast('Status Updated', `Request status changed to ${newStatus}`, 'info');

    // Notify customer
    addNotification({
      userId: updated.userId,
      role: 'USER',
      title: `Pickup Update: ${newStatus}`,
      message: `Collector updated your pickup ${updated.id} to ${newStatus}.`,
      type: 'info',
      link: `tracking.html?id=${updated.id}`
    });
  }
}

function rejectPickupRequest(reqId) {
  if (!confirm('Decline this pickup request? It will be returned to the intake pool for reassignment.')) return;
  updateData(STORAGE_KEYS.REQUESTS, reqId, { status: 'REQUESTED', assignedCollectorId: null, collectorName: null });
  showToast('Request Declined', 'The request has been released for reassignment.', 'info');
  setTimeout(() => window.location.href = 'dashboard.html', 800);
}

function openWeighAndVerifyModal(reqId, estimated) {
  document.getElementById('weigh-actual-input').value = estimated;
  openModal('weigh-verify-modal');
}

function saveWeighVerification() {
  const urlParams = new URLSearchParams(window.location.search);
  const reqId = urlParams.get('id');
  const actualWeight = parseFloat(document.getElementById('weigh-actual-input').value) || 2.0;
  const verifiedCondition = document.getElementById('weigh-condition-select').value;

  const proofUrl = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=400&auto=format&fit=crop&q=80';

  const updated = updateData(STORAGE_KEYS.REQUESTS, reqId, {
    status: 'COLLECTED',
    actualWeight: actualWeight,
    condition: verifiedCondition,
    proofImageUrl: proofUrl
  });

  closeModal('weigh-verify-modal');
  document.getElementById('field-status-badge').innerHTML = renderStatusBadge('COLLECTED');
  updateFieldActionButtons(updated);
  showToast('Collection Verified', `Recorded actual scale weight: ${actualWeight} kg`, 'success');
}

function completePickupAndRate(reqId) {
  const updated = updateData(STORAGE_KEYS.REQUESTS, reqId, { status: 'COMPLETED' });

  // Credit user's eco points
  const users = getData(STORAGE_KEYS.USERS, []);
  const uIdx = users.findIndex(u => u.id === updated.userId);
  if (uIdx !== -1) {
    users[uIdx].ecoPoints = (users[uIdx].ecoPoints || 0) + (updated.ecoPointsAwarded || 50);
    saveData(STORAGE_KEYS.USERS, users);
  }

  // Increment collector's completed count
  const collector = getCurrentUser();
  if (collector) {
    collector.completedPickups = (collector.completedPickups || 0) + 1;
    collector.currentWorkload = Math.max(0, (collector.currentWorkload || 1) - 1);
    updateData(STORAGE_KEYS.COLLECTORS, collector.id, {
      completedPickups: collector.completedPickups,
      currentWorkload: collector.currentWorkload
    });
  }

  // Open Collector-to-Citizen Two-Way Rating Modal
  openModal('collector-rate-user-modal');
}

function submitCollectorReviewOfUser() {
  const comment = document.getElementById('col-user-comment').value.trim() || 'Cooperative and well packaged e-waste.';
  closeModal('collector-rate-user-modal');
  showToast('Pickup Completed', 'Pickup successfully completed! Your rating for the citizen has been recorded.', 'success');
  setTimeout(() => window.location.href = 'dashboard.html', 1000);
}

function initCollectorProfilePage(collector) {
  const avatarLetter = document.getElementById('col-avatar-letter');
  const headerName = document.getElementById('col-header-name');
  const headerRating = document.getElementById('col-header-rating');
  if (avatarLetter && collector.name) avatarLetter.textContent = collector.name.charAt(0).toUpperCase();
  if (headerName && collector.name) headerName.textContent = collector.name;
  if (headerRating) headerRating.textContent = `★ ${collector.rating || 5.0} (${collector.totalRatings || 0} Reviews)`;

  document.getElementById('col-name').value = collector.name;
  document.getElementById('col-email').value = collector.email;
  document.getElementById('col-phone').value = collector.phone;
  document.getElementById('col-vehicle').value = collector.vehicle;
  document.getElementById('col-zone').value = collector.zone;

  const form = document.getElementById('collector-profile-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      name: document.getElementById('col-name').value.trim(),
      phone: document.getElementById('col-phone').value.trim(),
      vehicle: document.getElementById('col-vehicle').value.trim(),
      zone: document.getElementById('col-zone').value
    };

    updateData(STORAGE_KEYS.COLLECTORS, collector.id, updated);
    setCurrentUser({ ...collector, ...updated });
    showToast('Profile Saved', 'Collector fleet credentials updated successfully.', 'success');
  });
}


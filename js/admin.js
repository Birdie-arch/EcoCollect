/**
 * EcoCollect — Central Administrator Console Engine
 * Manages admin portal views, user management, collector fleet oversight,
 * request lifecycle interventions, and recycling centers directory.
 */

document.addEventListener('DOMContentLoaded', () => {
  const admin = requireRole(['ADMIN']);
  if (!admin) return;

  // Render Admin Navigation
  const nameEl = document.getElementById('admin-nav-name');
  if (nameEl) nameEl.textContent = admin.name;

  // If on Admin Dashboard
  if (document.getElementById('kpi-total-users')) {
    initAdminAnalytics();
    renderRecentActivityLog();
  }

  // If on Admin Users page
  if (document.getElementById('admin-users-table-body')) {
    initAdminUsersPage();
  }

  // If on Admin Collectors page
  if (document.getElementById('admin-collectors-table-body')) {
    initAdminCollectorsPage();
  }

  // If on Admin Requests page
  if (document.getElementById('admin-requests-table-body')) {
    initAdminRequestsPage();
  }

  // If on Admin Analytics page
  if (document.getElementById('admin-analytics-view')) {
    initAdminAnalytics();
  }

  // If on Admin Recycling Centers page
  if (document.getElementById('recycling-centers-grid')) {
    initRecyclingCentersPage();
  }
});

function renderRecentActivityLog() {
  const container = document.getElementById('admin-activity-list');
  if (!container) return;

  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const recent = requests.slice(0, 8);

  container.innerHTML = recent.map(r => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 0; border-bottom: 1px solid var(--border-subtle);">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-mint); color: var(--color-primary); display: flex; align-items: center; justify-content: center;">
          <i class="fas fa-recycle"></i>
        </div>
        <div>
          <h6 style="font-size: 0.875rem; margin: 0; color: var(--text-main);">${r.userName} scheduled ${r.deviceName}</h6>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${r.zone} • ${r.id}</span>
        </div>
      </div>
      <div>
        ${renderStatusBadge(r.status)}
      </div>
    </div>
  `).join('');
}

/**
 * Admin User Management Page
 */
function initAdminUsersPage() {
  const users = getData(STORAGE_KEYS.USERS, []);
  const searchInput = document.getElementById('search-users');
  const roleFilter = document.getElementById('filter-user-role');
  const tbody = document.getElementById('admin-users-table-body');

  function render() {
    const q = (searchInput?.value || '').toLowerCase();
    const role = roleFilter?.value || 'ALL';

    const filtered = users.filter(u => {
      const matchQ = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
      const matchRole = role === 'ALL' || u.role === role;
      return matchQ && matchRole;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching registered users.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <div class="table-user-cell">
            <div class="table-user-avatar">${u.name.charAt(0)}</div>
            <div>
              <strong>${u.name}</strong><br>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${u.id}</span>
            </div>
          </div>
        </td>
        <td>${u.email}</td>
        <td>${u.phone || '—'}</td>
        <td><span class="badge ${u.role === 'ADMIN' ? 'badge-lavender' : (u.role === 'COLLECTOR' ? 'badge-leaf' : 'badge-assigned')}">${u.role}</span></td>
        <td>${u.zone || 'Central Zone'}</td>
        <td><strong style="color: var(--color-primary);">${u.ecoPoints || 0} pts</strong></td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="viewUserModal('${u.id}')" title="View Profile"><i class="fas fa-eye"></i></button>
            ${u.role !== 'ADMIN' ? `<button class="action-btn delete" onclick="deleteUserRecord('${u.id}')" title="Delete User"><i class="fas fa-trash"></i></button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (searchInput) searchInput.addEventListener('input', render);
  if (roleFilter) roleFilter.addEventListener('change', render);
  render();
}

function viewUserModal(userId) {
  const user = getData(STORAGE_KEYS.USERS, []).find(u => u.id === userId);
  if (!user) return;

  alert(`Citizen Details:\nName: ${user.name}\nEmail: ${user.email}\nPhone: ${user.phone}\nAddress: ${user.address}\nZone: ${user.zone}\nEco Points: ${user.ecoPoints}`);
}

function deleteUserRecord(userId) {
  if (!confirm(`Are you sure you want to remove user account ${userId}?`)) return;
  deleteData(STORAGE_KEYS.USERS, userId);
  showToast('User Deleted', `User ${userId} was deleted from database`, 'info');
  initAdminUsersPage();
}

/**
 * Admin Collector Management Page
 */
function initAdminCollectorsPage() {
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const searchInput = document.getElementById('search-collectors');
  const statusFilter = document.getElementById('filter-collector-status');
  const tbody = document.getElementById('admin-collectors-table-body');

  function render() {
    const q = (searchInput?.value || '').toLowerCase();
    const st = statusFilter?.value || 'ALL';

    const filtered = collectors.filter(c => {
      const matchQ = c.name.toLowerCase().includes(q) || c.vehicle.toLowerCase().includes(q) || c.zone.toLowerCase().includes(q);
      const matchSt = st === 'ALL' || c.status === st;
      return matchQ && matchSt;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching collectors found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td>
          <div class="table-user-cell">
            <div class="table-user-avatar" style="background: var(--bg-surface-warm);">${c.name.charAt(0)}</div>
            <div>
              <strong>${c.name}</strong><br>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${c.id}</span>
            </div>
          </div>
        </td>
        <td>${c.vehicle}</td>
        <td>${c.zone}</td>
        <td><strong style="color: #F59E0B;">★ ${c.rating}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${c.totalRatings})</span></td>
        <td>${renderStatusBadge(c.status)}</td>
        <td><strong>${c.currentWorkload || 0}</strong> active</td>
        <td>
          <div class="table-actions">
            <button class="action-btn" onclick="toggleCollectorAvailability('${c.id}')" title="Toggle Available/Busy">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (searchInput) searchInput.addEventListener('input', render);
  if (statusFilter) statusFilter.addEventListener('change', render);
  render();
}

function toggleCollectorAvailability(colId) {
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const col = collectors.find(c => c.id === colId);
  if (!col) return;

  const nextStatus = col.status === 'AVAILABLE' ? 'BUSY' : (col.status === 'BUSY' ? 'OFFLINE' : 'AVAILABLE');
  updateData(STORAGE_KEYS.COLLECTORS, colId, { status: nextStatus });
  showToast('Status Updated', `${col.name} is now ${nextStatus}`, 'info');
  initAdminCollectorsPage();
}

/**
 * Admin Requests Management Page (with Multi-Filters)
 */
function initAdminRequestsPage() {
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const searchInput = document.getElementById('search-all-requests');
  const statusFilter = document.getElementById('filter-req-status');
  const zoneFilter = document.getElementById('filter-req-zone');
  const tbody = document.getElementById('admin-requests-table-body');

  function render() {
    const q = (searchInput?.value || '').toLowerCase();
    const st = statusFilter?.value || 'ALL';
    const zn = zoneFilter?.value || 'ALL';

    const filtered = requests.filter(r => {
      const matchQ = r.id.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q) || r.deviceName.toLowerCase().includes(q);
      const matchSt = st === 'ALL' || r.status === st;
      const matchZn = zn === 'ALL' || r.zone === zn;
      return matchQ && matchSt && matchZn;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">No pickup requests found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.userName}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.userPhone}</span></td>
        <td><strong>${r.deviceName}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${r.category} • ~${r.estimatedWeight} kg</span></td>
        <td>${r.zone}</td>
        <td>${r.pickupDate}</td>
        <td>${r.collectorName || '<span style="color: var(--color-amber);">Unassigned</span>'}</td>
        <td>${renderStatusBadge(r.status)}</td>
        <td>
          <div class="table-actions">
            <a href="../user/tracking.html?id=${r.id}" class="action-btn" title="Inspect Route"><i class="fas fa-map-marked-alt"></i></a>
            <button class="action-btn" onclick="openAdminReassignModal('${r.id}')" title="Reassign Collector"><i class="fas fa-user-tag"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  if (searchInput) searchInput.addEventListener('input', render);
  if (statusFilter) statusFilter.addEventListener('change', render);
  if (zoneFilter) zoneFilter.addEventListener('change', render);
  render();
}

function openAdminReassignModal(reqId) {
  const req = getData(STORAGE_KEYS.REQUESTS, []).find(r => r.id === reqId);
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  if (!req) return;

  const colList = collectors.map((c, i) => `${i + 1}. ${c.name} (${c.vehicle}) — ${c.status}`).join('\n');
  const choice = prompt(`Reassign Request ${reqId}:\nCurrently: ${req.collectorName || 'Unassigned'}\n\nChoose collector number (1-${collectors.length}):\n${colList}`);

  if (choice) {
    const selectedIdx = parseInt(choice) - 1;
    if (collectors[selectedIdx]) {
      const newCol = collectors[selectedIdx];
      updateData(STORAGE_KEYS.REQUESTS, reqId, {
        assignedCollectorId: newCol.id,
        collectorName: newCol.name,
        collectorPhone: newCol.phone,
        collectorVehicle: newCol.vehicle,
        status: req.status === 'REQUESTED' ? 'ASSIGNED' : req.status
      });
      showToast('Reassigned', `Request ${reqId} assigned to ${newCol.name}`, 'success');
      initAdminRequestsPage();
    }
  }
}

/**
 * Recycling Centers Directory Page (Section 15)
 */
function initRecyclingCentersPage() {
  const centers = getData(STORAGE_KEYS.CENTERS, []);
  const grid = document.getElementById('recycling-centers-grid');

  if (grid) {
    grid.innerHTML = centers.map(c => `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <span class="badge badge-leaf">${c.zone}</span>
            <span style="color: #F59E0B; font-weight: 700; font-size: 0.9rem;">★ ${c.rating}</span>
          </div>
          <h4 style="font-size: 1.15rem; margin-bottom: 0.35rem;">${c.name}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;"><i class="fas fa-map-pin" style="color: var(--color-primary);"></i> ${c.address}</p>
          
          <div style="background: var(--bg-surface-tint); padding: 0.85rem; border-radius: var(--radius-md); font-size: 0.8rem; margin-bottom: 1rem;">
            <div><strong>Daily Capacity:</strong> ${c.capacityKgPerDay} kg/day</div>
            <div><strong>Operating Hours:</strong> ${c.operatingHours}</div>
            <div><strong>Distance:</strong> ${c.distance}</div>
          </div>

          <div style="margin-bottom: 1rem;">
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Accepted Streams:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem;">
              ${c.acceptedCategories.map(cat => `<span class="badge" style="background: var(--bg-surface-warm); font-size: 0.68rem; text-transform: none;">${cat}</span>`).join('')}
            </div>
          </div>
        </div>
        <div>
          <button class="btn btn-secondary btn-block btn-sm" onclick="focusCenterOnMap(${c.lat}, ${c.lng}, '${c.name}')">
            <i class="fas fa-map-marked-alt"></i> View on Map
          </button>
        </div>
      </div>
    `).join('');
  }

  // Mount Leaflet map for Recycling Centers
  setTimeout(() => {
    initMetropolitanMap('admin-centers-map');
  }, 250);
}

function focusCenterOnMap(lat, lng, name) {
  const mapEl = document.getElementById('admin-centers-map');
  if (mapEl) {
    mapEl.scrollIntoView({ behavior: 'smooth' });
    showToast('Recycling Facility', `Focused on ${name}`, 'info');
  }
}

function resetCityData() {
  if (confirm('Reset city data to baseline configuration? This will restore standard collectors and recycling facilities.')) {
    localStorage.clear();
    seedInitialData();
    showToast('Reset Complete', 'City baseline data restored.', 'info');
    setTimeout(() => window.location.reload(), 600);
  }
}


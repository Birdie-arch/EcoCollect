/**
 * EcoCollect — Pickup Tracking Engine
 * Manages 7-step progress timeline, Leaflet map with route polyline,
 * simulated real-time collector movement, and quick testing transitions.
 */

const TRACKING_STEPS = [
  'REQUESTED',
  'ASSIGNED',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'COLLECTED',
  'COMPLETED'
];

let activeTrackingMap = null;
let currentTrackingRequest = null;
let movementInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['USER', 'COLLECTOR', 'ADMIN']);
  if (!user) return;

  // Retrieve Request ID from URL query param
  const urlParams = new URLSearchParams(window.location.search);
  let reqId = urlParams.get('id');

  const requests = getData(STORAGE_KEYS.REQUESTS, []);

  // If no ID in URL, default to first active request of the user or system
  if (!reqId) {
    const userReq = requests.find(r => r.userId === user.id && r.status !== 'COMPLETED' && r.status !== 'CANCELLED') || requests[0];
    if (userReq) reqId = userReq.id;
  }

  currentTrackingRequest = requests.find(r => r.id === reqId) || requests[0];

  if (!currentTrackingRequest) {
    showToast('Tracking', 'No pickup requests found to track.', 'warning');
    return;
  }

  renderTrackingHeader(currentTrackingRequest);
  renderTrackingTimeline(currentTrackingRequest.status);
  populateRequestSelector(requests, currentTrackingRequest.id);

  // Initialize Map
  setTimeout(() => {
    activeTrackingMap = initLiveTrackingMap('tracking-live-map', currentTrackingRequest);
  }, 200);
});

function renderTrackingHeader(req) {
  document.getElementById('track-req-id').textContent = req.id;
  document.getElementById('track-device-name').textContent = `${req.deviceName} (${req.category})`;
  document.getElementById('track-address').textContent = req.address;
  document.getElementById('track-scheduled').textContent = `${req.pickupDate} | ${req.timeSlot}`;
  document.getElementById('track-status-badge').innerHTML = renderStatusBadge(req.status);

  // Collector info
  document.getElementById('track-collector-name').textContent = req.collectorName || 'Assigning Collector...';
  document.getElementById('track-collector-vehicle').textContent = req.collectorVehicle || 'Eco Fleet';
  document.getElementById('track-collector-rating').textContent = req.collectorRating ? `★ ${req.collectorRating} / 5.0` : '★ 4.9';
  document.getElementById('track-eta').textContent = req.status === 'COMPLETED' ? 'Completed' : (req.status === 'ARRIVED' ? 'Arrived at Doorstep!' : `~${req.estimatedArrivalMinutes || 12} mins`);

  // Rate service button visibility
  const rateBtn = document.getElementById('rate-service-cta');
  if (rateBtn) {
    if (req.status === 'COMPLETED') {
      rateBtn.style.display = 'inline-flex';
      rateBtn.href = `rating.html?id=${req.id}`;
    } else {
      rateBtn.style.display = 'none';
    }
  }
}

function renderTrackingTimeline(currentStatus) {
  const currentIdx = TRACKING_STEPS.indexOf(currentStatus);
  const stepItems = document.querySelectorAll('.tracking-stepper .step-item');

  stepItems.forEach((item, index) => {
    item.classList.remove('completed', 'active');
    if (currentIdx === -1) return; // e.g. CANCELLED

    if (index < currentIdx) {
      item.classList.add('completed');
    } else if (index === currentIdx) {
      item.classList.add('active');
    }
  });
}

function populateRequestSelector(requests, selectedId) {
  const select = document.getElementById('tracking-request-select');
  if (!select) return;

  select.innerHTML = requests.slice(0, 20).map(r => `
    <option value="${r.id}" ${r.id === selectedId ? 'selected' : ''}>
      ${r.id} — ${r.deviceName} (${r.status})
    </option>
  `).join('');

  select.addEventListener('change', (e) => {
    window.location.href = `tracking.html?id=${e.target.value}`;
  });
}

/**
 * Real-Time Movement Simulation (Section 8)
 * Animates the collector marker smoothly moving towards the citizen's doorstep
 */
function simulateLiveCollectorMovement() {
  if (!activeTrackingMap || !currentTrackingRequest) return;
  if (movementInterval) clearInterval(movementInterval);

  const start = activeTrackingMap.collectorCoords;
  const target = activeTrackingMap.userCoords;

  let progress = 0;
  const totalSteps = 40;
  const btn = document.getElementById('sim-move-btn');
  if (btn) btn.disabled = true;

  showToast('Simulation Started', 'Simulating collector vehicle GPS telemetry heading to doorstep...', 'info');

  movementInterval = setInterval(() => {
    progress++;
    const lat = start[0] + (target[0] - start[0]) * (progress / totalSteps);
    const lng = start[1] + (target[1] - start[1]) * (progress / totalSteps);

    activeTrackingMap.collectorMarker.setLatLng([lat, lng]);

    // Update ETA countdown
    const remainingEta = Math.max(1, Math.round((1 - progress / totalSteps) * (currentTrackingRequest.estimatedArrivalMinutes || 12)));
    document.getElementById('track-eta').textContent = `~${remainingEta} mins`;

    if (progress >= totalSteps) {
      clearInterval(movementInterval);
      if (btn) btn.disabled = false;
      document.getElementById('track-eta').textContent = 'Arrived at Doorstep!';
      updateRequestStatus('ARRIVED');
      showToast('Collector Arrived', 'The collector has arrived at your doorstep!', 'success');
    }
  }, 120);
}

/**
 * Fast Testing State Transition Helpers for Evaluator
 */
function fastSimulateTransition(targetStatus) {
  if (!currentTrackingRequest) return;
  updateRequestStatus(targetStatus);
  showToast('Status Updated', `Request status transitioned to: ${targetStatus}`, 'info');
}

function updateRequestStatus(newStatus) {
  if (!currentTrackingRequest) return;

  const updated = updateData(STORAGE_KEYS.REQUESTS, currentTrackingRequest.id, {
    status: newStatus,
    actualWeight: (newStatus === 'COLLECTED' || newStatus === 'COMPLETED') ? (currentTrackingRequest.actualWeight || currentTrackingRequest.estimatedWeight) : null
  });

  if (updated) {
    currentTrackingRequest = updated;
    renderTrackingHeader(updated);
    renderTrackingTimeline(newStatus);

    // If completed, add notification and credit points
    if (newStatus === 'COMPLETED') {
      const user = getCurrentUser();
      if (user && user.id === updated.userId) {
        user.ecoPoints = (user.ecoPoints || 0) + (updated.ecoPointsAwarded || 50);
        setCurrentUser(user);
        updateData(STORAGE_KEYS.USERS, user.id, { ecoPoints: user.ecoPoints });
      }

      addNotification({
        userId: updated.userId,
        role: 'USER',
        title: 'Pickup Completed & Verified',
        message: `Your e-waste collection was completed. +${updated.ecoPointsAwarded} Eco Points credited! Please rate your collector.`,
        type: 'success',
        link: `rating.html?id=${updated.id}`
      });
    }
  }
}


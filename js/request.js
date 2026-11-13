/**
 * EcoCollect — Multi-Step E-Waste Pickup Request Engine
 * Manages 4-step wizard, map pin selection, AI auto-fill handoff,
 * smart dynamic collector assignment, and confirmation modals.
 */

// Form State
const requestState = {
  step: 1,
  category: 'Laptop',
  deviceName: '',
  quantity: 1,
  estimatedWeight: 2.0,
  condition: 'Not Working',
  imageUrl: null,
  address: '',
  area: 'Central Zone',
  city: 'Metropolitan City',
  pincode: '560001',
  zone: 'Central Zone',
  lat: METRO_CENTER.lat,
  lng: METRO_CENTER.lng,
  pickupDate: '',
  timeSlot: '09:00 AM – 12:00 PM',
  notes: ''
};

let locationPickerMapObj = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['USER', 'ADMIN']);
  if (!user) return;

  // Prepopulate address from user profile if available
  if (user.address) {
    requestState.address = user.address;
    requestState.zone = user.zone || 'Central Zone';
    requestState.lat = user.lat || METRO_CENTER.lat;
    requestState.lng = user.lng || METRO_CENTER.lng;
  }

  // Set default tomorrow date
  const tomorrow = new Date(Date.now() + 86400000);
  requestState.pickupDate = tomorrow.toISOString().split('T')[0];

  initFormEvents();
  initAiClassifierUI({
    onAutoFill: (aiResult) => {
      // Auto-fill category
      requestState.category = aiResult.category;
      requestState.deviceName = aiResult.detectedObject;
      requestState.estimatedWeight = aiResult.estimatedWeight;
      requestState.condition = aiResult.condition.includes('Damaged') ? 'Damaged' : 'Not Working';

      // Update Form Inputs
      const devNameInput = document.getElementById('device-name-input');
      if (devNameInput) devNameInput.value = aiResult.detectedObject;

      const weightInput = document.getElementById('weight-input');
      if (weightInput) weightInput.value = aiResult.estimatedWeight;

      // Select category radio
      const catRadio = document.querySelector(`input[name="category"][value="${aiResult.category}"]`);
      if (catRadio) catRadio.checked = true;

      // Select condition radio
      const condRadio = document.querySelector(`input[name="condition"][value="${requestState.condition}"]`);
      if (condRadio) condRadio.checked = true;

      updateEcoPointsEstimate();
    }
  });

  goToStep(1);
});

function initFormEvents() {
  // Category change
  document.querySelectorAll('input[name="category"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      requestState.category = e.target.value;
      updateEcoPointsEstimate();
    });
  });

  // Condition change
  document.querySelectorAll('input[name="condition"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      requestState.condition = e.target.value;
    });
  });

  // Quantity change
  const qtyInput = document.getElementById('qty-input');
  if (qtyInput) {
    qtyInput.addEventListener('input', (e) => {
      requestState.quantity = parseInt(e.target.value) || 1;
      updateEcoPointsEstimate();
    });
  }

  // Estimated weight change
  const weightInput = document.getElementById('weight-input');
  if (weightInput) {
    weightInput.addEventListener('input', (e) => {
      requestState.estimatedWeight = parseFloat(e.target.value) || 1.0;
      updateEcoPointsEstimate();
    });
  }

  // Device name change
  const devNameInput = document.getElementById('device-name-input');
  if (devNameInput) {
    devNameInput.addEventListener('input', (e) => {
      requestState.deviceName = e.target.value;
    });
  }

  // Location inputs
  const addrInput = document.getElementById('address-input');
  if (addrInput) {
    if (requestState.address) addrInput.value = requestState.address;
    addrInput.addEventListener('input', (e) => { requestState.address = e.target.value; });
  }

  const areaInput = document.getElementById('area-input');
  if (areaInput) {
    areaInput.addEventListener('input', (e) => { requestState.area = e.target.value; });
  }

  const pinInput = document.getElementById('pincode-input');
  if (pinInput) {
    pinInput.addEventListener('input', (e) => { requestState.pincode = e.target.value; });
  }

  const zoneSelect = document.getElementById('zone-select');
  if (zoneSelect) {
    zoneSelect.value = requestState.zone;
    zoneSelect.addEventListener('change', (e) => { requestState.zone = e.target.value; });
  }

  // Date and Time inputs
  const dateInput = document.getElementById('pickup-date-input');
  if (dateInput) {
    dateInput.value = requestState.pickupDate;
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.addEventListener('change', (e) => { requestState.pickupDate = e.target.value; });
  }

  document.querySelectorAll('input[name="timeslot"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      requestState.timeSlot = e.target.value;
    });
  });

  const notesInput = document.getElementById('notes-input');
  if (notesInput) {
    notesInput.addEventListener('input', (e) => { requestState.notes = e.target.value; });
  }
}

function updateEcoPointsEstimate() {
  const base = ECO_POINTS_TABLE[requestState.category] || 20;
  const weightMult = requestState.estimatedWeight > 5 ? 1.5 : 1.0;
  const totalPoints = Math.round(base * requestState.quantity * weightMult);
  
  const el = document.getElementById('preview-points-val');
  if (el) el.textContent = `+${totalPoints} Points`;
  return totalPoints;
}

function goToStep(stepNum) {
  // Validate step before proceeding
  if (stepNum > requestState.step) {
    if (requestState.step === 1) {
      if (!requestState.deviceName) {
        showToast('Required Field', 'Please enter the device name or select a sample above.', 'warning');
        return;
      }
    } else if (requestState.step === 2) {
      if (!requestState.address) {
        showToast('Required Field', 'Please provide your doorstep address.', 'warning');
        return;
      }
    } else if (requestState.step === 3) {
      if (!requestState.pickupDate) {
        showToast('Required Field', 'Please choose a pickup date.', 'warning');
        return;
      }
    }
  }

  requestState.step = stepNum;

  // Update step navigation UI
  document.querySelectorAll('.wizard-step').forEach((el, idx) => {
    const s = idx + 1;
    el.classList.remove('active', 'completed');
    if (s === stepNum) el.classList.add('active');
    else if (s < stepNum) el.classList.add('completed');
  });

  // Show/Hide step panes
  document.querySelectorAll('.wizard-pane').forEach((pane, idx) => {
    pane.style.display = (idx + 1 === stepNum) ? 'block' : 'none';
  });

  // Step 2: Initialize or resize Leaflet map
  if (stepNum === 2) {
    setTimeout(() => {
      if (!locationPickerMapObj) {
        locationPickerMapObj = initLocationPickerMap('location-picker-map', requestState.lat, requestState.lng, (coords) => {
          requestState.lat = coords.lat;
          requestState.lng = coords.lng;
          document.getElementById('coords-display').textContent = `GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
        });
      } else {
        locationPickerMapObj.map.invalidateSize();
      }
    }, 200);
  }

  // Step 4: Render Review Summary
  if (stepNum === 4) {
    renderReviewSummary();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderReviewSummary() {
  document.getElementById('rev-category').textContent = requestState.category;
  document.getElementById('rev-device').textContent = `${requestState.deviceName} (${requestState.quantity} unit${requestState.quantity > 1 ? 's' : ''})`;
  document.getElementById('rev-weight').textContent = `~${requestState.estimatedWeight} kg`;
  document.getElementById('rev-condition').textContent = requestState.condition;
  document.getElementById('rev-address').textContent = `${requestState.address}, ${requestState.area}, ${requestState.city} - ${requestState.pincode}`;
  document.getElementById('rev-datetime').textContent = `${requestState.pickupDate} | ${requestState.timeSlot}`;
  document.getElementById('rev-points').textContent = `+${updateEcoPointsEstimate()} Eco Points`;
}

/**
 * Confirm and Execute Smart Collector Assignment
 */
function submitPickupRequest() {
  const user = getCurrentUser();
  if (!user) return;

  const btn = document.getElementById('confirm-pickup-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Running Smart Collector Assignment...`;
  }

  // 1. Run Dynamic Smart Collector Assignment Algorithm
  const assignedCollector = findBestCollector(requestState.category, requestState.lat, requestState.lng);

  if (!assignedCollector) {
    showToast('Assignment Error', 'No active collectors currently available in this zone. Please try again.', 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-check-circle"></i> Confirm Pickup`;
    }
    return;
  }

  // 2. Generate Unique Request ID (EC-2026-XXXXXX)
  const requestId = generateId('EC');
  const ecoPoints = updateEcoPointsEstimate();

  // Find nearest recycling center
  const centers = getData(STORAGE_KEYS.CENTERS, []);
  const center = centers[0] || { id: 'RC-01', name: 'Metro Hub' };

  // 3. Assemble Request Record
  const newRequest = {
    id: requestId,
    userId: user.id,
    userName: user.name,
    userPhone: user.phone || '+91 98450 12345',
    category: requestState.category,
    deviceName: requestState.deviceName,
    quantity: requestState.quantity,
    estimatedWeight: requestState.estimatedWeight,
    actualWeight: null,
    condition: requestState.condition,
    address: requestState.address,
    area: requestState.area,
    city: requestState.city,
    pincode: requestState.pincode,
    zone: requestState.zone,
    lat: requestState.lat,
    lng: requestState.lng,
    pickupDate: requestState.pickupDate,
    timeSlot: requestState.timeSlot,
    status: 'ASSIGNED',
    assignedCollectorId: assignedCollector.id,
    collectorName: assignedCollector.name,
    collectorPhone: assignedCollector.phone,
    collectorVehicle: assignedCollector.vehicle,
    collectorRating: assignedCollector.rating,
    estimatedArrivalMinutes: assignedCollector.estimatedArrivalMinutes || 15,
    recyclingCenterId: center.id,
    ecoPointsAwarded: ecoPoints,
    proofImageUrl: null,
    notes: requestState.notes,
    createdAt: new Date().toISOString()
  };

  // 4. Save to Storage
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  requests.unshift(newRequest);
  saveData(STORAGE_KEYS.REQUESTS, requests);

  // 5. Update Collector's Workload
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const colIdx = collectors.findIndex(c => c.id === assignedCollector.id);
  if (colIdx !== -1) {
    collectors[colIdx].currentWorkload = (collectors[colIdx].currentWorkload || 0) + 1;
    saveData(STORAGE_KEYS.COLLECTORS, collectors);
  }

  // 6. Push Notifications
  addNotification({
    userId: user.id,
    role: 'USER',
    title: 'Pickup Request Scheduled',
    message: `Your request ${requestId} has been confirmed. ${assignedCollector.name} has been assigned!`,
    type: 'success',
    link: `tracking.html?id=${requestId}`
  });

  addNotification({
    userId: assignedCollector.id,
    role: 'COLLECTOR',
    title: 'New Pickup Assigned',
    message: `New pickup ${requestId} (${requestState.deviceName}) in ${requestState.area}.`,
    type: 'info',
    link: `../collector/pickup.html?id=${requestId}`
  });

  // 7. Display Assignment Success Modal
  setTimeout(() => {
    showAssignmentSuccessModal(newRequest, assignedCollector);
  }, 600);
}

function showAssignmentSuccessModal(req, col) {
  document.getElementById('modal-req-id').textContent = req.id;
  document.getElementById('modal-col-name').textContent = col.name;
  document.getElementById('modal-col-rating').textContent = `★ ${col.rating} / 5.0`;
  document.getElementById('modal-col-vehicle').textContent = col.vehicle;
  document.getElementById('modal-col-distance').textContent = `${col.computedDistance || 3.2} km away`;
  document.getElementById('modal-col-eta').textContent = `~${col.estimatedArrivalMinutes || 15} mins`;
  document.getElementById('modal-col-avatar').src = col.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const trackBtn = document.getElementById('modal-track-btn');
  if (trackBtn) {
    trackBtn.onclick = () => {
      window.location.href = `tracking.html?id=${req.id}`;
    };
  }

  openModal('assignment-success-modal');
}


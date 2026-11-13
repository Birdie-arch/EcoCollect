/**
 * EcoCollect — Interactive Map Engine (Leaflet.js & OpenStreetMap)
 * Handles metropolitan overview, location picker pin, route rendering,
 * and simulated collector movement.
 */

// Custom SVG map marker generator
function createLeafletIcon(color = '#1E5E3A', iconClass = 'fa-recycle', size = 38) {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background: ${color};
        color: #FFFFFF;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      ">
        <i class="fas ${iconClass}" style="transform: rotate(45deg); font-size: ${size * 0.42}px;"></i>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

/**
 * Initializes full Metropolitan City Overview Map (for Admin & Explorer)
 */
function initMetropolitanMap(containerId = 'metro-map') {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const map = L.map(containerId).setView([METRO_CENTER.lat, METRO_CENTER.lng], 12);

  // Clean OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  const centers = getData(STORAGE_KEYS.CENTERS, []);
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const requests = getData(STORAGE_KEYS.REQUESTS, []);

  // 1. Add Recycling Centers (Green Leaf Markers)
  centers.forEach(center => {
    const centerIcon = createLeafletIcon('#1E5E3A', 'fa-industry', 38);
    const marker = L.marker([center.lat, center.lng], { icon: centerIcon }).addTo(map);
    
    // Find nearest collector
    let nearestCol = 'Rajesh Kumar (Eco Van)';
    let minDist = Infinity;
    collectors.forEach(c => {
      const d = calculateDistance(center.lat, center.lng, c.lat, c.lng);
      if (d < minDist) {
        minDist = d;
        nearestCol = `${c.name} (${d} km)`;
      }
    });

    marker.bindPopup(`
      <div style="font-family: var(--font-body); min-width: 220px; padding: 4px;">
        <span class="badge badge-leaf" style="margin-bottom: 6px;">RECYCLING FACILITY</span>
        <h4 style="font-family: var(--font-display); font-size: 1.05rem; margin: 4px 0 6px;">${center.name}</h4>
        <p style="font-size: 0.8rem; color: #555; margin-bottom: 8px;"><i class="fas fa-map-marker-alt" style="color: #1E5E3A;"></i> ${center.address}</p>
        <div style="font-size: 0.78rem; line-height: 1.5; border-top: 1px solid #eee; padding-top: 6px;">
          <div><strong>Capacity:</strong> ${center.capacityKgPerDay} kg/day (Current: ${center.currentLoadKg} kg)</div>
          <div><strong>Operating:</strong> ${center.operatingHours}</div>
          <div><strong>Rating:</strong> ★ ${center.rating} / 5.0</div>
          <div><strong>Nearest Collector:</strong> ${nearestCol}</div>
        </div>
      </div>
    `);
  });

  // 2. Add Active Collectors (Lavender Van Markers)
  collectors.forEach(col => {
    const statusColor = col.status === 'AVAILABLE' ? '#8B6CE0' : (col.status === 'BUSY' ? '#D97706' : '#64748B');
    const colIcon = createLeafletIcon(statusColor, 'fa-truck-pickup', 34);
    const marker = L.marker([col.lat, col.lng], { icon: colIcon }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: var(--font-body); min-width: 200px; padding: 4px;">
        <span class="badge ${col.status === 'AVAILABLE' ? 'badge-available' : 'badge-busy'}" style="margin-bottom: 6px;">${col.status}</span>
        <h4 style="font-size: 1rem; margin: 4px 0;">${col.name}</h4>
        <p style="font-size: 0.8rem; color: #555; margin: 0 0 6px;">${col.vehicle}</p>
        <div style="font-size: 0.78rem; border-top: 1px solid #eee; padding-top: 6px;">
          <div><strong>Zone:</strong> ${col.zone}</div>
          <div><strong>Rating:</strong> ★ ${col.rating} (${col.totalRatings} reviews)</div>
          <div><strong>Completed Pickups:</strong> ${col.completedPickups}</div>
          <div><strong>Active Queue:</strong> ${col.currentWorkload} jobs</div>
        </div>
      </div>
    `);
  });

  // 3. Add High-Demand Clusters / Pickup Locations (Amber Pins)
  const activeReqs = requests.filter(r => r.status === 'REQUESTED' || r.status === 'ASSIGNED' || r.status === 'ON_THE_WAY');
  activeReqs.forEach(req => {
    if (!req.lat || !req.lng) return;
    const reqIcon = createLeafletIcon('#D97706', 'fa-box', 30);
    const marker = L.marker([req.lat, req.lng], { icon: reqIcon }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: var(--font-body); min-width: 200px;">
        <span class="badge badge-requested">${req.status}</span>
        <h5 style="margin: 6px 0 4px; font-size: 0.95rem;">${req.deviceName} (${req.category})</h5>
        <p style="font-size: 0.8rem; color: #555; margin-bottom: 6px;">${req.address}</p>
        <div style="font-size: 0.75rem; color: #666;">
          <div><strong>Est. Weight:</strong> ${req.estimatedWeight} kg</div>
          <div><strong>ID:</strong> ${req.id}</div>
        </div>
      </div>
    `);
  });

  return map;
}

/**
 * Initializes Draggable Location Picker Map (for Step 2 of Request form)
 */
function initLocationPickerMap(containerId = 'location-picker-map', initialLat = METRO_CENTER.lat, initialLng = METRO_CENTER.lng, onLocationSelected) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  const map = L.map(containerId).setView([initialLat, initialLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const pinIcon = createLeafletIcon('#1E5E3A', 'fa-crosshairs', 40);
  const marker = L.marker([initialLat, initialLng], {
    draggable: true,
    icon: pinIcon
  }).addTo(map);

  marker.bindPopup('Drag this pin to your exact doorstep').openPopup();

  function updateCoords(lat, lng) {
    if (typeof onLocationSelected === 'function') {
      onLocationSelected({ lat, lng });
    }
  }

  marker.on('dragend', function (e) {
    const pos = marker.getLatLng();
    updateCoords(pos.lat, pos.lng);
  });

  map.on('click', function (e) {
    marker.setLatLng(e.latlng);
    updateCoords(e.latlng.lat, e.latlng.lng);
  });

  return { map, marker };
}

/**
 * Live Tracking Map with Polyline and Collector Movement Simulator
 */
function initLiveTrackingMap(containerId, request) {
  const container = document.getElementById(containerId);
  if (!container || !request) return null;

  const userLat = request.lat || METRO_CENTER.lat;
  const userLng = request.lng || METRO_CENTER.lng;

  // Find assigned collector or fallback
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const collector = collectors.find(c => c.id === request.assignedCollectorId) || collectors[0];

  // Destination recycling center
  const centers = getData(STORAGE_KEYS.CENTERS, []);
  const center = centers.find(c => c.id === request.recyclingCenterId) || centers[0];

  const map = L.map(containerId).setView([userLat, userLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // 1. User Doorstep Marker (Green House)
  const userIcon = createLeafletIcon('#1E5E3A', 'fa-home', 40);
  const userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
  userMarker.bindPopup(`<strong>Your Doorstep</strong><br>${request.address}`).openPopup();

  // 2. Recycling Destination Marker (Dark Forest Leaf)
  const centerIcon = createLeafletIcon('#0F2D1C', 'fa-recycle', 36);
  const centerMarker = L.marker([center.lat, center.lng], { icon: centerIcon }).addTo(map);
  centerMarker.bindPopup(`<strong>${center.name}</strong><br>Destination Recycling Hub`);

  // 3. Collector Live Marker (Animated Lavender Van)
  const colStartLat = collector ? collector.lat : userLat - 0.02;
  const colStartLng = collector ? collector.lng : userLng - 0.02;
  const colIcon = createLeafletIcon('#8B6CE0', 'fa-truck-moving', 42);
  const collectorMarker = L.marker([colStartLat, colStartLng], { icon: colIcon }).addTo(map);
  collectorMarker.bindPopup(`<strong>${collector ? collector.name : 'Collector'}</strong><br>${collector ? collector.vehicle : 'Eco Van'}`);

  // Route Polyline from Collector -> User -> Recycling Center
  const routePoints = [
    [colStartLat, colStartLng],
    [(colStartLat + userLat) / 2 + 0.003, (colStartLng + userLng) / 2 - 0.002], // Realistic road curve
    [userLat, userLng],
    [center.lat, center.lng]
  ];

  const polyline = L.polyline(routePoints, {
    color: '#1E5E3A',
    weight: 4,
    opacity: 0.8,
    dashArray: '8, 8'
  }).addTo(map);

  map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

  // Return tracking control objects for movement simulation
  return {
    map,
    userMarker,
    collectorMarker,
    centerMarker,
    polyline,
    userCoords: [userLat, userLng],
    collectorCoords: [colStartLat, colStartLng],
    centerCoords: [center.lat, center.lng]
  };
}


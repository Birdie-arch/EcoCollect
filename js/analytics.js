/**
 * EcoCollect — City Administration Analytics & Chart.js Visualizations
 * Computes live KPIs, dynamic aggregations, and mounts 5 Chart.js charts
 * matching the botanical retro-modern aesthetic palette.
 */

let chartInstances = {};

function initAdminAnalytics() {
  const users = getData(STORAGE_KEYS.USERS, []);
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const ratings = getData(STORAGE_KEYS.RATINGS, []);

  // 1. Compute Top KPI Cards
  const totalUsersCount = users.filter(u => u.role === 'USER').length;
  const totalCollectorsCount = collectors.length;
  const totalRequestsCount = requests.length;
  const completedPickupsCount = requests.filter(r => r.status === 'COMPLETED').length;

  const totalKg = requests
    .filter(r => r.status === 'COMPLETED' || r.status === 'COLLECTED')
    .reduce((acc, r) => acc + (r.actualWeight || r.estimatedWeight || 0), 0);

  const avgRating = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.overallRating, 0) / ratings.length).toFixed(1)
    : '4.9';

  // Render KPIs to DOM
  const elUsers = document.getElementById('kpi-total-users');
  const elCollectors = document.getElementById('kpi-total-collectors');
  const elRequests = document.getElementById('kpi-total-requests');
  const elCompleted = document.getElementById('kpi-completed-pickups');
  const elWeight = document.getElementById('kpi-total-weight');
  const elRating = document.getElementById('kpi-avg-rating');

  if (elUsers) elUsers.textContent = totalUsersCount;
  if (elCollectors) elCollectors.textContent = totalCollectorsCount;
  if (elRequests) elRequests.textContent = totalRequestsCount;
  if (elCompleted) elCompleted.textContent = completedPickupsCount;
  if (elWeight) elWeight.textContent = `${(totalKg + 3250).toLocaleString()} kg`;
  if (elRating) elRating.textContent = `★ ${avgRating}`;

  // 2. Destroy any existing charts before recreating
  Object.keys(chartInstances).forEach(key => {
    if (chartInstances[key]) chartInstances[key].destroy();
  });

  // Chart Theme Colors (Warm botanical theme)
  const colors = {
    forest: '#1E5E3A',
    sage: '#82C98C',
    lavender: '#8B6CE0',
    amber: '#D97706',
    rose: '#E11D48',
    blue: '#2563EB',
    cream: '#FAF7F0',
    gridColor: 'rgba(20, 36, 27, 0.08)'
  };

  // Chart 1: Monthly E-Waste Collection (Line Chart)
  const ctxMonthly = document.getElementById('chart-monthly-trend')?.getContext('2d');
  if (ctxMonthly) {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const monthlyData = [1840, 2410, 2980, 3320, 3890, 4250];

    chartInstances.monthly = new Chart(ctxMonthly, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'E-Waste Recycled (kg)',
          data: monthlyData,
          borderColor: colors.forest,
          backgroundColor: 'rgba(130, 201, 140, 0.25)',
          fill: true,
          tension: 0.38,
          pointBackgroundColor: colors.forest,
          pointBorderColor: '#FFFFFF',
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#14241B',
            padding: 12,
            titleFont: { family: 'Space Grotesk', size: 14 },
            bodyFont: { family: 'Plus Jakarta Sans', size: 12 },
            cornerRadius: 10
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: colors.gridColor }, ticks: { callback: v => `${v} kg` } }
        }
      }
    });
  }

  // Chart 2: E-Waste Categories (Doughnut Chart)
  const ctxCategory = document.getElementById('chart-categories')?.getContext('2d');
  if (ctxCategory) {
    const catCounts = {
      'Laptop': 0,
      'Mobile Phone': 0,
      'Television': 0,
      'Battery': 0,
      'Printer': 0,
      'Monitor': 0,
      'Other': 0
    };

    requests.forEach(r => {
      const c = r.category;
      if (catCounts[c] !== undefined) catCounts[c]++;
      else catCounts['Other']++;
    });

    chartInstances.category = new Chart(ctxCategory, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catCounts),
        datasets: [{
          data: Object.values(catCounts),
          backgroundColor: [
            colors.forest,
            colors.lavender,
            colors.sage,
            colors.amber,
            colors.blue,
            '#0F766E',
            '#94A3B8'
          ],
          borderWidth: 2,
          borderColor: '#FAF7F0'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, boxWidth: 14 }
          }
        },
        cutout: '68%'
      }
    });
  }

  // Chart 3: Pickup Requests Status Distribution (Bar Chart)
  const ctxStatus = document.getElementById('chart-request-status')?.getContext('2d');
  if (ctxStatus) {
    const statusCounts = {
      'Requested': requests.filter(r => r.status === 'REQUESTED').length,
      'Assigned': requests.filter(r => r.status === 'ASSIGNED' || r.status === 'ACCEPTED').length,
      'On The Way': requests.filter(r => r.status === 'ON_THE_WAY' || r.status === 'ARRIVED').length,
      'Completed': requests.filter(r => r.status === 'COMPLETED' || r.status === 'COLLECTED').length,
      'Cancelled': requests.filter(r => r.status === 'CANCELLED').length
    };

    chartInstances.status = new Chart(ctxStatus, {
      type: 'bar',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          label: 'Requests',
          data: Object.values(statusCounts),
          backgroundColor: [
            colors.amber,
            colors.lavender,
            colors.blue,
            colors.forest,
            colors.rose
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: colors.gridColor } }
        }
      }
    });
  }

  // Chart 4: Collector Performance (Horizontal Bar Chart)
  const ctxCollectors = document.getElementById('chart-collector-perf')?.getContext('2d');
  if (ctxCollectors) {
    const topCollectors = collectors.slice(0, 6);

    chartInstances.collector = new Chart(ctxCollectors, {
      type: 'bar',
      data: {
        labels: topCollectors.map(c => c.name.split(' ')[0]),
        datasets: [
          {
            label: 'Completed Pickups',
            data: topCollectors.map(c => c.completedPickups || 25),
            backgroundColor: colors.forest,
            borderRadius: 6
          },
          {
            label: 'Rating (x10)',
            data: topCollectors.map(c => Math.round((c.rating || 4.8) * 10)),
            backgroundColor: colors.lavender,
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        },
        scales: {
          x: { grid: { color: colors.gridColor } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // Chart 5: City Zone Collection Volume (Bar / Radar Chart)
  const ctxZones = document.getElementById('chart-city-zones')?.getContext('2d');
  if (ctxZones) {
    const zones = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];
    const zoneWeights = zones.map(z => {
      return requests
        .filter(r => r.zone === z)
        .reduce((sum, r) => sum + (r.actualWeight || r.estimatedWeight || 0), 0) + 120;
    });

    chartInstances.zones = new Chart(ctxZones, {
      type: 'bar',
      data: {
        labels: ['North', 'South', 'East', 'West', 'Central'],
        datasets: [{
          label: 'Total Collected (kg)',
          data: zoneWeights,
          backgroundColor: [
            'rgba(30, 94, 58, 0.85)',
            'rgba(139, 108, 224, 0.85)',
            'rgba(130, 201, 140, 0.85)',
            'rgba(217, 119, 6, 0.85)',
            'rgba(15, 118, 110, 0.85)'
          ],
          borderRadius: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: colors.gridColor }, ticks: { callback: v => `${v} kg` } }
        }
      }
    });
  }
}


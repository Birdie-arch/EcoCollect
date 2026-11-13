/**
 * EcoCollect — Central Storage, Seed Data & State Management
 * Handles localStorage CRUD operations, sample data generation,
 * dynamic metrics, and smart collector assignment algorithm.
 */

const STORAGE_KEYS = {
  USERS: 'ecocollect_users',
  COLLECTORS: 'ecocollect_collectors',
  REQUESTS: 'ecocollect_requests',
  RATINGS: 'ecocollect_ratings',
  NOTIFICATIONS: 'ecocollect_notifications',
  REWARDS: 'ecocollect_rewards',
  CENTERS: 'ecocollect_centers',
  CURRENT_USER: 'ecocollect_currentUser'
};

// Metropolitan Zone Center Point (Bangalore / Metro Silicon City)
const METRO_CENTER = {
  lat: 12.9716,
  lng: 77.5946,
  name: 'Metropolitan City'
};

// Available e-waste categories
const EWASTE_CATEGORIES = [
  'Mobile Phone',
  'Laptop',
  'Desktop',
  'Monitor',
  'Television',
  'Refrigerator',
  'Washing Machine',
  'Printer',
  'Keyboard',
  'Mouse',
  'Battery',
  'Charger',
  'Other'
];

// Eco points value per category & kg
const ECO_POINTS_TABLE = {
  'Mobile Phone': 20,
  'Laptop': 50,
  'Desktop': 45,
  'Monitor': 35,
  'Television': 80,
  'Refrigerator': 120,
  'Washing Machine': 100,
  'Printer': 30,
  'Keyboard': 15,
  'Mouse': 10,
  'Battery': 30,
  'Charger': 10,
  'Other': 15
};

// --- Storage API Helpers ---
function getData(key, defaultValue = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
    return false;
  }
}

function updateData(key, id, updatedFields) {
  const items = getData(key, []);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updatedFields, updatedAt: new Date().toISOString() };
    saveData(key, items);
    return items[index];
  }
  return null;
}

function deleteData(key, id) {
  const items = getData(key, []);
  const filtered = items.filter(item => item.id !== id);
  saveData(key, filtered);
  return filtered;
}

function generateId(prefix = 'EC') {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${year}-${random}`;
}

// --- Session Helpers ---
function getCurrentUser() {
  return getData(STORAGE_KEYS.CURRENT_USER, null);
}

function setCurrentUser(user) {
  saveData(STORAGE_KEYS.CURRENT_USER, user);
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  window.location.href = (window.location.pathname.includes('/user/') || 
                         window.location.pathname.includes('/collector/') || 
                         window.location.pathname.includes('/admin/')) 
                         ? '../login.html' : 'login.html';
}

// --- Distance Calculation (Haversine Formula in km) ---
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback km
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

// --- Smart Collector Assignment Algorithm (Section 7) ---
/**
 * Calculates a collector score based on:
 * - Waste category compatibility (weight: 35)
 * - Proximity / Distance (weight: 25)
 * - Collector Rating (weight: 20)
 * - Workload / Queue (weight: 15)
 * - Availability (AVAILABLE: +10, BUSY: -20, OFFLINE: excluded)
 */
function findBestCollector(category, userLat = METRO_CENTER.lat, userLng = METRO_CENTER.lng) {
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const eligible = collectors.filter(c => c.status !== 'OFFLINE');

  if (eligible.length === 0) {
    // Fallback to first collector if all offline in demo
    return collectors[0] || null;
  }

  let bestCollector = null;
  let highestScore = -Infinity;

  eligible.forEach(collector => {
    // 1. Waste Category Compatibility
    const categorySupported = !collector.supportedCategories || 
      collector.supportedCategories.length === 0 || 
      collector.supportedCategories.includes(category);
    const categoryScore = categorySupported ? 35 : 0;

    // 2. Distance Score (0 to 25 points; closer = higher)
    const dist = calculateDistance(userLat, userLng, collector.lat, collector.lng);
    const distanceScore = Math.max(0, 25 - (dist * 1.5));

    // 3. Rating Score (0 to 20 points)
    const ratingScore = ((collector.rating || 4.5) / 5) * 20;

    // 4. Workload Score (0 to 15 points; lower active workload = higher score)
    const currentWorkload = collector.currentWorkload || 0;
    const workloadScore = Math.max(0, 15 - (currentWorkload * 3));

    // 5. Availability Status Modifier
    let availabilityScore = 0;
    if (collector.status === 'AVAILABLE') availabilityScore = 10;
    else if (collector.status === 'BUSY') availabilityScore = -15;

    const totalScore = categoryScore + distanceScore + ratingScore + workloadScore + availabilityScore;

    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestCollector = {
        ...collector,
        computedDistance: dist,
        estimatedArrivalMinutes: Math.round(dist * 4 + 10), // ~4 mins per km + 10 mins prep
        score: totalScore.toFixed(1)
      };
    }
  });

  return bestCollector;
}

// --- Notifications Helper ---
function addNotification({ userId, role = 'ALL', title, message, type = 'info', link = '#' }) {
  const notifs = getData(STORAGE_KEYS.NOTIFICATIONS, []);
  const newNotif = {
    id: 'NOTIF-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    userId,
    role,
    title,
    message,
    type,
    link,
    read: false,
    createdAt: new Date().toISOString()
  };
  notifs.unshift(newNotif);
  saveData(STORAGE_KEYS.NOTIFICATIONS, notifs);
  return newNotif;
}

// --- Seed Realistic Initial Sample Data (Section 22) ---
function seedInitialData() {
  // If data already exists, don't overwrite
  if (localStorage.getItem(STORAGE_KEYS.USERS) && 
      localStorage.getItem(STORAGE_KEYS.COLLECTORS) && 
      localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
    return;
  }

  console.log('Seeding EcoCollect realistic metropolitan sample data...');

  // 1. Users (Citizens) — 20 users
  const sampleUsers = [
    { id: 'USR-101', name: 'Aarav Sharma', email: 'user@ecocollect.demo', role: 'USER', phone: '+91 98450 12345', address: '42, Green Glen Layout, Bellandur', zone: 'East Zone', ecoPoints: 480, lat: 12.9299, lng: 77.6744 },
    { id: 'USR-102', name: 'Priya Iyer', email: 'priya.i@ecocollect.demo', role: 'USER', phone: '+91 98450 23456', address: '128, 4th Cross, Indiranagar', zone: 'East Zone', ecoPoints: 850, lat: 12.9784, lng: 77.6408 },
    { id: 'USR-103', name: 'Rohan Mehra', email: 'rohan.m@ecocollect.demo', role: 'USER', phone: '+91 98450 34567', address: '77, 8th Main, Koramangala 4th Block', zone: 'South Zone', ecoPoints: 320, lat: 12.9345, lng: 77.6265 },
    { id: 'USR-104', name: 'Ananya Nair', email: 'ananya.n@ecocollect.demo', role: 'USER', phone: '+91 98450 45678', address: '502, Prestige Palms, Whitefield', zone: 'East Zone', ecoPoints: 1240, lat: 12.9698, lng: 77.7499 },
    { id: 'USR-105', name: 'Vikram Joshi', email: 'vikram.j@ecocollect.demo', role: 'USER', phone: '+91 98450 56789', address: '14, Malleshwaram 15th Cross', zone: 'North Zone', ecoPoints: 610, lat: 13.0031, lng: 77.5643 },
    { id: 'USR-106', name: 'Sneha Rao', email: 'sneha.r@ecocollect.demo', role: 'USER', phone: '+91 98450 67890', address: '93, Sadashivanagar Main Rd', zone: 'North Zone', ecoPoints: 190, lat: 13.0089, lng: 77.5804 },
    { id: 'USR-107', name: 'Arjun Das', email: 'arjun.d@ecocollect.demo', role: 'USER', phone: '+91 98450 78901', address: '10, Lavelle Road, Shanthala Nagar', zone: 'Central Zone', ecoPoints: 940, lat: 12.9698, lng: 77.5996 },
    { id: 'USR-108', name: 'Kavita Patel', email: 'kavita.p@ecocollect.demo', role: 'USER', phone: '+91 98450 89012', address: '221, Jayanagar 4th Block', zone: 'South Zone', ecoPoints: 430, lat: 12.9250, lng: 77.5938 },
    { id: 'USR-109', name: 'Deepak Varma', email: 'deepak.v@ecocollect.demo', role: 'USER', phone: '+91 98450 90123', address: '304, Rajajinagar 1st Block', zone: 'West Zone', ecoPoints: 760, lat: 12.9901, lng: 77.5528 },
    { id: 'USR-110', name: 'Meera Nambiar', email: 'meera.n@ecocollect.demo', role: 'USER', phone: '+91 98450 01234', address: '88, HSR Layout Sector 2', zone: 'South Zone', ecoPoints: 1530, lat: 12.9121, lng: 77.6446 },
    { id: 'USR-111', name: 'Kunal Deshmukh', email: 'kunal.d@ecocollect.demo', role: 'USER', phone: '+91 98450 11223', address: '61, Basavanagudi National High School Rd', zone: 'South Zone', ecoPoints: 220, lat: 12.9421, lng: 77.5755 },
    { id: 'USR-112', name: 'Sunita Roy', email: 'sunita.r@ecocollect.demo', role: 'USER', phone: '+91 98450 22334', address: '19, Benson Town Cross', zone: 'North Zone', ecoPoints: 540, lat: 13.0012, lng: 77.6045 },
    { id: 'USR-113', name: 'Tanmay Saxena', email: 'tanmay.s@ecocollect.demo', role: 'USER', phone: '+91 98450 33445', address: '105, Electronic City Phase 1', zone: 'South Zone', ecoPoints: 890, lat: 12.8452, lng: 77.6602 },
    { id: 'USR-114', name: 'Divya Pillai', email: 'divya.p@ecocollect.demo', role: 'USER', phone: '+91 98450 44556', address: '48, Ulsoor Lake Road', zone: 'Central Zone', ecoPoints: 370, lat: 12.9818, lng: 77.6200 },
    { id: 'USR-115', name: 'Farhan Akhtar', email: 'farhan.a@ecocollect.demo', role: 'USER', phone: '+91 98450 55667', address: '72, Frazer Town MM Road', zone: 'North Zone', ecoPoints: 680, lat: 12.9972, lng: 77.6144 },
    { id: 'USR-116', name: 'Pooja Hegde', email: 'pooja.h@ecocollect.demo', role: 'USER', phone: '+91 98450 66778', address: '18, Banashankari 2nd Stage', zone: 'West Zone', ecoPoints: 410, lat: 12.9254, lng: 77.5612 },
    { id: 'USR-117', name: 'Gautam Menon', email: 'gautam.m@ecocollect.demo', role: 'USER', phone: '+91 98450 77889', address: '302, Marathahalli Bridge Rd', zone: 'East Zone', ecoPoints: 1100, lat: 12.9591, lng: 77.6974 },
    { id: 'USR-118', name: 'Neha Chawla', email: 'neha.c@ecocollect.demo', role: 'USER', phone: '+91 98450 88990', address: '9, Cunningham Road', zone: 'Central Zone', ecoPoints: 290, lat: 12.9868, lng: 77.5971 },
    { id: 'USR-119', name: 'Aditya Sen', email: 'aditya.s@ecocollect.demo', role: 'USER', phone: '+91 98450 99001', address: '144, Vijayanagar Club Road', zone: 'West Zone', ecoPoints: 730, lat: 12.9719, lng: 77.5348 },
    { id: 'USR-120', name: 'Admin Authority', email: 'admin@ecocollect.demo', role: 'ADMIN', phone: '+91 80 2297 5000', address: 'EcoCollect City Control Center, MG Road', zone: 'Central Zone', ecoPoints: 9999, lat: 12.9745, lng: 77.6083 }
  ];

  // 2. Collectors — 10 collectors
  const sampleCollectors = [
    {
      id: 'COL-001',
      name: 'Rajesh Kumar',
      email: 'collector@ecocollect.demo',
      phone: '+91 98801 11223',
      vehicle: 'Eco Van (KA-03-EV-1044)',
      rating: 4.9,
      totalRatings: 84,
      status: 'AVAILABLE',
      currentWorkload: 1,
      lat: 12.9716,
      lng: 77.6000,
      zone: 'Central Zone',
      completedPickups: 142,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Desktop', 'Monitor', 'Television', 'Battery', 'Charger', 'Other']
    },
    {
      id: 'COL-002',
      name: 'Mohammad Tariq',
      email: 'tariq.col@ecocollect.demo',
      phone: '+91 98801 22334',
      vehicle: 'Heavy EV Truck (KA-04-EV-2091)',
      rating: 4.8,
      totalRatings: 62,
      status: 'AVAILABLE',
      currentWorkload: 2,
      lat: 12.9352,
      lng: 77.6245,
      zone: 'South Zone',
      completedPickups: 98,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Refrigerator', 'Washing Machine', 'Television', 'Desktop', 'Printer', 'Monitor']
    },
    {
      id: 'COL-003',
      name: 'Suresh Gowda',
      email: 'suresh.col@ecocollect.demo',
      phone: '+91 98801 33445',
      vehicle: 'E-Cargo Bike (KA-01-EB-8821)',
      rating: 4.7,
      totalRatings: 49,
      status: 'AVAILABLE',
      currentWorkload: 0,
      lat: 12.9820,
      lng: 77.6410,
      zone: 'East Zone',
      completedPickups: 74,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Keyboard', 'Mouse', 'Battery', 'Charger']
    },
    {
      id: 'COL-004',
      name: 'Harish Babu',
      email: 'harish.col@ecocollect.demo',
      phone: '+91 98801 44556',
      vehicle: 'Electric Mini Van (KA-02-EV-7712)',
      rating: 4.9,
      totalRatings: 56,
      status: 'BUSY',
      currentWorkload: 3,
      lat: 13.0040,
      lng: 77.5700,
      zone: 'North Zone',
      completedPickups: 110,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Desktop', 'Monitor', 'Printer', 'Battery']
    },
    {
      id: 'COL-005',
      name: 'Karthik Raja',
      email: 'karthik.col@ecocollect.demo',
      phone: '+91 98801 55667',
      vehicle: 'Eco Van (KA-05-EV-9923)',
      rating: 4.6,
      totalRatings: 38,
      status: 'AVAILABLE',
      currentWorkload: 1,
      lat: 12.9690,
      lng: 77.7200,
      zone: 'East Zone',
      completedPickups: 65,
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Television', 'Refrigerator', 'Washing Machine', 'Other']
    },
    {
      id: 'COL-006',
      name: 'Venkatesh Murthy',
      email: 'venkat.col@ecocollect.demo',
      phone: '+91 98801 66778',
      vehicle: 'E-Rickshaw Cargo (KA-41-ER-3390)',
      rating: 4.8,
      totalRatings: 51,
      status: 'AVAILABLE',
      currentWorkload: 0,
      lat: 12.9800,
      lng: 77.5450,
      zone: 'West Zone',
      completedPickups: 82,
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Desktop', 'Keyboard', 'Mouse', 'Printer', 'Battery']
    },
    {
      id: 'COL-007',
      name: 'Manoj Reddy',
      email: 'manoj.col@ecocollect.demo',
      phone: '+91 98801 77889',
      vehicle: 'Heavy EV Truck (KA-51-EV-4411)',
      rating: 4.5,
      totalRatings: 34,
      status: 'BUSY',
      currentWorkload: 2,
      lat: 12.8700,
      lng: 77.6500,
      zone: 'South Zone',
      completedPickups: 49,
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Refrigerator', 'Washing Machine', 'Television', 'Monitor', 'Desktop']
    },
    {
      id: 'COL-008',
      name: 'Dinesh Pillai',
      email: 'dinesh.col@ecocollect.demo',
      phone: '+91 98801 88990',
      vehicle: 'Eco Van (KA-03-EV-5544)',
      rating: 4.7,
      totalRatings: 42,
      status: 'AVAILABLE',
      currentWorkload: 1,
      lat: 13.0200,
      lng: 77.6200,
      zone: 'North Zone',
      completedPickups: 58,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Battery', 'Charger', 'Desktop', 'Printer']
    },
    {
      id: 'COL-009',
      name: 'Amitabh Sen',
      email: 'amitabh.col@ecocollect.demo',
      phone: '+91 98801 99001',
      vehicle: 'Electric Cargo Trike (KA-01-ET-1102)',
      rating: 4.9,
      totalRatings: 28,
      status: 'AVAILABLE',
      currentWorkload: 0,
      lat: 12.9650,
      lng: 77.6050,
      zone: 'Central Zone',
      completedPickups: 39,
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Battery', 'Charger', 'Keyboard', 'Mouse']
    },
    {
      id: 'COL-010',
      name: 'Pradeep Patil',
      email: 'pradeep.col@ecocollect.demo',
      phone: '+91 98801 00112',
      vehicle: 'Eco Van (KA-04-EV-8822)',
      rating: 4.6,
      totalRatings: 25,
      status: 'OFFLINE',
      currentWorkload: 0,
      lat: 12.9500,
      lng: 77.5300,
      zone: 'West Zone',
      completedPickups: 41,
      avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&auto=format&fit=crop&q=80',
      supportedCategories: ['Mobile Phone', 'Laptop', 'Desktop', 'Television', 'Monitor']
    }
  ];

  // 3. Recycling Centers — 10 Centers
  const sampleCenters = [
    {
      id: 'RC-01',
      name: 'Metro EcoRecycle Hub Central',
      address: 'Plot 12, Industrial Area, Peenya 1st Stage',
      zone: 'West Zone',
      lat: 13.0285,
      lng: 77.5186,
      distance: '6.4 km',
      acceptedCategories: ['All Categories', 'Hazardous Batteries', 'Rare Earth Metals'],
      capacityKgPerDay: 5000,
      currentLoadKg: 2840,
      operatingHours: '08:00 AM – 07:00 PM',
      rating: 4.9,
      phone: '+91 80 2839 1001'
    },
    {
      id: 'RC-02',
      name: 'Silicon City E-Stewards Facility',
      address: '24B, EPIP Zone, Whitefield',
      zone: 'East Zone',
      lat: 12.9780,
      lng: 77.7280,
      distance: '14.2 km',
      acceptedCategories: ['Laptops', 'Servers', 'Mobile Phones', 'Batteries'],
      capacityKgPerDay: 4000,
      currentLoadKg: 1950,
      operatingHours: '09:00 AM – 06:00 PM',
      rating: 4.8,
      phone: '+91 80 2841 2002'
    },
    {
      id: 'RC-03',
      name: 'South Metropolis Green Plant',
      address: '88, Bommasandra Industrial Area, Hosur Rd',
      zone: 'South Zone',
      lat: 12.8180,
      lng: 77.6890,
      distance: '18.5 km',
      acceptedCategories: ['Large Appliances', 'Refrigerators', 'Washing Machines', 'Televisions'],
      capacityKgPerDay: 8000,
      currentLoadKg: 4620,
      operatingHours: '08:00 AM – 08:00 PM',
      rating: 4.7,
      phone: '+91 80 2783 3003'
    },
    {
      id: 'RC-04',
      name: 'Urban Green Safe Dismantlers',
      address: '5, Hebbal Outer Ring Road, Near Flyover',
      zone: 'North Zone',
      lat: 13.0358,
      lng: 77.5970,
      distance: '7.8 km',
      acceptedCategories: ['Monitors', 'Printers', 'Desktop PCs', 'Cables'],
      capacityKgPerDay: 3500,
      currentLoadKg: 1420,
      operatingHours: '09:00 AM – 06:30 PM',
      rating: 4.6,
      phone: '+91 80 2362 4004'
    },
    {
      id: 'RC-05',
      name: 'CleanTech Circular Resource Depot',
      address: '17, Old Madras Road, Baiyappanahalli',
      zone: 'East Zone',
      lat: 12.9910,
      lng: 77.6520,
      distance: '8.1 km',
      acceptedCategories: ['Mobile Phones', 'Lithium Batteries', 'Printed Circuit Boards'],
      capacityKgPerDay: 3000,
      currentLoadKg: 2100,
      operatingHours: '08:30 AM – 05:30 PM',
      rating: 4.9,
      phone: '+91 80 2530 5005'
    },
    {
      id: 'RC-06',
      name: 'Apex Zero-Waste Metals Recovery',
      address: '32, Rajajinagar Industrial Town',
      zone: 'West Zone',
      lat: 12.9850,
      lng: 77.5410,
      distance: '5.9 km',
      acceptedCategories: ['Heavy Electronics', 'CRT Displays', 'Copper & Gold Extraction'],
      capacityKgPerDay: 6000,
      currentLoadKg: 3800,
      operatingHours: '08:00 AM – 07:00 PM',
      rating: 4.8,
      phone: '+91 80 2315 6006'
    },
    {
      id: 'RC-07',
      name: 'EcoSmart Battery Recycling Facility',
      address: '74, Koramangala Ring Road',
      zone: 'South Zone',
      lat: 12.9280,
      lng: 77.6320,
      distance: '5.2 km',
      acceptedCategories: ['Li-Ion Batteries', 'Lead Acid', 'UPS Units'],
      capacityKgPerDay: 2500,
      currentLoadKg: 1680,
      operatingHours: '09:00 AM – 06:00 PM',
      rating: 4.9,
      phone: '+91 80 2552 7007'
    },
    {
      id: 'RC-08',
      name: 'North City E-Waste Processing Center',
      address: '109, Yelahanka New Town Industrial Area',
      zone: 'North Zone',
      lat: 13.1010,
      lng: 77.5850,
      distance: '15.6 km',
      acceptedCategories: ['Home Appliances', 'Telecom Gear', 'Medical Electronics'],
      capacityKgPerDay: 4500,
      currentLoadKg: 2200,
      operatingHours: '08:30 AM – 06:00 PM',
      rating: 4.7,
      phone: '+91 80 2856 8008'
    },
    {
      id: 'RC-09',
      name: 'GreenShield Electronic Refurbishers',
      address: '15, Bannerghatta Main Road, Bilekahalli',
      zone: 'South Zone',
      lat: 12.8980,
      lng: 77.6010,
      distance: '9.3 km',
      acceptedCategories: ['Laptops', 'Desktops', 'Tablet PCs', 'Peripherals'],
      capacityKgPerDay: 3000,
      currentLoadKg: 1750,
      operatingHours: '09:00 AM – 07:00 PM',
      rating: 4.8,
      phone: '+91 80 2658 9009'
    },
    {
      id: 'RC-10',
      name: 'Heritage District Eco Depot',
      address: '3, Infantry Road, Shivaji Nagar',
      zone: 'Central Zone',
      lat: 12.9810,
      lng: 77.6010,
      distance: '1.8 km',
      acceptedCategories: ['Small Gadgets', 'Accessories', 'Chargers', 'Batteries'],
      capacityKgPerDay: 2000,
      currentLoadKg: 1100,
      operatingHours: '09:30 AM – 06:30 PM',
      rating: 4.9,
      phone: '+91 80 2286 1010'
    }
  ];

  // 4. Rewards Catalog — 6 rewards
  const sampleRewards = [
    { id: 'REW-01', title: '₹50 Green Groceries Coupon', description: 'Redeem at organic supermarkets and zero-waste stores', pointsRequired: 500, value: '₹50', code: 'ECO50-ORGANIC', category: 'Coupon' },
    { id: 'REW-02', title: '₹100 Renewable Mobility Ride Credit', description: 'Applicable on electric cabs and public metro transit', pointsRequired: 1000, value: '₹100', code: 'METRO-EV100', category: 'Transit' },
    { id: 'REW-03', title: '₹250 Certified Refurbished Gadget Credit', description: 'Get a flat discount on verified refurbished laptops & phones', pointsRequired: 1500, value: '₹250', code: 'REFURB-250', category: 'Electronics' },
    { id: 'REW-04', title: 'EcoCollect Bamboo Desk Tech Kit', description: 'Includes bamboo wireless charging pad and organic cable wrap', pointsRequired: 2000, value: 'Physical Kit', code: 'KIT-BAMBOO-2026', category: 'Merchandise' },
    { id: 'REW-05', title: 'Plant a Native Tree in Your Name', description: 'Geo-tagged tree planted with certificate & lifetime updates', pointsRequired: 800, value: 'Certificate', code: 'TREE-HERITAGE-800', category: 'Environment' },
    { id: 'REW-06', title: '₹500 Metropolitan Clean City Voucher', description: 'Voucher valid for home energy audits and eco appliances', pointsRequired: 3000, value: '₹500', code: 'CLEANCITY-500', category: 'Home' }
  ];

  // 5. Pickup Requests — 52 Requests spanning all 8 statuses
  const statuses = ['REQUESTED', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'COLLECTED', 'COMPLETED', 'CANCELLED'];
  const sampleRequests = [];
  const sampleRatings = [];

  const deviceTypes = [
    { cat: 'Laptop', name: 'Dell Inspiron 15', weight: 2.2, cond: 'Not Working' },
    { cat: 'Mobile Phone', name: 'Redmi Note 9 Pro', weight: 0.22, cond: 'Damaged' },
    { cat: 'Television', name: 'Samsung 42 inch LED', weight: 9.5, cond: 'Partially Working' },
    { cat: 'Battery', name: 'UPS Inverter Battery', weight: 14.0, cond: 'Not Working' },
    { cat: 'Desktop', name: 'HP Pavilion Tower', weight: 6.8, cond: 'Not Working' },
    { cat: 'Monitor', name: 'LG 24 inch LCD Monitor', weight: 3.4, cond: 'Damaged' },
    { cat: 'Refrigerator', name: 'Whirlpool Single Door Fridge', weight: 32.0, cond: 'Not Working' },
    { cat: 'Washing Machine', name: 'IFB Front Load Washer', weight: 45.0, cond: 'Partially Working' },
    { cat: 'Printer', name: 'Canon Pixma Inkjet Printer', weight: 4.1, cond: 'Not Working' },
    { cat: 'Charger', name: 'Bundle of 6 Laptop & Phone Chargers', weight: 0.8, cond: 'Damaged' },
    { cat: 'Keyboard', name: 'Mechanical Keyboards & Mouse Combo', weight: 1.3, cond: 'Partially Working' }
  ];

  const timeSlots = [
    '09:00 AM – 12:00 PM',
    '12:00 PM – 03:00 PM',
    '03:00 PM – 06:00 PM',
    '06:00 PM – 08:00 PM'
  ];

  // Pre-seed first active request specifically for Demo User
  sampleRequests.push({
    id: 'EC-2026-000124',
    userId: 'USR-101',
    userName: 'Aarav Sharma',
    userPhone: '+91 98450 12345',
    category: 'Laptop',
    deviceName: 'Dell Inspiron 15 (Old Core i5)',
    quantity: 1,
    estimatedWeight: 2.3,
    actualWeight: null,
    condition: 'Not Working',
    address: '42, Green Glen Layout, Bellandur',
    area: 'Bellandur',
    city: 'Metropolitan City',
    pincode: '560103',
    zone: 'East Zone',
    lat: 12.9299,
    lng: 77.6744,
    pickupDate: '2026-11-12',
    timeSlot: '09:00 AM – 12:00 PM',
    status: 'ON_THE_WAY',
    assignedCollectorId: 'COL-001',
    collectorName: 'Rajesh Kumar',
    collectorPhone: '+91 98801 11223',
    collectorVehicle: 'Eco Van (KA-03-EV-1044)',
    collectorRating: 4.9,
    estimatedArrivalMinutes: 12,
    recyclingCenterId: 'RC-05',
    ecoPointsAwarded: 50,
    proofImageUrl: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Please buzz gate security code 421.'
  });

  // Second active request for Demo Collector
  sampleRequests.push({
    id: 'EC-2026-000125',
    userId: 'USR-102',
    userName: 'Priya Iyer',
    userPhone: '+91 98450 23456',
    category: 'Television',
    deviceName: 'Sony Bravia 40" LCD',
    quantity: 1,
    estimatedWeight: 11.0,
    actualWeight: null,
    condition: 'Partially Working',
    address: '128, 4th Cross, Indiranagar',
    area: 'Indiranagar',
    city: 'Metropolitan City',
    pincode: '560038',
    zone: 'East Zone',
    lat: 12.9784,
    lng: 77.6408,
    pickupDate: '2026-11-12',
    timeSlot: '12:00 PM – 03:00 PM',
    status: 'ASSIGNED',
    assignedCollectorId: 'COL-001',
    collectorName: 'Rajesh Kumar',
    collectorPhone: '+91 98801 11223',
    collectorVehicle: 'Eco Van (KA-03-EV-1044)',
    collectorRating: 4.9,
    estimatedArrivalMinutes: 25,
    recyclingCenterId: 'RC-05',
    ecoPointsAwarded: 80,
    proofImageUrl: null,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'Lift is operational.'
  });

  // Generate 50 realistic historical & in-progress requests
  for (let i = 1; i <= 50; i++) {
    const user = sampleUsers[i % (sampleUsers.length - 1)]; // skip admin
    const dev = deviceTypes[i % deviceTypes.length];
    const collector = sampleCollectors[i % sampleCollectors.length];
    const center = sampleCenters[i % sampleCenters.length];
    const status = statuses[i % statuses.length];
    const reqId = `EC-2026-${String(1000 + i).padStart(6, '0')}`;
    const daysAgo = Math.floor(i / 2);
    const dateObj = new Date(Date.now() - daysAgo * 86400000);
    const dateStr = dateObj.toISOString().split('T')[0];
    const points = (ECO_POINTS_TABLE[dev.cat] || 20) * (dev.weight > 5 ? 2 : 1);

    const actualWeight = (status === 'COLLECTED' || status === 'COMPLETED') ? (dev.weight * (0.9 + Math.random() * 0.2)).toFixed(1) : null;

    sampleRequests.push({
      id: reqId,
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      category: dev.cat,
      deviceName: dev.name,
      quantity: (i % 3) + 1,
      estimatedWeight: dev.weight,
      actualWeight: actualWeight ? parseFloat(actualWeight) : null,
      condition: dev.cond,
      address: user.address,
      area: user.address.split(',')[1] ? user.address.split(',')[1].trim() : 'Central',
      city: 'Metropolitan City',
      pincode: '5600' + String(10 + (i % 80)),
      zone: user.zone,
      lat: user.lat + (Math.random() - 0.5) * 0.01,
      lng: user.lng + (Math.random() - 0.5) * 0.01,
      pickupDate: dateStr,
      timeSlot: timeSlots[i % timeSlots.length],
      status: status,
      assignedCollectorId: status === 'REQUESTED' ? null : collector.id,
      collectorName: status === 'REQUESTED' ? null : collector.name,
      collectorPhone: status === 'REQUESTED' ? null : collector.phone,
      collectorVehicle: status === 'REQUESTED' ? null : collector.vehicle,
      collectorRating: status === 'REQUESTED' ? null : collector.rating,
      estimatedArrivalMinutes: Math.floor(10 + Math.random() * 30),
      recyclingCenterId: center.id,
      ecoPointsAwarded: points,
      proofImageUrl: (status === 'COLLECTED' || status === 'COMPLETED') ? 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=300&auto=format&fit=crop&q=80' : null,
      createdAt: dateObj.toISOString(),
      notes: 'Please call before arrival.'
    });

    // Generate ratings for completed pickups (32 ratings)
    if (status === 'COMPLETED' && sampleRatings.length < 32) {
      sampleRatings.push({
        id: 'RAT-' + (2000 + i),
        requestId: reqId,
        userId: user.id,
        userName: user.name,
        collectorId: collector.id,
        collectorName: collector.name,
        overallRating: (i % 5 === 0) ? 4 : 5,
        punctuality: (i % 4 === 0) ? 4 : 5,
        professionalism: 5,
        communication: 5,
        process: (i % 3 === 0) ? 4 : 5,
        comment: (i % 2 === 0) 
          ? 'Collector arrived promptly with a digital scale and eco transport. Very professional handling!'
          : 'Extremely polite, explained the circular recycling path and credited points immediately.',
        createdAt: dateObj.toISOString(),
        // Two-way rating: collector rating the user
        collectorReviewOfUser: {
          readiness: 5,
          communication: 5,
          cooperation: 5,
          comment: 'User had electronic devices packaged safely at the doorstep. Seamless collection!'
        }
      });
    }
  }

  // 6. Pre-seed notifications
  const sampleNotifications = [
    {
      id: 'NOTIF-01',
      userId: 'USR-101',
      role: 'USER',
      title: 'Collector On The Way',
      message: 'Rajesh Kumar is heading to your address with Eco Van KA-03-EV-1044.',
      type: 'info',
      link: 'tracking.html?id=EC-2026-000124',
      read: false,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 'NOTIF-02',
      userId: 'USR-101',
      role: 'USER',
      title: '50 Eco Points Earned',
      message: 'Your recent pickup request for Laptop was verified successfully.',
      type: 'success',
      link: 'rewards.html',
      read: false,
      createdAt: new Date(Date.now() - 180 * 60000).toISOString()
    },
    {
      id: 'NOTIF-03',
      userId: 'COL-001',
      role: 'COLLECTOR',
      title: 'New Pickup Assigned',
      message: 'Assigned request EC-2026-000125 from Priya Iyer in Indiranagar.',
      type: 'info',
      link: 'pickup.html?id=EC-2026-000125',
      read: false,
      createdAt: new Date(Date.now() - 30 * 60000).toISOString()
    },
    {
      id: 'NOTIF-04',
      userId: 'USR-120',
      role: 'ADMIN',
      title: 'Monthly Goal Exceeded',
      message: 'Metropolitan e-waste collection reached 4,250 kg this month across 5 city zones.',
      type: 'success',
      link: 'analytics.html',
      read: false,
      createdAt: new Date(Date.now() - 720 * 60000).toISOString()
    }
  ];

  // Persist all initial city infrastructure data
  saveData(STORAGE_KEYS.USERS, sampleUsers);
  saveData(STORAGE_KEYS.COLLECTORS, sampleCollectors);
  saveData(STORAGE_KEYS.CENTERS, sampleCenters);
  saveData(STORAGE_KEYS.REWARDS, sampleRewards);
  saveData(STORAGE_KEYS.REQUESTS, sampleRequests);
  saveData(STORAGE_KEYS.RATINGS, sampleRatings);
  saveData(STORAGE_KEYS.NOTIFICATIONS, sampleNotifications);

  // Note: We DO NOT auto-log in any user so the user can freshly register or sign in.

  console.log('EcoCollect city data initialized cleanly.');
}

// Auto-seed on initial load
seedInitialData();


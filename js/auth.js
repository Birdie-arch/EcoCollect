/**
 * EcoCollect — Authentication & Role Guard System
 * Handles real user registration, login, role validation,
 * session persistence in localStorage, and navigation state.
 */

// Preset demo accounts available for convenience if desired
const DEMO_CREDENTIALS = {
  USER: {
    email: 'user@ecocollect.demo',
    password: 'demo123',
    role: 'USER',
    target: 'user/dashboard.html'
  },
  COLLECTOR: {
    email: 'collector@ecocollect.demo',
    password: 'demo123',
    role: 'COLLECTOR',
    target: 'collector/dashboard.html'
  },
  ADMIN: {
    email: 'admin@ecocollect.demo',
    password: 'demo123',
    role: 'ADMIN',
    target: 'admin/dashboard.html'
  }
};

/**
 * Perform login authentication
 */
function login(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Please enter both your email address and password.' };
  }

  email = email.trim().toLowerCase();
  
  // 1. Check in stored users list
  const users = getData(STORAGE_KEYS.USERS, []);
  const foundUser = users.find(u => u.email && u.email.toLowerCase() === email);

  if (foundUser) {
    // Validate password (supports both set password and legacy demo123 for pre-seeded records)
    if (foundUser.password === password || (foundUser.password === undefined && password === 'demo123')) {
      setCurrentUser(foundUser);
      let redirectUrl = 'user/dashboard.html';
      if (foundUser.role === 'COLLECTOR') redirectUrl = 'collector/dashboard.html';
      else if (foundUser.role === 'ADMIN') redirectUrl = 'admin/dashboard.html';
      return { success: true, redirect: getRelativePath(redirectUrl), user: foundUser };
    } else {
      return { success: false, error: 'Incorrect password. Please check your password and try again.' };
    }
  }

  // 2. Check predefined demo credentials if not yet in stored users
  if (email === DEMO_CREDENTIALS.USER.email && password === DEMO_CREDENTIALS.USER.password) {
    const defaultUser = {
      id: 'USR-101',
      name: 'Aarav Sharma',
      email: email,
      password: password,
      role: 'USER',
      ecoPoints: 480
    };
    setCurrentUser(defaultUser);
    return { success: true, redirect: getRelativePath('user/dashboard.html'), user: defaultUser };
  }

  if (email === DEMO_CREDENTIALS.COLLECTOR.email && password === DEMO_CREDENTIALS.COLLECTOR.password) {
    const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
    const defaultCol = collectors[0] || {
      id: 'COL-001',
      name: 'Rajesh Kumar',
      email: email,
      role: 'COLLECTOR',
      vehicle: 'Eco Van (KA-03-EV-1044)'
    };
    setCurrentUser(defaultCol);
    return { success: true, redirect: getRelativePath('collector/dashboard.html'), user: defaultCol };
  }

  if (email === DEMO_CREDENTIALS.ADMIN.email && password === DEMO_CREDENTIALS.ADMIN.password) {
    const defaultAdmin = {
      id: 'ADM-001',
      name: 'City Admin Authority',
      email: email,
      password: password,
      role: 'ADMIN'
    };
    setCurrentUser(defaultAdmin);
    return { success: true, redirect: getRelativePath('admin/dashboard.html'), user: defaultAdmin };
  }

  return { 
    success: false, 
    error: 'No account registered with this email address. Please click "Create an Account" to register.' 
  };
}

/**
 * Register a new User, Collector, or Admin
 */
function register(userData) {
  if (!userData.email || !userData.name || !userData.password) {
    return { success: false, error: 'Please provide full name, email address, and a secure password.' };
  }

  const users = getData(STORAGE_KEYS.USERS, []);
  const emailExists = users.some(u => u.email && u.email.toLowerCase() === userData.email.trim().toLowerCase());

  if (emailExists) {
    return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
  }

  const role = userData.role || 'USER';
  let prefix = 'USR';
  if (role === 'COLLECTOR') prefix = 'COL';
  else if (role === 'ADMIN') prefix = 'ADM';

  const newId = `${prefix}-${Date.now().toString().slice(-4)}`;
  const newUser = {
    id: newId,
    name: userData.name.trim(),
    email: userData.email.trim().toLowerCase(),
    password: userData.password,
    role: role,
    phone: userData.phone ? userData.phone.trim() : '+91 98450 00000',
    address: userData.address ? userData.address.trim() : 'Metropolitan City',
    zone: userData.zone || 'Central Zone',
    ecoPoints: role === 'USER' ? 100 : 0, // 100 welcome bonus points for new citizens
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveData(STORAGE_KEYS.USERS, users);

  // If registering as collector, also register in active fleet registry
  if (role === 'COLLECTOR') {
    const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
    collectors.push({
      id: newId,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      vehicle: userData.vehicle ? userData.vehicle.trim() : 'Electric Eco Van',
      rating: 5.0,
      totalRatings: 0,
      status: 'AVAILABLE',
      currentWorkload: 0,
      lat: METRO_CENTER.lat + (Math.random() - 0.5) * 0.02,
      lng: METRO_CENTER.lng + (Math.random() - 0.5) * 0.02,
      zone: newUser.zone,
      completedPickups: 0,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      supportedCategories: EWASTE_CATEGORIES
    });
    saveData(STORAGE_KEYS.COLLECTORS, collectors);
  }

  // Set session
  setCurrentUser(newUser);

  let redirectUrl = 'user/dashboard.html';
  if (role === 'COLLECTOR') redirectUrl = 'collector/dashboard.html';
  else if (role === 'ADMIN') redirectUrl = 'admin/dashboard.html';

  return { success: true, redirect: getRelativePath(redirectUrl), user: newUser };
}

/**
 * Role Route Guard
 * Checks whether user is logged in and belongs to required role
 */
function requireRole(allowedRoles = ['USER']) {
  const user = getCurrentUser();
  if (!user) {
    // Unauthenticated -> redirect to login
    window.location.href = getRelativePath('login.html');
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    // Admin has universal inspection rights
    if (user.role === 'ADMIN') return user;

    alert(`Access restricted to ${allowedRoles.join(' / ')}. Redirecting to your dashboard.`);
    if (user.role === 'COLLECTOR') {
      window.location.href = getRelativePath('collector/dashboard.html');
    } else {
      window.location.href = getRelativePath('user/dashboard.html');
    }
    return null;
  }

  return user;
}

/**
 * Helper to compute correct relative path regardless of nested folder
 */
function getRelativePath(targetPath) {
  const currentPath = window.location.pathname.replace(/\\/g, '/');
  const isSubfolder = currentPath.includes('/user/') || 
                      currentPath.includes('/collector/') || 
                      currentPath.includes('/admin/');
  
  if (isSubfolder) {
    if (targetPath.startsWith('user/') || targetPath.startsWith('collector/') || targetPath.startsWith('admin/')) {
      return '../' + targetPath;
    }
    return '../' + targetPath;
  } else {
    return targetPath;
  }
}

/**
 * Dynamically updates navbar actions on landing page and public screens
 * Displays "Dashboard" + "Sign Out" if logged in, or "Sign In" + "Register" if guest
 */
function updateNavbarAuth() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const user = getCurrentUser();
  if (user) {
    let dashboardLink = 'user/dashboard.html';
    if (user.role === 'COLLECTOR') dashboardLink = 'collector/dashboard.html';
    else if (user.role === 'ADMIN') dashboardLink = 'admin/dashboard.html';

    navActions.innerHTML = `
      <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
        Hi, <strong>${user.name.split(' ')[0]}</strong> (${user.role})
      </span>
      <a href="${getRelativePath(dashboardLink)}" class="btn btn-primary btn-sm">
        <i class="fas fa-th-large"></i> Go to Dashboard
      </a>
      <button class="btn btn-secondary btn-sm" onclick="logout()">
        <i class="fas fa-sign-out-alt"></i> Sign Out
      </button>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavbarAuth();
});

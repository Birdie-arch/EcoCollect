/**
 * EcoCollect — Two-Way Rating & Feedback Engine
 * Handles Citizen -> Collector rating (Overall + 4 individual criteria + feedback)
 * and Collector -> Citizen rating (Readiness, Communication, Cooperation).
 * Automatically updates collector's overall dynamic average score.
 */

let activeRatingRequestId = null;
let currentRatingRequest = null;

// Rating form state
const citizenRatingState = {
  overall: 5,
  punctuality: 5,
  professionalism: 5,
  communication: 5,
  process: 5,
  comment: ''
};

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['USER', 'ADMIN', 'COLLECTOR']);
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  activeRatingRequestId = urlParams.get('id');

  const requests = getData(STORAGE_KEYS.REQUESTS, []);

  // Find request
  if (activeRatingRequestId) {
    currentRatingRequest = requests.find(r => r.id === activeRatingRequestId);
  } else {
    // Pick the most recent completed request
    currentRatingRequest = requests.find(r => r.status === 'COMPLETED' && r.userId === user.id) || 
                           requests.find(r => r.status === 'COMPLETED') || 
                           requests[0];
  }

  if (currentRatingRequest) {
    renderRatingDetails(currentRatingRequest);
  }

  initStarWidgets();
});

function renderRatingDetails(req) {
  document.getElementById('rating-req-id').textContent = req.id;
  document.getElementById('rating-device-name').textContent = `${req.deviceName} (${req.category})`;
  document.getElementById('rating-collector-name').textContent = req.collectorName || 'Rajesh Kumar';
  document.getElementById('rating-collector-vehicle').textContent = req.collectorVehicle || 'Eco Fleet';
  document.getElementById('rating-collector-rating').textContent = req.collectorRating ? `★ ${req.collectorRating} / 5.0` : '★ 4.9';
}

function initStarWidgets() {
  document.querySelectorAll('.star-rating').forEach(widget => {
    const field = widget.getAttribute('data-field');
    const stars = widget.querySelectorAll('.star');

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.getAttribute('data-val'));
        if (field === 'overall') citizenRatingState.overall = value;
        else if (field === 'punctuality') citizenRatingState.punctuality = value;
        else if (field === 'professionalism') citizenRatingState.professionalism = value;
        else if (field === 'communication') citizenRatingState.communication = value;
        else if (field === 'process') citizenRatingState.process = value;

        updateStarDisplay(widget, value);
      });

      star.addEventListener('mouseenter', () => {
        const val = parseInt(star.getAttribute('data-val'));
        highlightStars(widget, val);
      });

      widget.addEventListener('mouseleave', () => {
        const currentVal = citizenRatingState[field] || 5;
        highlightStars(widget, currentVal);
      });
    });

    // Default to 5 stars
    updateStarDisplay(widget, 5);
  });
}

function highlightStars(widget, count) {
  widget.querySelectorAll('.star').forEach(s => {
    const val = parseInt(s.getAttribute('data-val'));
    s.classList.toggle('hovered', val <= count);
  });
}

function updateStarDisplay(widget, count) {
  widget.querySelectorAll('.star').forEach(s => {
    const val = parseInt(s.getAttribute('data-val'));
    s.classList.toggle('filled', val <= count);
    s.classList.remove('hovered');
  });
}

/**
 * Submit User Rating for Collector
 */
function submitCollectorRating() {
  const user = getCurrentUser();
  if (!user || !currentRatingRequest) return;

  const commentInput = document.getElementById('rating-comment-input');
  citizenRatingState.comment = commentInput ? commentInput.value.trim() : '';

  if (!citizenRatingState.comment) {
    citizenRatingState.comment = 'Excellent doorstep collection service. Very punctual and respectful!';
  }

  // 1. Create Rating Record
  const ratings = getData(STORAGE_KEYS.RATINGS, []);
  const newRating = {
    id: 'RAT-' + Date.now().toString().slice(-4),
    requestId: currentRatingRequest.id,
    userId: user.id,
    userName: user.name,
    collectorId: currentRatingRequest.assignedCollectorId,
    collectorName: currentRatingRequest.collectorName || 'Assigned Collector',
    overallRating: citizenRatingState.overall,
    punctuality: citizenRatingState.punctuality,
    professionalism: citizenRatingState.professionalism,
    communication: citizenRatingState.communication,
    process: citizenRatingState.process,
    comment: citizenRatingState.comment,
    createdAt: new Date().toISOString()
  };

  ratings.unshift(newRating);
  saveData(STORAGE_KEYS.RATINGS, ratings);

  // 2. Dynamically Recalculate Collector's Overall Rating
  recalculateCollectorRating(currentRatingRequest.assignedCollectorId, citizenRatingState.overall);

  // 3. Mark request as rated
  updateData(STORAGE_KEYS.REQUESTS, currentRatingRequest.id, { isRated: true });

  // 4. Notify Collector
  addNotification({
    userId: currentRatingRequest.assignedCollectorId,
    role: 'COLLECTOR',
    title: 'New ★ 5-Star Customer Review',
    message: `${user.name} rated your collection: "${citizenRatingState.comment.slice(0, 60)}..."`,
    type: 'success',
    link: '../collector/dashboard.html'
  });

  showToast('Thank You!', 'Your rating & environmental feedback have been recorded.', 'success');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1200);
}

/**
 * Recalculate collector average rating in storage
 */
function recalculateCollectorRating(collectorId, newScore) {
  if (!collectorId) return;
  const collectors = getData(STORAGE_KEYS.COLLECTORS, []);
  const idx = collectors.findIndex(c => c.id === collectorId);
  if (idx !== -1) {
    const col = collectors[idx];
    const prevCount = col.totalRatings || 40;
    const prevRating = col.rating || 4.8;
    const newCount = prevCount + 1;
    const updatedRating = parseFloat(((prevRating * prevCount + newScore) / newCount).toFixed(2));

    col.rating = updatedRating;
    col.totalRatings = newCount;
    saveData(STORAGE_KEYS.COLLECTORS, collectors);
  }
}


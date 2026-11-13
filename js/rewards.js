/**
 * EcoCollect — Eco Points & Rewards Engine
 * Calculates environmental footprint savings (CO2 offset, trees saved, toxic landfill diverted),
 * renders points catalog, and handles instant voucher redemptions.
 */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireRole(['USER', 'ADMIN', 'COLLECTOR']);
  if (!user) return;

  renderUserEcoStats(user);
  renderRewardsCatalog();
  renderRedemptionHistory();
});

function renderUserEcoStats(user) {
  // Calculate user's total completed recycled e-waste
  const requests = getData(STORAGE_KEYS.REQUESTS, []);
  const userCompleted = requests.filter(r => r.userId === user.id && (r.status === 'COMPLETED' || r.status === 'COLLECTED'));

  let totalKg = userCompleted.reduce((acc, r) => acc + (r.actualWeight || r.estimatedWeight || 0), 0);
  const points = user.ecoPoints !== undefined ? user.ecoPoints : 100;

  // Environmental Footprint Algorithms
  // 1 kg e-waste diverted ≈ 1.44 kg CO2 emissions prevented
  const co2Saved = (totalKg * 1.44).toFixed(1);
  // 1 tree absorbs ~22 kg CO2 per year
  const treesEquiv = (co2Saved / 22).toFixed(1);
  // Toxic lead/mercury diverted ~ 0.08 kg per kg e-waste
  const toxicDiverted = (totalKg * 0.08).toFixed(2);

  document.getElementById('eco-balance-display').textContent = points;
  document.getElementById('stat-recycled-kg').textContent = `${totalKg} kg`;
  document.getElementById('stat-co2-saved').textContent = `${co2Saved} kg`;
  document.getElementById('stat-trees-equiv').textContent = treesEquiv;
  document.getElementById('stat-toxic-diverted').textContent = `${toxicDiverted} kg`;
}

function renderRewardsCatalog() {
  const container = document.getElementById('rewards-grid');
  if (!container) return;

  const rewards = getData(STORAGE_KEYS.REWARDS, []);
  const user = getCurrentUser();
  const currentPoints = user ? (user.ecoPoints || 0) : 0;

  container.innerHTML = rewards.map(r => {
    const canAfford = currentPoints >= r.pointsRequired;
    return `
      <div class="card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
            <span class="badge badge-lavender">${r.category}</span>
            <strong style="color: var(--color-primary); font-family: var(--font-display); font-size: 1.15rem;">
              ${r.pointsRequired} pts
            </strong>
          </div>
          <h4 style="font-size: 1.1rem; margin-bottom: 0.4rem;">${r.title}</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">${r.description}</p>
        </div>
        <div>
          <div style="background: var(--bg-surface-tint); padding: 0.5rem 0.85rem; border-radius: var(--radius-md); font-size: 0.8rem; margin-bottom: 1rem; display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Reward Value:</span>
            <strong>${r.value}</strong>
          </div>
          <button 
            class="btn ${canAfford ? 'btn-lavender' : 'btn-secondary'} btn-block btn-sm" 
            ${canAfford ? '' : 'disabled'}
            onclick="claimReward('${r.id}')"
          >
            ${canAfford ? '<i class="fas fa-gift"></i> Redeem Reward' : `<i class="fas fa-lock"></i> Needs ${r.pointsRequired - currentPoints} more pts`}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function claimReward(rewardId) {
  const user = getCurrentUser();
  if (!user) return;

  const rewards = getData(STORAGE_KEYS.REWARDS, []);
  const reward = rewards.find(r => r.id === rewardId);

  if (!reward) return;

  if ((user.ecoPoints || 0) < reward.pointsRequired) {
    showToast('Insufficient Points', `You need ${reward.pointsRequired} Eco Points for this reward.`, 'warning');
    return;
  }

  // Deduct points
  user.ecoPoints -= reward.pointsRequired;
  setCurrentUser(user);
  updateData(STORAGE_KEYS.USERS, user.id, { ecoPoints: user.ecoPoints });

  // Record Redemption
  const redemptions = getData('ecocollect_redemptions', []);
  const promoCode = `${reward.code}-${Math.floor(1000 + Math.random() * 9000)}`;
  const record = {
    id: 'RDM-' + Date.now().toString().slice(-4),
    userId: user.id,
    rewardId: reward.id,
    title: reward.title,
    pointsDeducted: reward.pointsRequired,
    code: promoCode,
    redeemedAt: new Date().toISOString()
  };
  redemptions.unshift(record);
  saveData('ecocollect_redemptions', redemptions);

  // Show Reward Modal
  document.getElementById('claimed-reward-title').textContent = reward.title;
  document.getElementById('claimed-voucher-code').textContent = promoCode;
  document.getElementById('claimed-points-left').textContent = `${user.ecoPoints} points remaining`;

  openModal('reward-claim-modal');

  // Refresh UI
  renderUserEcoStats(user);
  renderRewardsCatalog();
  renderRedemptionHistory();

  showToast('Reward Claimed!', `Successfully claimed ${reward.title}. Enjoy your eco perk!`, 'success');
}

function renderRedemptionHistory() {
  const container = document.getElementById('redemption-history-list');
  if (!container) return;

  const user = getCurrentUser();
  const redemptions = getData('ecocollect_redemptions', []).filter(r => r.userId === user?.id);

  if (redemptions.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No rewards redeemed yet. Schedule pickups to earn points!</td></tr>`;
    return;
  }

  container.innerHTML = redemptions.map(r => `
    <tr>
      <td><strong>${r.title}</strong></td>
      <td><span class="badge badge-lavender" style="font-family: monospace; font-size: 0.85rem;">${r.code}</span></td>
      <td><strong style="color: var(--color-rose); font-size: 0.85rem;">-${r.pointsDeducted} pts</strong></td>
      <td style="color: var(--text-muted); font-size: 0.85rem;">${new Date(r.redeemedAt).toLocaleDateString()}</td>
    </tr>
  `).join('');
}

function copyVoucherCode() {
  const code = document.getElementById('claimed-voucher-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Copied!', 'Promo voucher code copied to clipboard', 'info');
  });
}


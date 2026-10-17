/**
 * SJbs.AI - Global Navigation & Dynamic Location Switcher
 */

let activeLocationId = null;
let activeLocationName = '';
let userLocations = [];

// Ensure click handlers bind properly when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalClickHandlers();
});

function setupGlobalClickHandlers() {
  // Close dropdowns if clicked outside
  window.addEventListener('click', (e) => {
    if (!e.target.closest('#locationDropdownMenu') && !e.target.closest('button[onclick*="locationDropdownMenu"]')) {
      const locMenu = document.getElementById('locationDropdownMenu');
      if (locMenu) locMenu.classList.add('hidden');
    }
    if (!e.target.closest('#desktopDropdown') && !e.target.closest('button[onclick*="desktopDropdown"]')) {
      const desktopDrop = document.getElementById('desktopDropdown');
      if (desktopDrop) desktopDrop.classList.add('hidden');
    }
    if (!e.target.closest('#mobileDropdown') && !e.target.closest('button[onclick*="mobileDropdown"]')) {
      const mobileDrop = document.getElementById('mobileDropdown');
      if (mobileDrop) mobileDrop.classList.add('hidden');
    }
  });
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('mobileBackdrop');
  if (sidebar) sidebar.classList.toggle('-translate-x-full');
  if (backdrop) backdrop.classList.toggle('hidden');
}

function toggleDropdown(id) {
  const dropdown = document.getElementById(id);
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Fetch Live Google Locations for the Logged-in User
async function loadUserLocations(callback) {
  const currentUserId = localStorage.getItem('userId');
  if (!currentUserId) return;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/api/locations`, {
      headers: { 'Authorization': currentUserId }
    });
    const data = await res.json();
    userLocations = data.locations || [];

    renderLocationDropdown(callback);

    if (userLocations.length > 0) {
      selectLocation(userLocations[0].locationId, callback);
    } else {
      updateLocationTriggerUI('All locations', 'No registered locations found', 'free');
    }
  } catch (err) {
    console.error('Error loading locations from Google API:', err);
  }
}

// Render ProsperQR Dropdown Cards Dynamically
function renderLocationDropdown(callback) {
  const dropdownMenu = document.getElementById('locationDropdownMenu');
  if (!dropdownMenu) return;

  let html = `
    <div class="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Locations</div>
    
    <button type="button" onclick="selectLocation('all')" class="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
      <span>All locations</span>
      <i id="check_all" class="fa-solid fa-check text-blue-600 text-xs hidden"></i>
    </button>
  `;

  userLocations.forEach(loc => {
    const ratingText = loc.rating ? `★ ${loc.rating.toFixed(1)} (${loc.reviewCount || 0})` : '';
    const addressText = loc.address ? `<span class="text-slate-400 font-normal"> ${loc.address}</span>` : '';

    html += `
      <button type="button" onclick="selectLocation('${loc.locationId}')" class="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 flex items-center justify-between text-xs">
        <div>
          <div class="font-bold text-slate-900">${loc.locationName}</div>
          <div class="text-[11px] text-amber-500 font-medium mt-0.5">${ratingText} ${addressText}</div>
        </div>
        <i id="check_${loc.locationId}" class="fa-solid fa-check text-blue-600 text-xs hidden"></i>
      </button>
    `;
  });

  dropdownMenu.innerHTML = html;
}

// Handle Location Selection Dynamically
function selectLocation(locId, callback) {
  activeLocationId = locId;

  const checkmarks = document.querySelectorAll('#locationDropdownMenu i.fa-check');
  checkmarks.forEach(icon => icon.classList.add('hidden'));

  const activeCheck = document.getElementById(`check_${locId}`);
  if (activeCheck) activeCheck.classList.remove('hidden');

  let currentSubscriptionStatus = 'free';

  if (locId === 'all') {
    activeLocationName = 'All locations';
    updateLocationTriggerUI('All locations', `Showing all ${userLocations.length} locations`, 'free');
  } else {
    const selectedLoc = userLocations.find(l => l.locationId === locId);
    if (selectedLoc) {
      activeLocationName = selectedLoc.locationName;
      currentSubscriptionStatus = selectedLoc.subscriptionStatus || 'free';
      const subtext = selectedLoc.rating 
        ? `★ ${selectedLoc.rating.toFixed(1)} (${selectedLoc.reviewCount || 0})` 
        : 'Google Verified Branch';
      updateLocationTriggerUI(selectedLoc.locationName, subtext, currentSubscriptionStatus);
    }
  }

  const activePostName = document.getElementById('activePostBusinessName');
  if (activePostName) activePostName.innerText = activeLocationName;

  const locMenu = document.getElementById('locationDropdownMenu');
  if (locMenu) locMenu.classList.add('hidden');

  // Trigger page data reload with subscription context
  if (typeof callback === 'function') {
    callback(locId, currentSubscriptionStatus);
  }
}

function updateLocationTriggerUI(title, ratingSubtext, status) {
  const titleElem = document.getElementById('selectedLocTitle');
  const ratingElem = document.getElementById('selectedLocRating');
  const upgradeBtn = document.getElementById('desktopUpgradeBtn');
  const mobileUpgradeBtn = document.getElementById('mobileUpgradeBtn');

  if (titleElem) titleElem.innerText = title;
  if (ratingElem) ratingElem.innerHTML = ratingSubtext;

  if (status === 'pro') {
    if (upgradeBtn) { upgradeBtn.innerText = 'Pro Active'; upgradeBtn.className = 'bg-emerald-50 text-emerald-700 text-xs px-4 py-2 rounded-full font-bold border border-emerald-200'; }
    if (mobileUpgradeBtn) { mobileUpgradeBtn.innerText = 'Pro Active'; mobileUpgradeBtn.className = 'bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-bold'; }
  } else {
    if (upgradeBtn) { upgradeBtn.innerText = 'Upgrade plan'; upgradeBtn.className = 'btn-blue text-xs px-4 py-2 rounded-full font-medium shadow-sm'; }
    if (mobileUpgradeBtn) { mobileUpgradeBtn.innerText = 'Upgrade plan'; mobileUpgradeBtn.className = 'btn-blue text-xs px-3 py-1.5 rounded-full'; }
  }
}
